// Keeps different variants as distinct cart lines and shows the selected choice.
const cartItemKey = item => `${item.id}::${item.variant || ''}`;
addToCart = (id, variant = '') => {
  const current = cart.find(item => item.id === id && (item.variant || '') === variant);
  current ? current.quantity++ : cart.push({ id, quantity: 1, variant });
  saveCart(); openCart();
};
saveCart = () => {
  localStorage.setItem('cruci-cart', JSON.stringify(cart));
  document.querySelector('#cart-count').textContent = cart.reduce((total, item) => total + item.quantity, 0);
  renderCart();
};
renderCart = () => {
  const holder = document.querySelector('#cart-items'); const totalBox = document.querySelector('#cart-total');
  holder.innerHTML = cart.length ? cart.map(item => {
    const product = products.find(product => product.id === item.id);
    const variant = item.variant ? `<br><small class="cart-variant">Variante: ${item.variant}</small>` : '';
    return `<div class="cart-row"><img src="${product.image}" alt=""><div><strong>${product.name}</strong>${variant}<br><small>Quantità: ${item.quantity} · ${formatPrice(product)}</small></div><span class="cart-line-actions"><button aria-label="Rimuovi un articolo" data-decrease-key="${cartItemKey(item)}">−</button><button aria-label="Rimuovi la variante ${item.variant || product.name}" data-remove-key="${cartItemKey(item)}">×</button></span></div>`;
  }).join('') : '<p class="empty">La tua borsa è vuota.</p>';
  holder.querySelectorAll('[data-remove-key]').forEach(button => button.onclick = () => { cart = cart.filter(item => cartItemKey(item) !== button.dataset.removeKey); saveCart(); });
  holder.querySelectorAll('[data-decrease-key]').forEach(button => button.onclick = () => { const line = cart.find(item => cartItemKey(item) === button.dataset.decreaseKey); if (line) { line.quantity--; if (line.quantity < 1) cart = cart.filter(item => cartItemKey(item) !== button.dataset.decreaseKey); saveCart(); } });
  const unknown = cart.some(item => products.find(product => product.id === item.id).price === null);
  const articles = cart.reduce((sum, item) => { const price = products.find(product => product.id === item.id).price; return sum + (price === null ? 0 : price * item.quantity); }, 0);
  const shipping = shippingChoice(); const total = articles + (cart.length ? shipping.price : 0); totalBox.hidden = !cart.length;
  totalBox.innerHTML = `<span>Totale <small>Articoli ${formatPrice({ price: articles })} · Spedizione ${formatPrice({ price: cart.length ? shipping.price : 0 })}${unknown ? '<br>Alcuni prezzi sono da confermare' : ''}</small></span><strong>${formatPrice({ price: total })}${unknown ? '+' : ''}</strong>`;
};
renderCart();
