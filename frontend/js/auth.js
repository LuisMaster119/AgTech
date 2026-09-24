/* Adaptador de sesión demo con credenciales ficticias públicas. */
window.ProviderAuth = {
  key: 'agtech.demo.session',
  token() { return sessionStorage.getItem(this.key); },
  async request(path, method = 'GET', body = undefined, timeoutMs = 15000) {
    const token = this.token();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401) sessionStorage.removeItem(this.key);
        const error = new Error('No se pudo consultar la sesión.');
        error.status = response.status;
        throw error;
      }
      return response.status === 204 ? null : await response.json();
    } finally { clearTimeout(timer); }
  },
  async signIn(email, password) {
    // Revocar una sesión previa antes de sustituirla.
    if (this.token()) await this.signOut();
    const session = await this.request('/auth/demo/session', 'POST', { email, password });
    sessionStorage.setItem(this.key, session.accessToken);
  },
  currentProvider() { return this.request('/providers/me'); },
  async signOut() {
    await this.request('/auth/demo/session', 'DELETE');
    sessionStorage.removeItem(this.key);
  }
};
