document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.ProviderAuth;
  const status = document.getElementById('access-status');
  const login = document.getElementById('demo-login');
  const content = document.getElementById('provider-content');
  const retry = document.getElementById('session-retry');
  const logout = document.getElementById('demo-logout');
  const errorText = error => error.status === 503
    ? 'El acceso de demostración está desactivado en este servidor.'
    : 'No pudimos conectar con el servidor. Inténtalo de nuevo.';

  if (login) {
    document.getElementById('login-form').addEventListener('submit', async event => {
      event.preventDefault();
      login.disabled = true;
      status.textContent = 'Abriendo sesión de demostración…';
      try {
        await auth.signIn(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value);
        window.location.assign('/proveedor.html');
      } catch (error) { status.textContent = error.status === 401
        ? 'Correo o contraseña incorrectos. Usa las credenciales de demostración indicadas.' : errorText(error); }
      finally { login.disabled = false; document.getElementById('login-password').value = ''; }
    });
    return;
  }
  async function checkSession() {
    content.hidden = true;
    retry.hidden = true;
    status.textContent = 'Comprobando la sesión…';
    try {
      if (!auth.token()) { window.location.replace('/acceso.html'); return; }
      const provider = await auth.currentProvider();
      document.getElementById('provider-name').textContent = provider.nombrePublico;
      content.hidden = false;
      status.textContent = '';
      document.dispatchEvent(new CustomEvent('provider-ready', { detail: provider }));
    } catch (error) {
      document.dispatchEvent(new Event('provider-unavailable'));
      if (error.status === 401) { window.location.replace('/acceso.html'); return; }
      status.textContent = errorText(error);
      retry.hidden = false;
    }
  }
  retry.addEventListener('click', checkSession);
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await auth.signOut(); window.location.replace('/acceso.html'); }
    catch (error) { status.textContent = 'No pudimos cerrar la sesión en el servidor. Inténtalo de nuevo.'; }
    finally { logout.disabled = false; }
  });
  // Revalidar al volver a la pestaña o restaurar una página del historial.
  window.addEventListener('pageshow', event => { if (event.persisted) checkSession(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkSession(); });
  setInterval(checkSession, 60000);
  await checkSession();
});
