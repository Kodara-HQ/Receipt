const TOKEN_KEY = "tfu_token";

// Callback set by AuthProvider so the API layer can clear auth state
// without importing React hooks (which would create a circular dep)
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the server. Make sure the app is running, then try again.");
  }

  if (response.status === 401) {
    _onUnauthorized?.();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data;
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: "POST",   body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: "DELETE" }),
};

export function fileUrl(path) {
  if (!path) return "";
  return path;
}
