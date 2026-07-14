#!/usr/bin/env node
'use strict';

/**
 * generate.js — deterministic assembly of a new Angular project from base/ + bundles/.
 *
 * This script does NOT use AI. Given the same flags, it produces the same output every
 * time. A Claude Code skill is expected to sit in front of this and handle the
 * conversational Q&A, then call this script with plain flags — see CONTEXT.md §2 for
 * why that split exists.
 *
 * Usage:
 *   node generate.js \
 *     --project-name=my-app \
 *     --auth=basic-auth \
 *     --data-layer=rest \
 *     --state=signals-only \
 *     --roles=single-role \
 *     --deploy-target=spa \
 *     --repo=https://github.com/org/my-app.git \
 *     [--out-dir=/path/to/parent/dir] \
 *     [--description="One line description"] \
 *     [--selector-prefix=myapp] \
 *     [--angular-version=22] \
 *     [--package-manager=npm] \
 *     [--dry-run=true]
 *
 * Requires on PATH: node, npm, git, jq (jq is a runtime dependency of the generated
 * project's hooks, checked here so a broken generated repo isn't produced silently).
 * Requires GITHUB_TOKEN in the environment if --repo is provided.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_DIR = path.join(REPO_ROOT, 'base');
const BUNDLES_DIR = path.join(REPO_ROOT, 'bundles');

const AXES = ['auth', 'data-layer', 'state', 'roles', 'deploy-target', 'i18n', 'offline'];

// Commands that run for EVERY generated project, regardless of bundle selection —
// company-wide standards, not per-client decisions. Contrast with a bundle's
// `postGenerateCommands`, which only runs when that specific option is selected.
// Added after discovering `ng new` no longer scaffolds ESLint by default (as of the
// Angular CLI version tested against) — CLAUDE.md already instructs the agent to run
// `ng lint`, so without this, every generated project would ship a false promise and a
// non-functional command.
const BASE_POST_GENERATE_COMMANDS = ['ng add @angular-eslint/schematics --skip-confirmation'];

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`\n⚠️  ${msg}`);
}

function info(msg) {
  console.log(msg);
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=([\s\S]*)$/);
    if (m) {
      args[m[1]] = m[2];
    } else if (raw.startsWith('--')) {
      args[raw.slice(2)] = 'true';
    }
  }
  return args;
}

function commandExists(cmd) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return result.status === 0;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return result.status === 0;
}

function runCapture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

// ---------------------------------------------------------------------------
// Step 1: prerequisites
// ---------------------------------------------------------------------------

function checkPrerequisites() {
  info('🔎 Checking prerequisites...');
  const required = ['node', 'npm', 'git', 'jq'];
  const missing = required.filter((cmd) => !commandExists(cmd));
  if (missing.length) {
    fail(
      `Missing required tool(s) on PATH: ${missing.join(', ')}.\n` +
        `   - jq is required because the generated project's .claude/hooks read\n` +
        `     .claude/settings.json with it at runtime — a generated repo without jq\n` +
        `     available would have silently non-functional guardrail hooks.`
    );
  }
  info('   ✓ node, npm, git, jq all found.');
}

// ---------------------------------------------------------------------------
// Step 2: load + validate the selection against every bundle's manifest
// ---------------------------------------------------------------------------

function loadManifest(axis, option) {
  const manifestPath = path.join(BUNDLES_DIR, axis, option, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail(`Unknown bundle option "${option}" for axis "${axis}" (no manifest at ${manifestPath}).`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function validateSelection(selection) {
  info('\n🔎 Validating bundle selection...');
  const manifests = {};

  for (const axis of AXES) {
    const option = selection[axis];
    if (!option) {
      fail(`Missing --${axis}=<option>. Required axes: ${AXES.join(', ')}.`);
    }
    manifests[axis] = loadManifest(axis, option);
  }

  // Validate every bundle's `requires` field against the full selection.
  // This is a hard requirement per BUNDLE-CONTRACT.md — a mismatch here means an
  // inconsistent repo would otherwise be generated silently.
  let requiresViolation = false;
  for (const axis of AXES) {
    const manifest = manifests[axis];
    if (!manifest.requires) continue;
    for (const [requiredAxis, allowedOptions] of Object.entries(manifest.requires)) {
      const actual = selection[requiredAxis];
      if (!allowedOptions.includes(actual)) {
        console.error(
          `   ✗ ${axis}="${selection[axis]}" requires ${requiredAxis} to be one of ` +
            `[${allowedOptions.join(', ')}], but got "${actual}".`
        );
        requiresViolation = true;
      }
    }
  }
  if (requiresViolation) {
    fail('Invalid bundle combination (see above). Refusing to generate an inconsistent repo.');
  }
  info('   ✓ All cross-bundle "requires" checks passed.');

  // Surface every selected bundle's knownIssues — informational, not blocking.
  // The person running this (developer or the calling skill) must see these; this
  // script does not decide whether to proceed on their behalf.
  for (const axis of AXES) {
    const manifest = manifests[axis];
    if (manifest.knownIssues && manifest.knownIssues.length) {
      warn(`Known issue for ${axis}="${selection[axis]}":`);
      for (const issue of manifest.knownIssues) {
        console.warn(`   ${issue}`);
      }
    }
  }

  return manifests;
}

// ---------------------------------------------------------------------------
// Step 3: scaffold a real Angular CLI workspace
// ---------------------------------------------------------------------------

function scaffoldAngularWorkspace(projectName, outDir, angularVersion) {
  info(`\n📦 Scaffolding a new Angular workspace "${projectName}"...`);
  fs.mkdirSync(outDir, { recursive: true });

  const projectDir = path.join(outDir, projectName);
  if (fs.existsSync(projectDir)) {
    fail(
      `Target directory already exists: ${projectDir}\n` +
        `   Remove it or choose a different --project-name/--out-dir before re-running.`
    );
  }

  const cliSpec = angularVersion ? `@angular/cli@${angularVersion}` : '@angular/cli';
  const args = [
    '-y',
    cliSpec,
    'new',
    projectName,
    '--skip-install',
    '--defaults',
    '--style=scss',
  ];

  const ok = run('npx', args, { cwd: outDir });
  if (!ok) {
    fail(
      "`ng new` failed. See output above. Common causes: (1) Node.js version does not " +
        "meet the installed Angular CLI's minimum requirement — check `npx @angular/cli " +
        'version` output; (2) network access to the npm registry is unavailable.'
    );
  }

  if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
    fail(`Expected a generated project at ${projectDir} but package.json is missing.`);
  }
  info(`   ✓ Workspace created at ${projectDir}`);
  return projectDir;
}

function runBasePostGenerateCommands(projectDir, dryRun) {
  if (!BASE_POST_GENERATE_COMMANDS.length) return;

  if (dryRun) {
    info('\nℹ️  --dry-run set — skipping base post-generate command(s):');
    for (const cmdString of BASE_POST_GENERATE_COMMANDS) {
      info(`   (would run) $ ${cmdString}`);
    }
    return;
  }

  info('\n⚙️  Running base post-generate commands (company-wide standards)...');
  for (const cmdString of BASE_POST_GENERATE_COMMANDS) {
    info(`   $ ${cmdString}`);
    const parts = cmdString.trim().split(/\s+/);
    const actualCmd = parts[0] === 'ng' ? 'npx' : parts[0];
    const actualArgs = parts[0] === 'ng' ? ['@angular/cli', ...parts.slice(1)] : parts.slice(1);
    const ok = run(actualCmd, actualArgs, { cwd: projectDir });
    if (!ok) {
      fail(`Base post-generate command failed: ${cmdString}`);
    }
  }
}

function fixSelectorPrefix(projectDir, selectorPrefix) {
  if (selectorPrefix === 'app') return;

  // 1. The @angular-eslint/schematics generator hardcodes prefix: 'app' in its lint
  // rules regardless of this project's actual selector prefix.
  const eslintConfigPath = path.join(projectDir, 'eslint.config.js');
  if (fs.existsSync(eslintConfigPath)) {
    let content = fs.readFileSync(eslintConfigPath, 'utf8');
    content = content.split("prefix: 'app'").join(`prefix: '${selectorPrefix}'`);
    fs.writeFileSync(eslintConfigPath, content);
  }

  // 2. `ng new` itself always scaffolds the root component with selector 'app-root',
  // regardless of --selector-prefix. Fixing only the lint rule (above) without also
  // fixing the actual root component would make every freshly generated project fail
  // its own lint immediately — found by actually running `ng lint` after combining
  // multiple bundles, not by inspecting the fix in isolation.
  const appTsPath = path.join(projectDir, 'src', 'app', 'app.ts');
  if (fs.existsSync(appTsPath)) {
    let content = fs.readFileSync(appTsPath, 'utf8');
    content = content.split("selector: 'app-root'").join(`selector: '${selectorPrefix}-root'`);
    fs.writeFileSync(appTsPath, content);
  }

  const indexHtmlPath = path.join(projectDir, 'src', 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let content = fs.readFileSync(indexHtmlPath, 'utf8');
    content = content.split('<app-root></app-root>').join(`<${selectorPrefix}-root></${selectorPrefix}-root>`);
    fs.writeFileSync(indexHtmlPath, content);
  }

  info(`   ✓ Fixed selector prefix throughout (lint rule + root component + index.html) to "${selectorPrefix}".`);
}

// ---------------------------------------------------------------------------
// Step 4: apply base/ (CLAUDE.md + .claude/) with placeholders filled
// ---------------------------------------------------------------------------

function fillPlaceholders(content, values) {
  let out = content;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function applyBase(projectDir, placeholderValues) {
  info('\n🛡  Applying base .claude guardrail layer...');

  const claudeMdSrc = fs.readFileSync(path.join(BASE_DIR, 'CLAUDE.md'), 'utf8');
  fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), fillPlaceholders(claudeMdSrc, placeholderValues));

  copyDirRecursive(path.join(BASE_DIR, '.claude'), path.join(projectDir, '.claude'));

  const mcpConfigSrc = path.join(BASE_DIR, '.mcp.json');
  if (fs.existsSync(mcpConfigSrc)) {
    fs.copyFileSync(mcpConfigSrc, path.join(projectDir, '.mcp.json'));
  }

  // architecture.md is the one other file with a placeholder token ({{SELECTOR_PREFIX}}).
  const archPath = path.join(projectDir, '.claude', 'rules', 'architecture.md');
  fs.writeFileSync(archPath, fillPlaceholders(fs.readFileSync(archPath, 'utf8'), placeholderValues));

  // Hooks must be executable — permissions aren't guaranteed to survive a plain copy.
  const hooksDir = path.join(projectDir, '.claude', 'hooks');
  for (const f of fs.readdirSync(hooksDir)) {
    fs.chmodSync(path.join(hooksDir, f), 0o755);
  }

  info('   ✓ CLAUDE.md, .claude/rules/, .claude/settings.json, .claude/hooks/, .mcp.json in place.');
}

// ---------------------------------------------------------------------------
// Step 5: apply each selected bundle
// ---------------------------------------------------------------------------

function mergeUnique(existing, additions) {
  const set = new Set(existing || []);
  for (const item of additions || []) set.add(item);
  return Array.from(set);
}

function copyFilesTreeWithCollisionCheck(filesRoot, currentSrc, destRoot, seenFiles, bundleLabel) {
  for (const entry of fs.readdirSync(currentSrc, { withFileTypes: true })) {
    const s = path.join(currentSrc, entry.name);
    // Always compute the relative path against the ORIGINAL files/ root, not the
    // current recursion level — using currentSrc here would lose one path segment
    // per directory level and silently scatter files at the wrong depth.
    const relFromFilesRoot = path.relative(filesRoot, s);
    const d = path.join(destRoot, relFromFilesRoot);

    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyFilesTreeWithCollisionCheck(filesRoot, s, destRoot, seenFiles, bundleLabel);
    } else {
      if (seenFiles.has(d)) {
        fail(
          `File collision: "${relFromFilesRoot}" was already written by ` +
            `${seenFiles.get(d)}, and ${bundleLabel} tries to write it too. Per ` +
            `BUNDLE-CONTRACT.md this must be resolved at bundle-design time, not silently ` +
            `overwritten here.`
        );
      }
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      seenFiles.set(d, bundleLabel);
    }
  }
}

function applyBundle(projectDir, axis, option, seenFiles) {
  info(`\n📦 Applying bundle: ${axis}/${option}...`);
  const bundleDir = path.join(BUNDLES_DIR, axis, option);
  const bundleLabel = `${axis}/${option}`;

  // deps.fragment.json -> package.json
  const depsFragmentPath = path.join(bundleDir, 'deps.fragment.json');
  if (fs.existsSync(depsFragmentPath)) {
    const fragment = JSON.parse(fs.readFileSync(depsFragmentPath, 'utf8'));
    const pkgPath = path.join(projectDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = { ...(pkg.dependencies || {}), ...(fragment.dependencies || {}) };
    pkg.devDependencies = { ...(pkg.devDependencies || {}), ...(fragment.devDependencies || {}) };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  // settings.fragment.json -> .claude/settings.json (merge permission arrays only)
  const settingsFragmentPath = path.join(bundleDir, 'settings.fragment.json');
  if (fs.existsSync(settingsFragmentPath)) {
    const fragment = JSON.parse(fs.readFileSync(settingsFragmentPath, 'utf8'));
    const settingsPath = path.join(projectDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const key of ['allow', 'ask', 'deny']) {
      if (fragment[key] && fragment[key].length) {
        settings.permissions[key] = mergeUnique(settings.permissions[key], fragment[key]);
      }
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  // rules/<axis>.md -> .claude/rules/<axis>.md
  const rulesDir = path.join(bundleDir, 'rules');
  if (fs.existsSync(rulesDir)) {
    for (const f of fs.readdirSync(rulesDir)) {
      fs.copyFileSync(path.join(rulesDir, f), path.join(projectDir, '.claude', 'rules', f));
    }
  }

  // files/ -> project, mirroring paths, with collision detection across bundles
  const filesDir = path.join(bundleDir, 'files');
  if (fs.existsSync(filesDir)) {
    copyFilesTreeWithCollisionCheck(filesDir, filesDir, projectDir, seenFiles, bundleLabel);
  }

  info(`   ✓ ${bundleLabel} applied.`);
}

// ---------------------------------------------------------------------------
// Step 6: postGenerateCommands (e.g. `ng add @angular/ssr`)
// ---------------------------------------------------------------------------

function runPostGenerateCommands(projectDir, manifests, selection, dryRun) {
  for (const axis of AXES) {
    const manifest = manifests[axis];
    if (!manifest.postGenerateCommands || !manifest.postGenerateCommands.length) continue;

    if (dryRun) {
      info(`\nℹ️  --dry-run set — skipping post-generate command(s) for ${axis}/${selection[axis]}:`);
      for (const cmdString of manifest.postGenerateCommands) {
        info(`   (would run) $ ${cmdString}`);
      }
      continue;
    }

    info(`\n⚙️  Running post-generate commands for ${axis}/${selection[axis]}...`);
    for (const cmdString of manifest.postGenerateCommands) {
      info(`   $ ${cmdString}`);
      // Commands are authored as "ng ..." for readability in manifest.json, but `ng`
      // is not guaranteed to be globally installed — run them through the local
      // Angular CLI via npx instead, which the freshly-scaffolded project depends on.
      const parts = cmdString.trim().split(/\s+/);
      const actualCmd = parts[0] === 'ng' ? 'npx' : parts[0];
      const actualArgs = parts[0] === 'ng' ? ['@angular/cli', ...parts.slice(1)] : parts.slice(1);
      const ok = run(actualCmd, actualArgs, { cwd: projectDir });
      if (!ok) {
        fail(`Post-generate command failed: ${cmdString}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 7: npm install
// ---------------------------------------------------------------------------

function npmInstall(projectDir) {
  info('\n📥 Running npm install (this may take a while)...');
  const ok = run('npm', ['install'], { cwd: projectDir });
  if (!ok) {
    fail(
      'npm install failed. Common cause: a peer-dependency conflict — check whether the ' +
        'selected `state` bundle (if ngrx-signalstore) has a knownIssues warning above ' +
        'about Angular version compatibility.'
    );
  }
  info('   ✓ Dependencies installed.');
}

// ---------------------------------------------------------------------------
// Step 8: git init, commit, push
// ---------------------------------------------------------------------------

function gitInitCommitPush(projectDir, repoUrl, dryRun) {
  info('\n🔧 Initializing git...');
  run('git', ['init', '-q'], { cwd: projectDir });
  run('git', ['config', 'user.email', 'boilerplate-generator@local'], { cwd: projectDir });
  run('git', ['config', 'user.name', 'Boilerplate Generator'], { cwd: projectDir });
  run('git', ['add', '-A'], { cwd: projectDir });
  const committed = run(
    'git',
    ['commit', '-q', '-m', 'chore: initial project generated by boilerplate-generator'],
    { cwd: projectDir }
  );
  if (!committed) {
    fail('git commit failed. See output above.');
  }
  run('git', ['branch', '-M', 'main'], { cwd: projectDir });
  info('   ✓ Committed on branch main.');

  if (!repoUrl) {
    info('\nℹ️  No --repo provided — generated project left local only, not pushed.');
    return;
  }

  if (dryRun) {
    info(`\nℹ️  --dry-run set — skipping push to ${repoUrl}.`);
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail('GITHUB_TOKEN environment variable is required to push to --repo. Set it and re-run.');
  }

  info(`\n⬆️  Pushing to ${repoUrl}...`);
  const authedUrl = repoUrl.replace(/^https:\/\//, `https://${token}@`);
  run('git', ['remote', 'add', 'origin', authedUrl], { cwd: projectDir });

  const push = runCapture('git', ['push', '-u', 'origin', 'main'], { cwd: projectDir });
  const scrub = (text) => (text ? text.split(token).join('[REDACTED]') : '');
  if (push.stdout) info(scrub(push.stdout));
  if (push.stderr) console.error(scrub(push.stderr));

  // Strip the token back out of the stored remote URL regardless of push outcome.
  run('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: projectDir });

  if (push.status !== 0) {
    fail('git push failed. See output above (token has been redacted).');
  }
  info(`   ✓ Pushed to ${repoUrl}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace('/**', ''));
    process.exit(0);
  }

  checkPrerequisites();

  const selection = {};
  for (const axis of AXES) selection[axis] = args[axis];

  const manifests = validateSelection(selection);

  const projectName = args['project-name'];
  if (!projectName) fail('--project-name=<name> is required.');
  if (!/^[a-z][a-z0-9-]*$/.test(projectName)) {
    fail('--project-name must be lowercase, start with a letter, and contain only letters/numbers/hyphens (Angular CLI naming rule).');
  }

  const outDir = path.resolve(args['out-dir'] || process.cwd());
  const repoUrl = args.repo || null;
  const dryRun = args['dry-run'] === 'true';
  const selectorPrefix = args['selector-prefix'] || projectName.replace(/-/g, '');

  const bundleSummaryLines = AXES.map((axis) => `- ${manifests[axis].claudeMdSummaryLine}`).join('\n');

  const placeholderValues = {
    PROJECT_NAME: projectName,
    ONE_LINE_PROJECT_DESCRIPTION: args.description || 'Generated Angular application.',
    ANGULAR_VERSION: args['angular-version'] || 'latest stable',
    TS_VERSION: args['ts-version'] || 'latest',
    PACKAGE_MANAGER: args['package-manager'] || 'npm',
    SELECTOR_PREFIX: selectorPrefix,
    SELECTED_BUNDLES_LIST: bundleSummaryLines,
  };

  const projectDir = scaffoldAngularWorkspace(projectName, outDir, args['angular-version']);

  runBasePostGenerateCommands(projectDir, dryRun);
  if (!dryRun) {
    fixSelectorPrefix(projectDir, selectorPrefix);
  }

  applyBase(projectDir, placeholderValues);

  const seenFiles = new Map();
  for (const axis of AXES) {
    applyBundle(projectDir, axis, selection[axis], seenFiles);
  }

  runPostGenerateCommands(projectDir, manifests, selection, dryRun);

  if (!dryRun) {
    npmInstall(projectDir);
  } else {
    info('\nℹ️  --dry-run set — skipping npm install.');
  }

  gitInitCommitPush(projectDir, repoUrl, dryRun);

  info(`\n✅ Done. Project generated at: ${projectDir}`);
}

main();
