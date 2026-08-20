# Email automatiche degli ordini

Il checkout salva sempre l'ordine. Quando sono configurati i quattro segreti qui sotto, invia anche una ricevuta al cliente e una notifica al negozio tramite Cloudflare Email Sending.

1. In Cloudflare apri **Compute & AI → Email Service → Email Sending** e seleziona **Onboard domain**.
2. Scegli un dominio che possiedi, ad esempio `il-gatto-di-cruci.it`. Non usare `onrender.com`.
3. Completa i record DNS SPF e DKIM proposti da Cloudflare.
4. Crea un API Token Cloudflare limitato all'account, con il solo permesso **Email Sending: Edit**.
5. In Supabase: **Edge Functions → Secrets**, aggiungi questi valori (mai nel codice):

| Nome | Valore |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID di Cloudflare |
| `CLOUDFLARE_EMAIL_API_TOKEN` | Token con solo permesso Email Sending |
| `CLOUDFLARE_EMAIL_FROM` | Es. `ordini@il-gatto-di-cruci.it` |
| `ORDER_NOTIFICATION_EMAIL` | La tua email che riceve i nuovi ordini |

6. Pubblica nuovamente la Edge Function `create-order` dal file `supabase/functions/create-order/index.ts`.
7. Fai un ordine di prova a un indirizzo email che controlli.

Se i segreti non sono presenti o Cloudflare rifiuta l'invio, l'ordine viene comunque creato: il checkout non viene bloccato.
