// The public shop uses the same Supabase inventory as the administration area.
// The old embedded catalogue remains only as a safe visual fallback if Supabase is unavailable.
const catalogConfig = {
  url: 'https://waeiuyzteusfsajmzblj.supabase.co',
  key: 'sb_publishable_0zscL8lzkUbSgDHxs0lfIw_Pu6XVMJV',
};

const catalogEscape = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const catalogNormalise = value => String(value || '').trim().toLocaleLowerCase('it-IT');
const catalogStock = product => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.length ? variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock || 0)), 0) : Math.max(0, Number(product.stock || 0));
};
const categoryFromName = name => {
  const text = catalogNormalise(name);
  if (text.includes('bracciale')) return 'Bracciali';
  if (text.includes('orecchin')) return 'Orecchini';
  if (text.includes('collana') || text.includes('ciondolo') || text.includes('pendente')) return 'Collane e ciondoli';
  if (text.includes('rituale') || text.includes('smudge') || text.includes('candela') || text.includes('incenso')) return 'Rituali';
  return 'Cristalli e talismani';
};
const catalogProduct = id => products.find(product => String(product.id) === String(id));
const availableVariants = product => (Array.isArray(product?.variants) ? product.variants : []).filter(variant => Number(variant.stock || 0) > 0 && variant.available !== false);
const catalogImageUrl = value => /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';
const variantImage = (product, variantName, images) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variant = variants.find(item => catalogNormalise(item.name) === catalogNormalise(variantName));
  const configuredImage = catalogImageUrl(variant?.image);
  if (configuredImage) return configuredImage;
  // The legacy Eremita gallery is ordered by stone. Gold and silver use the
  // same stone photo, so it remains helpful before a custom photo is assigned.
  if (catalogNormalise(product?.name).includes('eremita')) {
    const stone = catalogNormalise(variantName).replace(/\b(oro|argento)\b/g, '').trim();
    const galleryIndex = {
      'labradorite': 1, 'selenite': 2, 'ametista': 3,
      'occhio di falco': 4, 'occhio di tigre': 5, 'malachite': 6,
      'quarzo': 7, 'avventurina': 8, 'acquamarina': 9,
      'turchese': 10, 'ossidiana dorata': 11,
    }[stone];
    if (galleryIndex && images[galleryIndex]) return images[galleryIndex];
  }
  return product.image || images[0] || '';
};

// app.js initially attaches the search field to the embedded catalogue.  Replace
// that listener so search results and product details always use Supabase IDs.
search.oninput = () => renderProducts();

renderFilters = () => {
  const categories = ['Tutti', ...new Set(products.map(product => product.category).filter(Boolean))];
  if (!categories.includes(activeCategory)) activeCategory = 'Tutti';
  filters.innerHTML = categories.map(category => `<button class="filter ${category === activeCategory ? 'active' : ''}" data-category="${catalogEscape(category)}">${catalogEscape(category)}</button>`).join('');
  filters.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { activeCategory = button.dataset.category; renderFilters(); renderProducts(); });
};

