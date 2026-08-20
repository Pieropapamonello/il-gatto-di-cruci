const eremitaVariants = ['Labradorite Oro', 'Labradorite Argento', 'Selenite Oro', 'Selenite Argento', 'Ametista Oro', 'Ametista Argento', 'Occhio di Falco Oro', 'Occhio di Falco Argento', 'Occhio di Tigre Oro', 'Occhio di Tigre Argento', 'Malachite Oro', 'Malachite Argento', 'Quarzo Oro', 'Quarzo Argento', 'Avventurina Oro', 'Avventurina Argento', 'Acquamarina Oro', 'Acquamarina Argento', 'Turchese Oro', 'Turchese Argento', 'Ossidiana Dorata Oro', 'Ossidiana Dorata Argento'];

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-detail]'); const card = trigger?.closest('.product-card');
  if (!card || !card.querySelector('.product-name')?.textContent.includes('Eremita')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const dialog = document.querySelector('#product-dialog'); const detail = document.querySelector('#product-detail');
  const image = card.querySelector('img').src; const id = Number(card.querySelector('.add').dataset.id);
  detail.innerHTML = `<div class="detail"><div class="detail-image"><img src="${image}" alt="L’Eremita – Collane Essenziali"></div><div class="detail-copy"><p class="eyebrow">Collane e ciondoli</p><h2>L’Eremita – Collane Essenziali</h2><p class="detail-description">Scegli la pietra e la finitura della catena prima di aggiungere l’articolo alla borsa.</p><label>Seleziona la variante<select id="eremita-variant" class="variant-select">${eremitaVariants.map(choice => `<option>${choice}</option>`).join('')}</select></label><div class="detail-info"><span class="availability">Disponibile</span><strong class="detail-price">8,90 €</strong></div><button class="button" id="eremita-add">Aggiungi alla borsa</button></div></div>`;
  dialog.showModal();
  document.querySelector('#eremita-add').onclick = () => { addToCart(id, document.querySelector('#eremita-variant').value); dialog.close(); };
}, true);
