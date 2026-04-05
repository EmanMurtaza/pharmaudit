// Centralised fetch wrapper — adds JWT Authorization header to every request
// and fires an 'auth:logout' event if the server returns 401.

const TOKEN_KEY = 'pharma_token';

export const getToken    = ()    => localStorage.getItem(TOKEN_KEY);
export const setToken    = (t)   => localStorage.setItem(TOKEN_KEY, t);
export const clearToken  = ()    => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const res   = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired. Please log in again.');
  }

  return res;
}

export const api = {
  get:    (path)       => request(path),
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};