renderProducts = () => {
  const term = search.value.toLocaleLowerCase('it-IT').trim();
  const visible = products.filter(product => (activeCategory === 'Tutti' || product.category === activeCategory) && `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase('it-IT').includes(term));
  grid.innerHTML = visible.map(product => {
    const orderable = product.available && catalogStock(product) > 0;
    const picture = product.image || product.images?.[0] || '';
    return `<article class="product-card"><div class="product-image" data-detail="${catalogEscape(product.id)}">${picture ? `<img src="${catalogEscape(picture)}" alt="${catalogEscape(product.name)}" loading="lazy" />` : '<span aria-hidden="true">◇</span>'}${product.tag ? `<span class="tag">${catalogEscape(product.tag)}</span>` : ''}</div><div class="product-meta"><span class="product-category">${catalogEscape(product.category)}</span><h3 class="product-name" data-detail="${catalogEscape(product.id)}">${catalogEscape(product.name)}</h3><div class="product-bottom"><span><strong class="product-price">${formatPrice(product)}</strong><br><small class="availability">${orderable ? 'Disponibile' : 'Esaurito'}</small></span><button class="add" data-id="${catalogEscape(product.id)}" ${orderable ? '' : 'disabled'}>${product.variants?.length ? 'Scegli' : 'Aggiungi'}</button></div></div></article>`;
  }).join('') || '<p>Nessun prodotto trovato.</p>';
  // Delegation also works reliably on mobile after the product list is rebuilt.
  grid.onclick = event => {
    const target = event.target.closest('.add[data-id], [data-detail]');
    if (!target || !grid.contains(target)) return;
    const id = target.dataset.id || target.dataset.detail;
    if (!id) return;
    event.preventDefault();
    openDetail(id);
  };
};

openDetail = id => {
  const product = catalogProduct(id);
  if (!product) return;
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  const choices = availableVariants(product);
  const orderable = product.available && catalogStock(product) > 0;
  const initialVariant = choices[0]?.name || '';
  const initialImage = variantImage(product, initialVariant, images);
  const imageHtml = images.length ? `<img id="detail-main-image" src="${catalogEscape(images[0])}" alt="${catalogEscape(product.name)}" />` : '<span aria-hidden="true">◇</span>';
  const selector = Array.isArray(product.variants) && product.variants.length ? `<label>Seleziona la variante<select id="product-variant" class="variant-select">${choices.map(variant => `<option value="${catalogEscape(variant.name)}">${catalogEscape(variant.name)} — ${Number(variant.stock)} disponibili</option>`).join('')}</select></label>` : '';
  document.querySelector('#product-detail').innerHTML = `<div class="detail"><div><div class="detail-image">${imageHtml}</div>${images.length > 1 ? `<div class="detail-thumbnails">${images.map((image, index) => `<button class="detail-thumb ${index === 0 ? 'active' : ''}" data-image="${catalogEscape(image)}" aria-label="Foto ${index + 1}"><img src="${catalogEscape(image)}" alt="" /></button>`).join('')}</div>` : ''}</div><div class="detail-copy"><p class="eyebrow">${catalogEscape(product.category)}</p><h2>${catalogEscape(product.name)}</h2><p class="detail-description">${catalogEscape(product.description || '').replace(/\n/g, '<br>')}</p>${selector}<div class="detail-info"><span class="availability">${orderable ? 'Disponibile' : 'Esaurito'}</span><strong class="detail-price">${formatPrice(product)}</strong></div><button class="button" id="detail-add" ${orderable && (!product.variants?.length || choices.length) ? '' : 'disabled'}>Aggiungi alla borsa</button></div></div>`;
  const mainImage = document.querySelector('#detail-main-image');
  if (mainImage && initialImage) mainImage.src = initialImage;
  const dialog = document.querySelector('#product-dialog');
  dialog.showModal();
  const showDetailImage = image => {
    if (!mainImage || !image) return;
    mainImage.src = image;
    document.querySelectorAll('.detail-thumb').forEach(item => item.classList.toggle('active', item.dataset.image === image));
  };
  document.querySelectorAll('.detail-thumb').forEach(button => button.onclick = () => showDetailImage(button.dataset.image));
  document.querySelector('#product-variant')?.addEventListener('change', event => showDetailImage(variantImage(product, event.target.value, images)));
  document.querySelector('#detail-add').onclick = () => { addToCart(product.id, document.querySelector('#product-variant')?.value || ''); dialog.close(); };
};

async function loadCatalogFromSupabase() {
  try {
    const response = await fetch(`${catalogConfig.url}/rest/v1/rpc/get_public_catalog`, { method: 'POST', headers: { apikey: catalogConfig.key, Authorization: `Bearer ${catalogConfig.key}`, 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error(`Catalogo non disponibile (${response.status})`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Formato catalogo non valido');
    const fallback = [...products];
    const mapped = rows.map(row => {
      // A missing legacy id must never be converted to 0: otherwise every imported
      // product would inherit the image of the first old catalogue entry.
      const hasLegacyId = row.legacy_id !== null && row.legacy_id !== undefined && row.legacy_id !== '';
      const old = fallback.find(product => (hasLegacyId && Number(product.id) === Number(row.legacy_id)) || catalogNormalise(product.name) === catalogNormalise(row.name));
      const variants = Array.isArray(row.variants) ? row.variants : [];
      const image = row.image_url || old?.image || old?.images?.[0] || '';
      return { id: row.id, legacyId: row.legacy_id, name: row.name, description: row.description || old?.description || '', price: Number(row.price), stock: Number(row.stock || 0), variants, image, images: old?.images?.length ? old.images : (image ? [image] : []), category: old?.category || categoryFromName(row.name), tag: old?.tag || '', available: Boolean(row.available) };
    });
    products.splice(0, products.length, ...mapped);
    cart = cart.filter(item => catalogProduct(item.id));
    saveCart();
    renderFilters();
    renderProducts();
  } catch (error) {
    console.warn('Catalogo Supabase non ancora disponibile:', error.message);
  }
}

loadCatalogFromSupabase();
