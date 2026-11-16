'use strict';

const crypto = require('node:crypto');

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validSignature(payload, header, secret) {
  const parts = String(header || '').split(',');
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload.toString('utf8')}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const signatureBuffer = Buffer.from(signature, 'hex');
    return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

module.exports = async function stripeWebhook(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method not allowed');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.statusCode = 503;
    return res.end('Webhook not configured');
  }

  try {
    const payload = await rawBody(req);
    if (!validSignature(payload, req.headers['stripe-signature'], webhookSecret)) {
      res.statusCode = 400;
      return res.end('Invalid signature');
    }

    const event = JSON.parse(payload.toString('utf8'));
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data && event.data.object;
      console.log('Stripe order paid', session && session.id, session && session.client_reference_id);
    }
    res.statusCode = 200;
    return res.end('ok');
  } catch (error) {
    console.error('Stripe webhook failed', error && error.name);
    res.statusCode = 400;
    return res.end('Invalid payload');
  }
};

module.exports.config = { api: { bodyParser: false } };
