import Aura from '@primeuix/themes/aura';

/**
 * PrimeNG theme configuration. Isolated into its own file (rather than inline in
 * app.config.ts) so it can be fully protected from AI edits, matching the pattern
 * used for other set-once configuration in this project (see oauth.config.ts for the
 * same reasoning). A developer customizing the palette should use PrimeNG's
 * `definePreset()` utility here, not scattered ad hoc overrides in feature files.
 */
export const primeNgThemeConfig = {
  preset: Aura,
};
