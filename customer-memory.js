// The shopper decides whether their own device may remember checkout details.
(() => {
  const key = 'gatto-di-cruci-customer-details';
  const fields = {
    first: document.querySelector('#customer-first-name'),
    last: document.querySelector('#customer-last-name'),
    email: document.querySelector('#customer-email'),
    address: document.querySelector('#customer-address'),
  };
  if (!fields.first || !fields.last || !fields.email || !fields.address) return;

  const label = document.createElement('label');
  label.className = 'remember-customer';
  label.innerHTML = '<input type="checkbox"> Ricorda questi dati solo su questo dispositivo';
  fields.address.closest('label').after(label);
  const choice = label.querySelector('input');

  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved === 'object') {
      fields.first.value = saved.first || '';
      fields.last.value = saved.last || '';
      fields.email.value = saved.email || '';
      fields.address.value = saved.address || '';
      choice.checked = true;
    }
  } catch { localStorage.removeItem(key); }

  const persist = () => {
    if (!choice.checked) return;
    localStorage.setItem(key, JSON.stringify({
      first: fields.first.value.trim(),
      last: fields.last.value.trim(),
      email: fields.email.value.trim(),
      address: fields.address.value.trim(),
    }));
  };
  Object.values(fields).forEach(field => field.addEventListener('input', persist));
  choice.addEventListener('change', () => {
    if (choice.checked) persist();
    else localStorage.removeItem(key);
  });
})();
