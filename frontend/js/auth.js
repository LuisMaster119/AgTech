/* Adaptador de sesión demo. Sustituible por Firebase Auth; no usa contraseñas. */
window.ProviderAuth = {
  key: 'agtech.demo.session',
  token() { return sessionStorage.getItem(this.key); },
  async request(path, method = 'GET') {
    const token = this.token();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  async signIn() {
    // Revocar una sesión previa antes de sustituirla.
    if (this.token()) await this.signOut();
    const session = await this.request('/auth/demo/session', 'POST');
    sessionStorage.setItem(this.key, session.accessToken);
  },
  currentProvider() { return this.request('/providers/me'); },
  async signOut() {
    await this.request('/auth/demo/session', 'DELETE');
    sessionStorage.removeItem(this.key);
  }
};
