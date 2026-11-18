const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('public/index.html');
const robots = read('public/robots.txt');
const sitemap = read('public/sitemap.xml');
const manifest = JSON.parse(read('public/site.webmanifest'));
const vercel = JSON.parse(read('vercel.json'));
const canonical = 'https://pizza-e-mare.vercel.app/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/<html lang="it-IT">/.test(html), 'Lingua pagina non impostata su it-IT.');
assert((html.match(/<h1\b/g) || []).length === 1, 'La pagina deve avere un solo H1.');
assert(/<title>Pizza da asporto a Terni \| Pizza &amp; Mare<\/title>/.test(html), 'Titolo SEO inatteso.');
assert(/<meta name="description" content="[^"]+">/.test(html), 'Meta description mancante.');
assert(/<meta name="robots" content="index,follow,[^"]+">/.test(html), 'Direttiva robots indicizzabile mancante.');
assert(!/<meta name="robots"[^>]+noindex/i.test(html), 'La home contiene noindex.');
assert(html.includes(`<link rel="canonical" href="${canonical}">`), 'Canonical mancante o errato.');
assert(html.includes(`<meta property="og:url" content="${canonical}">`), 'URL Open Graph mancante o errato.');
assert(html.includes('<meta name="twitter:card" content="summary_large_image">'), 'Twitter Card mancante.');
assert(/<address\b/.test(html), 'Indirizzo semantico mancante.');
assert(html.includes('Via Antonelli 2B') && html.includes('05100 Terni'), 'Indirizzo locale incompleto.');
assert(html.includes('+393522270825') && html.includes('+39 352 227 0825'), 'Telefono non coerente.');

const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert(jsonLdBlocks.length > 0, 'Dati strutturati JSON-LD mancanti.');
const jsonLd = JSON.parse(jsonLdBlocks[0][1]);
assert(Array.isArray(jsonLd['@graph']), 'JSON-LD privo di @graph.');
const restaurant = jsonLd['@graph'].find((item) => item['@type'] === 'Restaurant');
assert(restaurant, 'Entità Restaurant mancante.');
assert(restaurant.name === 'Pizza & Mare', 'Nome Restaurant inatteso.');
assert(restaurant.url === canonical, 'URL Restaurant non canonico.');
assert(restaurant.address && restaurant.address.addressLocality === 'Terni', 'Località Restaurant mancante.');
assert(restaurant.address.postalCode === '05100', 'CAP Restaurant inatteso.');

assert(robots.includes('User-agent: *') && robots.includes('Allow: /'), 'robots.txt non consente il crawling.');
assert(robots.includes(`${canonical}sitemap.xml`), 'Sitemap non dichiarata in robots.txt.');
assert(sitemap.includes(`<loc>${canonical}</loc>`), 'URL canonico mancante nella sitemap.');
assert(manifest.lang === 'it-IT' && manifest.start_url === '/', 'Manifest incompleto.');

const globalNoindex = (vercel.headers || []).some((rule) =>
  rule.source === '/(.*)' && (rule.headers || []).some((header) =>
    header.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(header.value)
  )
);
assert(!globalNoindex, 'Vercel applica ancora noindex a tutto il sito.');

console.log('SEO validation passed: indexability, metadata, local schema, robots and sitemap are coherent.');
