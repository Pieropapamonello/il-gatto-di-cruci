# Il Gatto di Cruci

Catalogo statico, responsive e pronto per Render. Il carrello prepara una richiesta d'ordine su WhatsApp; non gestisce pagamenti online.

## Pubblicazione su Render

1. In Render scegli **New > Blueprint** e collega il repository.
2. Render rileva automaticamente `render.yaml`: seleziona il branch `main` e premi **Deploy Blueprint**.
3. Da quel momento ogni push su `main` pubblica automaticamente la nuova versione del sito.

## Personalizzazioni

- Contatti: modifica il numero WhatsApp in `index.html` e `app.js`.
- Prodotti: modifica l'array `products` all'inizio di `app.js`.
- Colori e layout: modifica le variabili CSS all'inizio di `styles.css`.

Le immagini attuali provengono dal catalogo Shop by Link. Prima di chiudere il vecchio servizio è consigliato scaricarle e sostituire gli URL con file nel repository, così il nuovo sito resta completamente indipendente.

## Pannello amministratore

L'area amministratore è disponibile in `/admin/`. Prima del primo accesso, apri il **SQL Editor** di Supabase, incolla ed esegui [`supabase/schema.sql`](supabase/schema.sql). Poi apri `/admin/` e crea l'account con email e password. Le policy RLS fanno sì che ogni account veda e modifichi soltanto i propri dati.
