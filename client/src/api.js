export async function apiFetch(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  return fetch(url, { ...options, headers });
}
