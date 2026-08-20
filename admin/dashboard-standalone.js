(() => {
  'use strict';

  const PROJECT = 'waeiuyzteusfsajmzblj';
  const API_KEY = 'sb_publishable_0zscL8lzkUbSgDHxs0lfIw_Pu6XVMJV';
  const ADMIN_EMAIL = 'mekamiepixie@gmail.com';
  const SESSION_KEY = `sb-${PROJECT}-auth-token`;
  const app = document.querySelector('#app');
  const nav = document.querySelector('#nav');
  const content = document.querySelector('#content');
  let session;
  let productsCache = [];

  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
  if (!session?.access_token || session?.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    location.replace('/admin/');
    return;
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = value => Number(value || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const date = value => value ? new Date(value).toLocaleDateString('it-IT') : '-';
  const stock = product => Array.isArray(product.variants) && product.variants.length
    ? product.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
    : Number(product.stock || 0);

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://${PROJECT}.supabase.co/rest/v1/${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem(SESSION_KEY);
          location.replace('/admin/');
          throw new Error('Sessione scaduta. Accedi di nuovo.');
        }
        throw new Error(body?.message || body?.hint || body?.details || 'Operazione non riuscita.');
      }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Supabase non risponde. Riprova tra poco.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  const pages = [
    ['home', '⌂  Home'], ['links', '⌁  Link'], ['products', '◇  Prodotti'], ['orders', '▣  Ordini'],
    ['customers', '♧  Clienti'], ['coupons', '✿  Coupon'], ['returns', '↩  Resi'], ['payments', '▦  Incassi'], ['settings', '⚙  Impostazioni'],
  ];

  function navigation(active) {
    nav.innerHTML = pages.map(([id, label]) => `<button class="${id === active ? 'active' : ''}" data-page="${id}">${label}</button>`).join('');
    nav.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => go(button.dataset.page)));
  }

  function notice(message, isError = false) {
    return `<p class="${isError ? 'error-message' : 'muted'}">${escapeHtml(message)}</p>`;
  }

  async function homePage() {
    content.innerHTML = '<h1>Home</h1><p class="muted">Caricamento riepilogo...</p>';
    try {
      const [products, orders] = await Promise.all([
        api('products?select=id,stock,variants'),
        api('orders?select=id,total,status'),
      ]);
      const total = (orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);
      content.innerHTML = `<h1>Home</h1><p class="muted">Riepilogo del tuo negozio</p><section class="stats">
        <div class="stat">Vendite<b>${money(total)}</b></div><div class="stat">Ordini<b>${orders.length}</b></div>
        <div class="stat">Prodotti<b>${products.length}</b></div><div class="stat">Disponibili<b>${products.filter(product => stock(product) > 0 && product.available !== false).length}</b></div>
      </section>`;
    } catch (error) { content.innerHTML = `<h1>Home</h1>${notice(error.message, true)}`; }
  }

  function productRow(product) {
    const quantity = stock(product);
    const unavailable = product.available === false || quantity <= 0;
    return `<button class="product-row" data-product-id="${escapeHtml(product.id)}">
      ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="">` : '<span class="image-placeholder">◇</span>'}
      <span><strong>${escapeHtml(product.name)}</strong><small>Quantita: ${quantity}${unavailable ? ' · Esaurito' : ''}</small></span>
      <b>${money(product.price)}</b>
    </button>`;
  }

  async function productsPage() {
    content.innerHTML = '<div class="top"><h1>Prodotti</h1><button id="new-product">＋ Nuovo prodotto</button></div><p class="muted">Caricamento prodotti...</p>';
    try {
      productsCache = await api('products?select=*&order=created_at.desc');
      const draw = term => {
        const filtered = productsCache.filter(product => product.name.toLowerCase().includes(term.toLowerCase()));
        content.innerHTML = `<div class="top"><h1>Prodotti</h1><button id="new-product">＋ Nuovo prodotto</button></div>
          <input id="product-search" class="search" placeholder="Cerca..." value="${escapeHtml(term)}">
          <p class="muted">Tutti · ${filtered.length}</p><div class="list">${filtered.length ? filtered.map(productRow).join('') : '<p class="empty">Nessun prodotto trovato.</p>'}</div>`;
        document.querySelector('#new-product').addEventListener('click', () => productEditor());
        document.querySelector('#product-search').addEventListener('input', event => draw(event.target.value));
        content.querySelectorAll('[data-product-id]').forEach(row => row.addEventListener('click', () => productDetail(productsCache.find(product => product.id === row.dataset.productId))));
      };
      draw('');
    } catch (error) { content.innerHTML = `<h1>Prodotti</h1>${notice(error.message, true)}`; }
  }

  function variantsTable(variants) {
    if (!Array.isArray(variants) || !variants.length) return '<p class="empty">Questo prodotto non ha varianti.</p>';
    return `<div class="list variants-table"><div class="variant-head"><span>Nome</span><span>Quantita</span></div>${variants.map(variant => `<div class="variant-line"><span>${escapeHtml(variant.name)}</span><span>${Number(variant.stock || 0)}</span></div>`).join('')}</div>`;
  }

  function productDetail(product) {
    if (!product) return productsPage();
    navigation('products');
    const quantity = stock(product);
    content.innerHTML = `<button class="back" id="back-products">← Prodotti</button>
      <div class="top product-title"><h1>${escapeHtml(product.name)}</h1><span class="detail-actions"><button class="ghost" id="edit-product">Modifica</button><button class="ghost" id="duplicate-product">Duplica</button><button id="delete-product">Elimina</button></span></div>
      <section class="product-detail">
        ${product.image_url ? `<img class="detail-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : ''}
        <div class="detail-info"><p><span>Descrizione</span><strong>${escapeHtml(product.description || 'Nessuna descrizione')}</strong></p><p><span>Prezzo</span><strong>${money(product.price)}</strong></p><p><span>Quantita totale</span><strong>${quantity}</strong></p><p><span>Stato</span><strong>${product.available !== false && quantity > 0 ? 'Disponibile' : 'Esaurito'}</strong></p></div>
      </section><h2>Varianti</h2>${variantsTable(product.variants)}`;
    document.querySelector('#back-products').addEventListener('click', productsPage);
    document.querySelector('#edit-product').addEventListener('click', () => productEditor(product));
    document.querySelector('#duplicate-product').addEventListener('click', () => productEditor({ ...product, id: null, name: `${product.name} (copia)` }));
    document.querySelector('#delete-product').addEventListener('click', () => removeProduct(product));
  }

  function parseVariants(raw) {
    return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|');
      const quantity = Math.max(0, Number(parts.slice(1).join('|').trim() || 0));
      return { name: parts[0].trim(), stock: quantity, available: quantity > 0 };
    }).filter(variant => variant.name);
  }

  function productEditor(product = null) {
    const creating = !product?.id;
    const variants = Array.isArray(product?.variants) ? product.variants.map(variant => `${variant.name} | ${variant.stock ?? 0}`).join('\n') : '';
    navigation('products');
    content.innerHTML = `<button class="back" id="cancel-edit">← Prodotti</button><div class="top"><h1>${creating ? 'Nuovo prodotto' : 'Modifica prodotto'}</h1></div>
      <form id="product-form" class="editor-form"><div class="form-grid">
        <label class="wide">Nome prodotto<input id="name" required value="${escapeHtml(product?.name || '')}"></label>
        <label>Prezzo in euro<input id="price" type="number" min="0" step="0.01" required value="${escapeHtml(product?.price ?? '')}"></label>
        <label>Quantita senza varianti<input id="stock" type="number" min="0" step="1" required value="${escapeHtml(product?.stock ?? 0)}"></label>
        <label class="wide">Descrizione<textarea id="description" rows="4">${escapeHtml(product?.description || '')}</textarea></label>
        <label class="wide">URL foto principale<input id="image-url" type="url" placeholder="https://..." value="${escapeHtml(product?.image_url || '')}"></label>
        <label class="wide">Varianti (una per riga: nome | quantita)<textarea id="variants" rows="7" placeholder="Ametista | 3&#10;Catena argento | 2">${escapeHtml(variants)}</textarea><small>Se inserisci varianti, la disponibilita viene calcolata dalle loro quantita.</small></label>
        <label class="check wide"><input id="available" type="checkbox" ${product?.available !== false ? 'checked' : ''}> Prodotto visibile e ordinabile</label>
      </div><p id="form-message" class="error-message"></p><div class="actions"><button type="button" class="ghost" id="cancel-edit-2">Annulla</button><button type="submit">${creating ? 'Crea prodotto' : 'Salva modifiche'}</button></div></form>`;
    const cancel = () => creating ? productsPage() : productDetail(product);
    document.querySelector('#cancel-edit').addEventListener('click', cancel);
    document.querySelector('#cancel-edit-2').addEventListener('click', cancel);
    document.querySelector('#product-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      const message = document.querySelector('#form-message');
      const parsedVariants = parseVariants(document.querySelector('#variants').value);
      const payload = {
        name: document.querySelector('#name').value.trim(),
        description: document.querySelector('#description').value.trim(),
        price: Number(document.querySelector('#price').value),
        stock: Math.max(0, Number(document.querySelector('#stock').value || 0)),
        image_url: document.querySelector('#image-url').value.trim() || null,
        variants: parsedVariants,
        available: document.querySelector('#available').checked,
      };
      if (!payload.name || Number.isNaN(payload.price)) { message.textContent = 'Inserisci nome e prezzo validi.'; return; }
      submit.disabled = true; message.textContent = 'Salvataggio...';
      try {
        let saved;
        if (creating) {
          saved = await api('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, owner_id: session.user.id }) });
          productDetail(saved[0]);
        } else {
          saved = await api(`products?id=eq.${encodeURIComponent(product.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
          productDetail(saved[0] || { ...product, ...payload });
        }
      } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
  }

  async function removeProduct(product) {
    if (!confirm(`Eliminare definitivamente “${product.name}”?`)) return;
    try { await api(`products?id=eq.${encodeURIComponent(product.id)}`, { method: 'DELETE' }); productsPage(); }
    catch (error) { alert(`Non e stato possibile eliminare il prodotto: ${error.message}`); }
  }

  async function simpleList(page, table, title, row) {
    content.innerHTML = `<h1>${title}</h1><p class="muted">Caricamento...</p>`;
    try {
      const rows = await api(`${table}?select=*&order=created_at.desc`);
      content.innerHTML = `<h1>${title}</h1><div class="list">${rows.length ? rows.map(row).join('') : '<p class="empty">Non ci sono ancora elementi.</p>'}</div>`;
    } catch (error) { content.innerHTML = `<h1>${title}</h1>${notice(error.message, true)}`; }
  }

  function go(page) {
    navigation(page);
    if (page === 'home') return homePage();
    if (page === 'products') return productsPage();
    const configs = {
      links: ['store_settings', 'Link di vendita', item => `<div class="row"><span>⌁</span><span><strong>${escapeHtml(item.store_name || 'Il Gatto di Cruci')}</strong><p>Link pubblico del negozio</p></span><b>Attivo</b></div>`],
      orders: ['orders', 'Ordini', item => `<div class="row"><span>✓</span><span><strong>Ordine ${escapeHtml(item.order_number || '#')}</strong><p>${escapeHtml(item.customer_name || item.customer_email || '')} · ${date(item.created_at)} · ${escapeHtml(item.status || 'Da confermare')}</p></span><b>${money(item.total)}</b></div>`],
      customers: ['customers', 'Clienti', item => `<div class="row"><span>♧</span><span><strong>${escapeHtml(item.email || item.name || 'Cliente')}</strong><p>${Number(item.orders_count || 0)} ordini</p></span></div>`],
      coupons: ['coupons', 'Coupon', item => `<div class="row"><span>✿</span><span><strong>${escapeHtml(item.name)}</strong><p>Codice: ${escapeHtml(item.code)}</p></span><b>${Number(item.percent_off || 0)}%</b></div>`],
    };
    if (configs[page]) return simpleList(page, ...configs[page]);
    const messages = {
      returns: ['Resi', 'Gestisci qui le richieste di reso e rimborso ricevute dai clienti.'],
      payments: ['Incassi', 'Qui troverai gli incassi degli ordini confermati.'],
      settings: ['Impostazioni', 'Le impostazioni del negozio sono salvate in Supabase.'],
    };
    const [title, text] = messages[page];
    content.innerHTML = `<h1>${title}</h1><section class="card"><h2>${title}</h2><p>${text}</p></section>`;
  }

  document.querySelector('#logout').addEventListener('click', () => { localStorage.removeItem(SESSION_KEY); location.replace('/admin/'); });
  app.hidden = false;
  go('home');
})();
