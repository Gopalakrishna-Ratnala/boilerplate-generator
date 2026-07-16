import { environment } from '../../../environments/environment';

/**
 * Single place the API base URL is read from. Feature services should import
 * `apiBaseUrl` (via ApiService, not directly) rather than hardcoding a URL string.
 *
 * For this project, the URL points at a locally-running json-server instance
 * (started via `npm run mock-api`) — see `.claude/rules/data-layer.md`. In
 * development this is `http://localhost:3000/api` by default (json-server's
 * `routes.json` rewrites `/api/*` to the real resource paths). A developer will
 * need to update `environment.apiUrl` if the port/host changes, or once this
 * project moves from json-server to a real backend.
 */
export const apiBaseUrl = environment.apiUrl;
