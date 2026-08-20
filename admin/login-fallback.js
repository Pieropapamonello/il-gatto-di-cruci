(() => {
  const project = 'waeiuyzteusfsajmzblj';
  const key = 'sb_publishable_0zscL8lzkUbSgDHxs0lfIw_Pu6XVMJV';
  const allowedEmail = 'mekamiepixie@gmail.com';
  document.addEventListener('submit', async event => {
    const form = event.target.closest('#auth-form');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation();
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
      });
      const session = await response.json();
      if (!response.ok) throw new Error(session.error_description || session.msg || 'Email o password non corretti.');
      localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify(session));
      location.reload();
    } catch (error) {
      message.textContent = `Errore: ${error.message || 'riprova.'}`;
      button.disabled = false;
    }
  }, true);
})();
