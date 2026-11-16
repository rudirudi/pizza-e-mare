'use strict';

const crypto = require('node:crypto');
const { catalog } = require('../lib/catalog');

const MAX_BODY_BYTES = 32 * 1024;
const MAX_ITEM_QUANTITY = 20;
const MAX_TOTAL_QUANTITY = 50;
const MAX_TOTAL_CENTS = 50000;

class OrderValidationError extends Error {}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function requestOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return null;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto === 'http' ? 'http' : 'https'}://${host}`;
}

function sameOrigin(req, origin) {
  const supplied = String(req.headers.origin || '').trim();
  return !supplied || supplied === origin;
}

function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function productImagePath(name) {
  if (/acqua|bibite|birr|lattine/i.test(name)) return 'bevande.jpg';
  if (/babà|caprese|crostata|nutella|zuppa inglese/i.test(name)) return 'dolci.jpg';
  if (/alga fritta|arancini|baccalà|fiori di zucca|fritto|mozzarelline|olive ascolane|patatine|supplì/i.test(name)) {
    return 'fritture.jpg';
  }
  if (/califfo|ciringhito|mare|nicola|nonno|piediluco|polpo|totonno/i.test(name)) return 'mare.jpg';
  if (/base senza glutine|burrata|formaggi$|mozzarella|ortaggi|pesce|salumi|tartufo|tonno e alici/i.test(name)) {
    return 'extra.jpg';
  }
  return 'speciali.jpg';
}

function productImageUrl(name, origin) {
  return `${origin}/assets/menu-backgrounds/${productImagePath(name)}`;
}

function parseBody(body) {
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8'));
  if (typeof body === 'string') return JSON.parse(body);
  return body && typeof body === 'object' ? body : {};
}

function buildOrder(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 100) {
    throw new OrderValidationError('Il carrello non è valido.');
  }

  const quantities = new Map();
  for (const raw of rawItems) {
    const name = clean(raw && raw.name, 120);
    const quantity = Number(raw && raw.qty);
    if (!catalog[name] || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new OrderValidationError('Uno dei prodotti non è valido.');
    }
    quantities.set(name, (quantities.get(name) || 0) + quantity);
  }

  const items = [];
  let totalQuantity = 0;
  let totalCents = 0;
  for (const [name, quantity] of quantities) {
    if (quantity > MAX_ITEM_QUANTITY) throw new OrderValidationError('Quantità massima superata.');
    const product = catalog[name];
    totalQuantity += quantity;
    totalCents += product.unitAmount * quantity;
    items.push({ name, quantity, unitAmount: product.unitAmount });
  }

  if (totalQuantity > MAX_TOTAL_QUANTITY || totalCents < 50 || totalCents > MAX_TOTAL_CENTS) {
    throw new OrderValidationError('Il totale del carrello non è valido.');
  }
  return { items, totalCents };
}

module.exports = async function createCheckoutSession(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Metodo non consentito.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^sk_(test|live)_/.test(secretKey)) {
    return sendJson(res, 503, { error: 'Pagamento temporaneamente non disponibile.' });
  }

  const origin = requestOrigin(req);
  if (!origin || !sameOrigin(req, origin)) return sendJson(res, 403, { error: 'Origine della richiesta non valida.' });

  try {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_BODY_BYTES) return sendJson(res, 413, { error: 'Richiesta troppo grande.' });

    const body = parseBody(req.body);
    const name = clean(body.name, 80);
    const phone = clean(body.phone, 30);
    const pickupTime = clean(body.pickupTime, 12);
    const notes = clean(body.notes, 300);
    if (name.length < 2) return sendJson(res, 400, { error: 'Inserisci il nome per il ritiro.' });
    if (phone.replace(/\D/g, '').length < 6) return sendJson(res, 400, { error: 'Inserisci un numero di telefono valido.' });
    if (pickupTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)) {
      return sendJson(res, 400, { error: 'L’orario di ritiro non è valido.' });
    }

    const order = buildOrder(body.items);
    const orderId = crypto.randomUUID();
    const summary = order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ').slice(0, 480);
    const params = new URLSearchParams({
      mode: 'payment',
      locale: 'it',
      submit_type: 'pay',
      client_reference_id: orderId,
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      'custom_text[submit][message]': 'Ordine da asporto · ritiro in pizzeria. Pagamento protetto da Stripe.',
      'metadata[order_id]': orderId,
      'metadata[customer_name]': name,
      'metadata[phone]': phone,
      'metadata[pickup_time]': pickupTime || 'appena pronto',
      'metadata[notes]': notes,
      'metadata[order_summary]': summary,
      'payment_intent_data[description]': `Ordine Pizza & Mare ${orderId.slice(0, 8)}`,
      'payment_intent_data[metadata][order_id]': orderId
    });

    order.items.forEach((item, index) => {
      params.append(`line_items[${index}][quantity]`, String(item.quantity));
      params.append(`line_items[${index}][price_data][currency]`, 'eur');
      params.append(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
      params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
      params.append(`line_items[${index}][price_data][product_data][description]`, 'Da asporto · ritiro in pizzeria');
      params.append(`line_items[${index}][price_data][product_data][images][0]`, productImageUrl(item.name, origin));
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': orderId
      },
      body: params.toString()
    });
    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok || !stripeData.url) {
      console.error('Stripe Checkout creation failed', stripeResponse.status, stripeData && stripeData.error && stripeData.error.type);
      return sendJson(res, 502, { error: 'Stripe non ha potuto avviare il pagamento. Riprova.' });
    }

    return sendJson(res, 200, { url: stripeData.url, orderId, amountTotal: order.totalCents });
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(res, 400, { error: 'Richiesta non valida.' });
    if (error instanceof OrderValidationError) return sendJson(res, 400, { error: error.message });
    console.error('Stripe Checkout request failed', error && error.name);
    return sendJson(res, 502, { error: 'Impossibile avviare il pagamento. Riprova.' });
  }
};
