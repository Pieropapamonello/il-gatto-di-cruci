(() => {
  const project = 'waeiuyzteusfsajmzblj';
  const key = 'sb_publishable_0zscL8lzkUbSgDHxs0lfIw_Pu6XVMJV';
  const allowedEmail = 'mekamiepixie@gmail.com';
  async function adminLogin(event) {
    if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
    const form = document.querySelector('#auth-form');
    const email = document.querySelector('#auth-email').value.trim().toLowerCase();
    const password = document.querySelector('#auth-password').value;
    const message = document.querySelector('#auth-message');
    const button = form.querySelector('button');
    if (email !== allowedEmail) { message.textContent = 'Questo account non è autorizzato.'; return; }
    if (!form.reportValidity()) return;
    button.disabled = true; message.textContent = 'Accesso in corso…';
    try {
      const response = await fetch(`https://${project}.supabase.co/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(12000),
      });
      const session = await response.json();
      if (!response.ok) throw new Error(session.error_description || session.msg || 'Email o password non corretti.');
      localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify(session));
      location.replace('/admin/dashboard.html');
    } catch (error) {
      message.textContent = error.name === 'TimeoutError' ? 'Connessione a Supabase bloccata o troppo lenta. Disattiva lo Scudo di Brave per questo sito e riprova.' : `Errore: ${error.message || 'riprova.'}`;
      button.disabled = false;
    }
  }
  window.adminLogin = adminLogin;
  document.addEventListener('submit', event => { if (event.target.closest('#auth-form')) adminLogin(event); }, true);
})();
