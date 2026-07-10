// Deploy prefix for www.kadoa.com/potus (mirrors basePath in next.config.ts).
// Next's basePath rewrites routes/links/assets but NOT client fetch() URLs,
// so API calls must prefix explicitly.
export const BASE_PATH = "/potus";
export const apiUrl = (path) => `${BASE_PATH}${path}`;
