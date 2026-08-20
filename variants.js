const productVariants = {
  'Orecchini Singoli (vari)': ['Ossidiana Oro', 'Fluorite', 'Avventurina e Quarzo Rosa'],
  'Pendolo in pietra naturale (varie)': ['Rubino con zoisite', 'Quarzo rosa', 'Lepidolite', 'Angelite'],
  'Pendenti a Goccia Vari (catenina acciaio inclusa)': ['Quarzo rosa bagno argento', 'Ametista', 'Ametista bagno argento', 'Quarzo tormalinato bagno argento'],
  'Ciondoli Tormalina Varie (catenina acciaio inclusa)': ['Punta', 'Cabochon'],
  'Bracciali Chips Piete Naturali (vari) con Elastico': ['Giada', 'Lepidolite', 'Ossidiana', 'Ametista', 'Amazonite'],
  'Anelli Regolabili Vari': ['Turchese', 'Ossidiana', 'Citrino', 'Labradorite'],
};

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-detail]'); const card = trigger?.closest('.product-card');
  const title = card?.querySelector('.product-name')?.textContent.trim(); const choices = productVariants[title];
  if (!choices) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const dialog = document.querySelector('#product-dialog'); const detail = document.querySelector('#product-detail');
  const image = card.querySelector('img').src; const id = Number(card.querySelector('.add').dataset.id); const price = card.querySelector('.product-price').textContent;
  detail.innerHTML = `<div class="detail"><div class="detail-image"><img src="${image}" alt="${title}"></div><div class="detail-copy"><p class="eyebrow">Varianti disponibili</p><h2>${title}</h2><p class="detail-description">Scegli la pietra o la finitura che preferisci prima di aggiungere l’articolo alla borsa.</p><label>Variante<select id="variant-choice" class="variant-select">${choices.map(choice => `<option>${choice}</option>`).join('')}</select></label><div class="detail-info"><span class="availability">Disponibile</span><strong class="detail-price">${price}</strong></div><button class="button" id="variant-add">Aggiungi alla borsa</button></div></div>`;
  dialog.showModal();
  document.querySelector('#variant-add').onclick = () => { addToCart(id, document.querySelector('#variant-choice').value); dialog.close(); };
}, true);
