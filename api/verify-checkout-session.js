'use strict';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = async function verifyCheckoutSession(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Metodo non consentito.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^sk_(test|live)_/.test(secretKey)) {
    return sendJson(res, 503, { error: 'Verifica pagamento temporaneamente non disponibile.' });
  }

  const sessionId = String((req.query && req.query.session_id) || '').trim();
  if (!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId) || sessionId.length > 255) {
    return sendJson(res, 400, { error: 'Sessione di pagamento non valida.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('expand[]', 'line_items');
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${params}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok) return sendJson(res, 404, { error: 'Pagamento non trovato.' });

    const paid = session.status === 'complete' && session.payment_status === 'paid';
    return sendJson(res, paid ? 200 : 409, {
      paid,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      orderId: session.metadata && session.metadata.order_id,
      customerName: session.metadata && session.metadata.customer_name,
      pickupTime: session.metadata && session.metadata.pickup_time
    });
  } catch (error) {
    console.error('Stripe Checkout verification failed', error && error.name);
    return sendJson(res, 502, { error: 'Non è stato possibile verificare il pagamento.' });
  }
};
