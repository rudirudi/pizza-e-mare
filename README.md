# Pizza & Mare

Sito statico della pizzeria d'asporto Pizza & Mare.

- `public/index.html`: pagina unica con menù completo, offerte e carrello
- `public/assets/`: immagini
- `lib/catalog.js`: catalogo e prezzi autorizzati dal server per Stripe Checkout
- `api/`: creazione e verifica delle sessioni Stripe Checkout e webhook
- `public/robots.txt` e `public/sitemap.xml`: indicizzazione e scoperta della pagina
- `vercel.json`: configurazione Vercel (nessuna build, cartella `public`)

Il pagamento online usa Stripe Checkout e richiede `STRIPE_SECRET_KEY` nelle variabili d'ambiente Vercel. Per il webhook serve anche `STRIPE_WEBHOOK_SECRET`.

Il sito è indicizzabile sull'URL canonico `https://pizza-e-mare.vercel.app/`. Quando sarà collegato il dominio definitivo, aggiornare in `public/index.html`, `public/robots.txt` e `public/sitemap.xml` l'URL canonico e gli URL dei dati strutturati/social.
