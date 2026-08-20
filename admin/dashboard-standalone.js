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

  function linkCard(link, products) {
    const included = products.filter(product => link.productIds.includes(product.id));
    const cover = included.find(product => product.image_url)?.image_url;
    return `<button class="link-card" data-link-id="${link.id}">${cover ? `<img src="${escapeHtml(cover)}" alt="">` : '<span class="link-cover">Link</span>'}<strong>${escapeHtml(link.title)}</strong><small>Creato il ${date(link.created_at)}</small><span class="link-card-footer">${included.length} prodotti <b>Condividi</b></span></button>`;
  }

  async function linksPage() {
    content.innerHTML = '<div class="top"><h1>Link di vendita</h1><button id="new-link">Nuovo link</button></div><p class="muted">Caricamento link...</p>';
    try {
      const [links, products, relations] = await Promise.all([api('sale_links?select=*&order=created_at.desc'), api('products?select=*&order=created_at.desc'), api('sale_link_products?select=link_id,product_id')]);
      const prepared = links.map(link => ({ ...link, productIds: relations.filter(relation => relation.link_id === link.id).map(relation => relation.product_id) }));
      const draw = term => {
        const filtered = prepared.filter(link => link.title.toLowerCase().includes(term.toLowerCase()));
        content.innerHTML = `<div class="top"><h1>Link di vendita</h1><button id="new-link">Nuovo link</button></div><input id="link-search" class="search" placeholder="Cerca..." value="${escapeHtml(term)}"><div class="link-grid">${filtered.length ? filtered.map(link => linkCard(link, products)).join('') : '<p class="empty">Crea il tuo primo link di vendita.</p>'}</div>`;
        document.querySelector('#new-link').addEventListener('click', () => linkEditor(products));
        document.querySelector('#link-search').addEventListener('input', event => draw(event.target.value));
        content.querySelectorAll('[data-link-id]').forEach(card => card.addEventListener('click', () => linkDetail(prepared.find(link => link.id === card.dataset.linkId), products)));
      };
      draw('');
    } catch (error) { content.innerHTML = `<h1>Link di vendita</h1>${notice(`${error.message} Esegui lo script SQL aggiornato per attivare i link.`, true)}`; }
  }

  function linkEditor(products) {
    navigation('links');
    content.innerHTML = `<button class="back" id="close-link">Chiudi</button><h1>Nuovo link</h1><form id="link-form" class="editor-form"><label>Titolo<input id="link-title" required placeholder="Es. Per Rosario"></label><label>Descrizione (opzionale)<textarea id="link-description" rows="3"></textarea></label><fieldset class="pick-list"><legend>Prodotti</legend><p class="muted">Scegli i prodotti che vuoi mettere in vendita.</p>${products.map(product => `<label class="pick-item"><input type="checkbox" value="${product.id}"><span>${escapeHtml(product.name)}<small>${money(product.price)} · Quantita: ${stock(product)}</small></span></label>`).join('')}</fieldset><p id="link-message" class="error-message"></p><div class="actions"><button type="button" class="ghost" id="cancel-link">Annulla</button><button type="submit">Crea link</button></div></form>`;
    const close = () => linksPage();
    document.querySelector('#close-link').addEventListener('click', close);
    document.querySelector('#cancel-link').addEventListener('click', close);
    document.querySelector('#link-form').addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.querySelector('#link-message');
      const submit = event.currentTarget.querySelector('[type="submit"]');
      const ids = [...content.querySelectorAll('.pick-item input:checked')].map(input => input.value);
      if (!ids.length) { message.textContent = 'Seleziona almeno un prodotto.'; return; }
      submit.disabled = true; message.textContent = 'Creazione link...';
      try {
        const created = await api('sale_links', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ owner_id: session.user.id, title: document.querySelector('#link-title').value.trim(), description: document.querySelector('#link-description').value.trim() }) });
        const link = created[0];
        await api('sale_link_products', { method: 'POST', body: JSON.stringify(ids.map(product_id => ({ link_id: link.id, product_id }))) });
        linkDetail({ ...link, productIds: ids }, products);
      } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
  }

  function linkDetail(link, products) {
    if (!link) return linksPage();
    navigation('links');
    const included = products.filter(product => link.productIds.includes(product.id));
    const publicUrl = `${location.origin}/?link=${encodeURIComponent(link.slug)}`;
    content.innerHTML = `<button class="back" id="back-links">Indietro</button><div class="top product-title"><h1>${escapeHtml(link.title)}</h1><button class="ghost" id="delete-link">Elimina</button></div><p class="muted">Creato il ${date(link.created_at)}</p><section class="stats link-stats"><div class="stat">Visite<b>${Number(link.visits || 0)}</b></div><div class="stat">Ordini<b>0</b></div></section><section class="share-box"><strong>Condividi questo link per iniziare a vendere</strong><div><input readonly value="${escapeHtml(publicUrl)}"><button class="ghost" id="copy-link">Copia</button></div><button id="share-link">Condividi</button></section><h2>Prodotti in vendita · ${included.length}</h2><div class="list">${included.map(productRow).join('') || '<p class="empty">Nessun prodotto selezionato.</p>'}</div>`;
    document.querySelector('#back-links').addEventListener('click', linksPage);
    document.querySelector('#copy-link').addEventListener('click', async () => { await navigator.clipboard.writeText(publicUrl); document.querySelector('#copy-link').textContent = 'Copiato'; });
    document.querySelector('#share-link').addEventListener('click', async () => { if (navigator.share) await navigator.share({ title: link.title, url: publicUrl }); else await navigator.clipboard.writeText(publicUrl); });
    document.querySelector('#delete-link').addEventListener('click', async () => { if (!confirm(`Eliminare il link ${link.title}?`)) return; try { await api(`sale_links?id=eq.${encodeURIComponent(link.id)}`, { method: 'DELETE' }); linksPage(); } catch (error) { alert(error.message); } });
  }

  async function customersPage() {
    content.innerHTML = '<h1>Clienti</h1><p class="muted">Caricamento clienti...</p>';
    try {
      const orders = await api('orders?select=customer_name,customer_email,created_at,total&order=created_at.desc');
      const customers = new Map();
      orders.forEach(order => {
        const email = (order.customer_email || '').trim().toLowerCase();
        if (!email) return;
        const current = customers.get(email) || { email, name: order.customer_name || '', count: 0, total: 0 };
        current.count += 1; current.total += Number(order.total || 0); if (!current.name && order.customer_name) current.name = order.customer_name;
        customers.set(email, current);
      });
      const values = [...customers.values()];
      content.innerHTML = `<div class="top"><h1>Clienti</h1></div><input id="customer-search" class="search" placeholder="Cerca cliente..."><p class="muted">Tutti · ${values.length}</p><div class="list" id="customer-list"></div>`;
      const draw = term => { document.querySelector('#customer-list').innerHTML = values.filter(customer => `${customer.name} ${customer.email}`.toLowerCase().includes(term.toLowerCase())).map(customer => `<div class="row"><span>Cliente</span><span><strong>${escapeHtml(customer.name || customer.email)}</strong><p>${escapeHtml(customer.email)} · ${customer.count} ordini</p></span><b>${money(customer.total)}</b></div>`).join('') || '<p class="empty">Non ci sono ancora clienti con ordini.</p>'; };
      document.querySelector('#customer-search').addEventListener('input', event => draw(event.target.value));
      draw('');
    } catch (error) { content.innerHTML = `<h1>Clienti</h1>${notice(error.message, true)}`; }
  }

  async function couponsPage() {
    content.innerHTML = '<div class="top"><h1>Coupon</h1><button id="new-coupon">Nuovo coupon</button></div><p class="muted">Caricamento coupon...</p>';
    try {
      const coupons = await api('coupons?select=*&order=created_at.desc');
      const draw = () => {
        content.innerHTML = `<div class="top"><h1>Coupon</h1><button id="new-coupon">Nuovo coupon</button></div><div class="list">${coupons.length ? coupons.map(coupon => `<button class="coupon-row" data-coupon="${coupon.id}"><span>Coupon</span><span><strong>${escapeHtml(coupon.name)}</strong><p>Creato il ${date(coupon.created_at)} · ${coupon.active ? 'Attivo' : 'Disattivo'}</p></span><b>${escapeHtml(coupon.code)} · ${Number(coupon.percent_off)}%</b></button>`).join('') : '<p class="empty">Non ci sono ancora coupon. Crea il primo codice sconto.</p>'}</div>`;
        document.querySelector('#new-coupon').addEventListener('click', () => couponEditor());
        content.querySelectorAll('[data-coupon]').forEach(row => row.addEventListener('click', () => couponEditor(coupons.find(coupon => coupon.id === row.dataset.coupon))));
      };
      draw();
    } catch (error) { content.innerHTML = `<h1>Coupon</h1>${notice(error.message, true)}`; }
  }

  function couponEditor(coupon = null) {
    const creating = !coupon?.id;
    navigation('coupons');
    content.innerHTML = `<button class="back" id="back-coupons">Indietro</button><h1>${creating ? 'Nuovo coupon' : 'Modifica coupon'}</h1><form id="coupon-form" class="editor-form"><div class="form-grid"><label>Nome coupon<input id="coupon-name" required value="${escapeHtml(coupon?.name || '')}" placeholder="Sconto 10%"></label><label>Codice<input id="coupon-code" required value="${escapeHtml(coupon?.code || '')}" placeholder="SCONTO10"></label><label>Sconto percentuale<input id="coupon-percent" required type="number" min="0" max="100" step="0.01" value="${escapeHtml(coupon?.percent_off ?? 10)}"></label><label class="check"><input id="coupon-active" type="checkbox" ${coupon?.active !== false ? 'checked' : ''}> Coupon attivo</label></div><p id="coupon-message" class="error-message"></p><div class="actions">${creating ? '' : '<button type="button" id="delete-coupon" class="ghost">Elimina</button>'}<button type="button" id="cancel-coupon" class="ghost">Annulla</button><button type="submit">${creating ? 'Crea coupon' : 'Salva modifiche'}</button></div></form>`;
    document.querySelector('#back-coupons').addEventListener('click', couponsPage);
    document.querySelector('#cancel-coupon').addEventListener('click', couponsPage);
    document.querySelector('#coupon-form').addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.querySelector('#coupon-message'); const submit = event.currentTarget.querySelector('[type="submit"]');
      const payload = { name: document.querySelector('#coupon-name').value.trim(), code: document.querySelector('#coupon-code').value.trim().toUpperCase(), percent_off: Number(document.querySelector('#coupon-percent').value), active: document.querySelector('#coupon-active').checked };
      if (!payload.name || !payload.code) { message.textContent = 'Inserisci nome e codice.'; return; }
      submit.disabled = true; message.textContent = 'Salvataggio...';
      try { if (creating) await api('coupons', { method: 'POST', body: JSON.stringify({ ...payload, owner_id: session.user.id }) }); else await api(`coupons?id=eq.${encodeURIComponent(coupon.id)}`, { method: 'PATCH', body: JSON.stringify(payload) }); couponsPage(); } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
    document.querySelector('#delete-coupon')?.addEventListener('click', async () => { if (!confirm(`Eliminare il coupon ${coupon.code}?`)) return; try { await api(`coupons?id=eq.${encodeURIComponent(coupon.id)}`, { method: 'DELETE' }); couponsPage(); } catch (error) { alert(error.message); } });
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
    if (page === 'links') return linksPage();
    if (page === 'customers') return customersPage();
    if (page === 'coupons') return couponsPage();
    const configs = {
      links: ['store_settings', 'Link di vendita', item => `<div class="row"><span>⌁</span><span><strong>${escapeHtml(item.store_name || 'Il Gatto di Cruci')}</strong><p>Link pubblico del negozio</p></span><b>Attivo</b></div>`],
      orders: ['orders', 'Ordini', item => `<div class="row"><span>✓</span><span><strong>Ordine ${escapeHtml(item.order_number || '#')}</strong><p>${escapeHtml(item.customer_name || item.customer_email || '')} · ${date(item.created_at)} · ${escapeHtml(item.status || 'Da confermare')}</p></span><b>${money(item.total)}</b></div>`],
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
