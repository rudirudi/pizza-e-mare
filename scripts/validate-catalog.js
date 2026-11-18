'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { catalog } = require('../lib/catalog');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const buttonPattern = /<button[^>]+value="([^"|]+)\|(\d+\.\d{2})"[^>]*>/g;
const displayed = new Map();
const errors = [];

for (const match of html.matchAll(buttonPattern)) {
  const name = match[1];
  const cents = Math.round(Number(match[2]) * 100);
  if (displayed.has(name) && displayed.get(name) !== cents) {
    errors.push(`Prezzi HTML diversi per ${name}: ${displayed.get(name)} e ${cents}`);
  }
  displayed.set(name, cents);
  if (!catalog[name]) errors.push(`Prodotto HTML assente dal catalogo: ${name}`);
  else if (catalog[name].unitAmount !== cents) {
    errors.push(`Prezzo diverso per ${name}: HTML ${cents}, catalogo ${catalog[name].unitAmount}`);
  }
}

for (const [name, product] of Object.entries(catalog)) {
  if (!displayed.has(name)) errors.push(`Prodotto del catalogo non ordinabile nel sito: ${name}`);
  else if (displayed.get(name) !== product.unitAmount) {
    errors.push(`Prezzo diverso per ${name}: HTML ${displayed.get(name)}, catalogo ${product.unitAmount}`);
  }
}

for (const required of ['Via Antonelli 2B', '05100 Terni (TR)', '352 22 70 825']) {
  if (!html.includes(required)) errors.push(`Informazione mancante nel sito: ${required}`);
}

if (/\[(?:INDIRIZZO|GIORNI|GIORNO|P\. IVA|SIGNIFICATO)/.test(html)) {
  errors.push('Sono ancora presenti segnaposto editoriali nel sito.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Catalogo verificato: ${displayed.size} prodotti ordinabili, prezzi HTML e Stripe coerenti.`);
}
