# Il Gatto di Cruci

Catalogo statico, responsive e pronto per Render. Il carrello prepara una richiesta d'ordine su WhatsApp; non gestisce pagamenti online.

## Pubblicazione su Render

1. Crea un repository GitHub e carica questi file.
2. In Render scegli **New > Static Site** e collega il repository.
3. Imposta **Publish directory** su `.`; non serve alcun build command.

## Personalizzazioni

- Contatti: modifica il numero WhatsApp in `index.html` e `app.js`.
- Prodotti: modifica l'array `products` all'inizio di `app.js`.
- Colori e layout: modifica le variabili CSS all'inizio di `styles.css`.

Le immagini attuali provengono dal catalogo Shop by Link. Prima di chiudere il vecchio servizio è consigliato scaricarle e sostituire gli URL con file nel repository, così il nuovo sito resta completamente indipendente.
