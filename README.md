# Pizza & Mare

Sito statico della pizzeria d'asporto Pizza & Mare.

- `public/index.html`: pagina unica con menù completo, offerte e carrello
- `public/assets/`: immagini
- `lib/catalog.js`: catalogo e prezzi autorizzati dal server per Stripe Checkout
- `api/`: creazione e verifica delle sessioni Stripe Checkout e webhook
- `vercel.json`: configurazione Vercel (nessuna build, cartella `public`)

Il pagamento online usa Stripe Checkout e richiede `STRIPE_SECRET_KEY` nelle variabili d'ambiente Vercel. Per il webhook serve anche `STRIPE_WEBHOOK_SECRET`.

L'intestazione `X-Robots-Tag: noindex` va rimossa al passaggio sul dominio definitivo.
