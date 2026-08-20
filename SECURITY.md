# Sicurezza amministratore

Il pannello `/admin/` ammette soltanto l'email amministratore configurata nel file `admin/admin.js`. Le tabelle Supabase hanno Row Level Security (RLS): un account non autorizzato non può leggere né modificare i dati del negozio.

Azioni obbligatorie in Supabase:

1. Authentication → Providers → Email: disabilita **Allow new users to sign up**.
2. Authentication → Users: conserva solo l'utente amministratore autorizzato.
3. Authentication → URL Configuration: mantieni solo il dominio Render in Site URL e Redirect URLs.
4. Revoca la secret key esposta in precedenza. Non usarla mai nel browser o in GitHub.
5. Attiva MFA nel tuo account Supabase.
