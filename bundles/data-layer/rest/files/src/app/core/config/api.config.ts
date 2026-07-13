import { environment } from '../../../environments/environment';

/**
 * Single place the REST API base URL is read from. Feature services should
 * import `apiBaseUrl` (via ApiService, not directly) rather than hardcoding
 * a URL string.
 */
export const apiBaseUrl = environment.apiUrl;
