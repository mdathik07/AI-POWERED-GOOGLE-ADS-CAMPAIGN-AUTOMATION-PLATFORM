// Small localStorage-backed auth helpers shared across pages.

export function saveSession({ token, sessionId, user }) {
  localStorage.setItem('token', token);
  localStorage.setItem('sessionId', sessionId);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function getSessionId() {
  return localStorage.getItem('sessionId');
}

export function setSessionId(sessionId) {
  localStorage.setItem('sessionId', sessionId);
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem('token'));
}
