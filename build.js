#!/usr/bin/env node
/*
  Upsize website build (no dependencies; Netlify runs: node build.js)

  src/index.html            Homepage, and the master layout (head styles, header, contact, footer, scripts)
  src/_pages/*.html         Inner pages: content only, first line is  <!--meta {...json...} -->
  content/news/*.md         Blog posts and press releases written in the CMS (/admin)
  dist/                     Finished website that Netlify publishes
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const NEWS = path.join(ROOT, 'content', 'news');
const SITE = 'https://www.upsizeproperty.com';
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rm = p => fs.rmSync(p, { recursive: true, force: true });
function copyDir(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(e.name)) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}
const write = (rel, data) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('Marker not found: ' + a + ' / ' + b); return s.slice(i, j); };
const slugify = s => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/* asset paths: pages one folder deep (news/x.html) need ../ in front of images/ and fonts/ */
const relAssets = (html, depth) => depth ? html.replace(/(["'(])(images|fonts)\//g, `$1${'../'.repeat(depth)}$2/`) : html;

/* ---------- tiny front matter + markdown ---------- */
function frontMatter(txt) {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: txt };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!k) continue;
    let v = k[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).replace(/\\"/g, '"');
    if (v === 'true') v = true; else if (v === 'false') v = false;
    data[k[1]] = v;
  }
  return { data, body: m[2] };
}
function inline(t) {
  return esc(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, s) => `<img src="${s}" alt="${a}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, h) => `<a href="${h}"${/^https?:/.test(h) && !h.includes('upsizeproperty.com') ? ' target="_blank" rel="noopener"' : ''}>${a}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
function markdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = []; let para = [], list = null;
  const flushP = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { flushP(); flushL(); const n = Math.max(2, m[1].length); out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if ((m = l.match(/^#\s+(.*)$/))) { flushP(); flushL(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { flushP(); flushL(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushL(); para.push(l.trim());
  }
  flushP(); flushL();
  return out.join('\n');
}

/* ---------- read the master layout from the homepage ---------- */
rm(OUT);
copyDir(SRC, OUT, ['_pages', 'index.html']);
let home = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

const style = between(home, '<style>', '</style>') + '</style>';
const businessLd = home.match(/<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema.org",\s*"@type": \[[\s\S]*?<\/script>/)[0];
const headerHtml = between(home, '<header class="site-header">', '</header>') + '</header>';
const contactToMainEnd = between(home, '  <!-- ================= 7. CONTACT', '</main>');
const findUsToMainEnd = between(home, '  <!-- ================= FIND US', '</main>');
const afterMain = home.slice(home.indexOf('</main>') + '</main>'.length);   // footer, bubble, scripts

function navFor(key) {
  let h = headerHtml;
  if (key) h = h.replace(`data-nav="${key}"`, `data-nav="${key}" aria-current="page"`);
  if (['social-housing', 'commercial', 'residential'].includes(key)) h = h.replace('<div class="nav-dd">', '<div class="nav-dd current">');
  if (key && /^roof|leadwork|flat-roofing|emergency-roof|storm-damage/.test(key)) h = h.replace('<div class="nav-dd nav-dd-roof">', '<div class="nav-dd nav-dd-roof current">');
  if (['about', 'community', 'careers'].includes(key)) h = h.replace('<div class="nav-dd nav-dd-co">', '<div class="nav-dd nav-dd-co current">');
  return h;
}
function headFor({ title, description, url, ogImage, ldExtra = [], depth = 0, ogType = 'website', extraHead = '', noindex = false }) {
  const img = ogImage ? `${SITE}/${ogImage.replace(/^\/+/, '')}` : `${SITE}/images/og-upsize-roofing-contractor-spalding.jpg`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>document.documentElement.className+=' js'</script>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${url}">
  <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
  <meta name="theme-color" content="#00103A">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Upsize Property Renovation Ltd">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}${url}">
  <meta property="og:image" content="${img}">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="application/rss+xml" title="Upsize news and press releases" href="${SITE}/news/feed.xml">
  <link rel="icon" href="${'../'.repeat(depth)}images/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${'../'.repeat(depth)}images/apple-touch-icon.png">
  <link rel="preload" as="font" href="${'../'.repeat(depth)}fonts/lexend-latin.woff" type="font/woff" crossorigin>
  <link rel="preload" as="font" href="${'../'.repeat(depth)}fonts/source-sans-3-latin.woff" type="font/woff" crossorigin>
${extraHead}  ${businessLd}
${ldExtra.map(o => `  <script type="application/ld+json">\n${JSON.stringify(o, null, 1)}\n  </script>`).join('\n')}
  ${style}
</head>

<body>
<a class="skip" href="#main">Skip to content</a>
`;
}
const WA = 'https://wa.me/447802373253?text=Hi%20Upsize%2C%20I%27d%20like%20a%20free%20quote.';
function ctaBand(meta, withContact) {
  if (meta.noindex || meta.cta === false) return '';
  const quote = withContact ? '#contact' : '/contact';
  const seq = (meta.prev || meta.next) ? `
      <nav class="cta-seq" aria-label="${meta.seqLabel || 'Related pages'}">${meta.prev ? `<a class="seq-prev" href="${meta.prev[0]}"><small>Previous</small>${meta.prev[1]}</a>` : '<span></span>'}${meta.next ? `<a class="seq-next" href="${meta.next[0]}"><small>Next</small>${meta.next[1]}</a>` : ''}</nav>` : '';
  return `  <section class="cta-band" aria-label="Contact options">
    <div class="wrap">
      <div class="cta-main">
        <div><strong>${meta.ctaTitle || 'Talk to us today: free advice, no obligation'}</strong><span>Mon–Fri 7:30–19:00 · Sat 8:00–16:00 · Peterborough and 40 miles around</span></div>
        <div class="cta-btns"><a class="btn btn--lime" href="tel:+448001939030">Call free 0800 193 9030</a><a class="btn btn--wa" href="${WA}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn btn--ghost" href="${quote}">Get a free quote</a></div>
      </div>${seq}
    </div>
  </section>
`;
}
function page({ meta, mainHtml, depth = 0, withContact = true }) {
  const html = headFor({ ...meta, depth }) + navFor(meta.nav) + '\n\n<main id="main">\n' + mainHtml + '\n' + ctaBand(meta, withContact) + (withContact ? contactToMainEnd : findUsToMainEnd) + '</main>' + afterMain;
  return relAssets(html, depth);
}
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
const faqLd = qs => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs });

/* ---------- news posts ---------- */
const posts = (fs.existsSync(NEWS) ? fs.readdirSync(NEWS) : []).filter(f => f.endsWith('.md')).map(f => {
  const { data, body } = frontMatter(fs.readFileSync(path.join(NEWS, f), 'utf8'));
  const date = String(data.date || '').slice(0, 10) || TODAY;
  const slug = data.slug || slugify(f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const cat = /press/i.test(data.category || '') ? 'Press release' : 'Blog';
  return { ...data, date, slug, cat, body, url: `/news/${slug}`, image: data.image ? String(data.image).replace(/^\/+/, '') : '' };
}).filter(p => p.title && p.draft !== true && p.date <= TODAY).sort((a, b) => b.date.localeCompare(a.date));

const card = (p, depth) => `      <a class="news-card reveal" href="${p.url}" data-cat="${p.cat === 'Press release' ? 'press' : 'blog'}">
        ${p.image ? `<div class="nc-img"><img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" loading="lazy" width="800" height="500"></div>` : ''}
        <div class="nc-body">
          <span class="nc-meta">${p.cat} · <time datetime="${p.date}">${fmtDate(p.date)}</time></span>
          <h3>${esc(p.title)}</h3>
          ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
          <span class="go">Read more →</span>
        </div>
      </a>
`;

for (const p of posts) {
  const isPress = p.cat === 'Press release';
  const articleLd = {
    '@context': 'https://schema.org', '@type': isPress ? 'NewsArticle' : 'BlogPosting',
    headline: p.title, description: p.summary || '', datePublished: p.date, dateModified: p.updated || p.date,
    author: { '@type': 'Organization', name: 'Upsize Property Renovation Ltd', url: SITE + '/' },
    publisher: { '@id': SITE + '/#business' }, mainEntityOfPage: SITE + p.url, inLanguage: 'en-GB',
    ...(p.image ? { image: SITE + '/' + p.image } : {})
  };
  const main = `  <section class="hero page-hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li><a href="/news/">News</a></li><li aria-current="page">${p.cat}</li></ol>
      <span class="eyebrow">${p.cat}</span>
      <h1>${esc(p.title)}</h1>
      <div class="article-meta"><time datetime="${p.date}">${fmtDate(p.date)}</time><span>Upsize Property Renovation Ltd</span></div>
    </div>
  </section>
  <section class="section">
    <article class="wrap article">
      ${p.image ? `<figure class="article-hero-img"><img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" width="1200" height="750"></figure>` : ''}
      ${p.summary ? `<p class="lead">${esc(p.summary)}</p>` : ''}
      <div class="prose">
${markdown(p.body)}
      </div>
      ${isPress ? `<div class="press-contact"><strong>Media enquiries:</strong> <a href="mailto:alex@upsizeproperty.com">alex@upsizeproperty.com</a> · 0800 193 9030<br>Upsize Property Renovation Ltd is a kitchen, bathroom, wet room and roofing contractor based in Peterborough, working with social housing, commercial and residential clients across Cambridgeshire, Lincolnshire and the East Midlands.</div>` : ''}
      <div class="article-cta"><div><strong>Need a hand with your project?</strong>Free quotes, reply within one working day.</div><a class="btn btn--lime" href="#contact">Request a free quote</a></div>
    </article>
  </section>
`;
  write(`news/${p.slug}.html`, page({
    depth: 1, mainHtml: main,
    meta: { title: p.seo_title || (p.title.length > 52 ? p.title : `${p.title} | Upsize`), description: p.seo_description || p.summary || p.title, url: p.url, ogImage: p.image, ogType: 'article', nav: 'news',
      ldExtra: [articleLd, crumbsLd([['Home', '/'], ['News', '/news/'], [p.title, p.url]])] }
  }));
}

const featured = posts.find(p => p.cat === 'Press release') || posts[0];
const others = posts.filter(p => p !== featured);
const featureCard = (p, wide) => `        <a class="nf-main${wide ? ' nf-wide' : ''} reveal" href="${p.url}">
          ${p.image ? `<div class="nf-img"><img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" width="1200" height="675" loading="lazy"></div>` : ''}
          <div class="nf-body">
            <span class="nf-label">${p.cat === 'Press release' ? '<b>Press release</b>' : '<b>Featured</b> ' + p.cat} · <time datetime="${p.date}">${fmtDate(p.date)}</time></span>
            <h3>${esc(p.title)}</h3>
            ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
            <span class="go">${p.cat === 'Press release' ? 'Read the press release' : 'Read more'} →</span>
          </div>
        </a>
`;
const listItem = p => `          <li><a href="${p.url}"><span class="nf-label">${p.cat} · <time datetime="${p.date}">${fmtDate(p.date)}</time></span><strong>${esc(p.title)}</strong>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</a></li>
`;
/* news index */
const newsMain = `  <section class="hero page-hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li aria-current="page">News</li></ol>
      <span class="eyebrow">News &amp; press</span>
      <h1>News, guides and press releases</h1>
      <p class="lead">Roofing and renovation guides for homeowners, and company news from Upsize Property Renovation in Peterborough.</p>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="news-head">
        <div class="sec-top"><h2>Latest from Upsize</h2></div>
        <div class="filters" role="group" aria-label="Filter news">
          <button type="button" aria-pressed="true" data-nf="all">All</button>
          <button type="button" aria-pressed="false" data-nf="blog">Guides &amp; blog</button>
          <button type="button" aria-pressed="false" data-nf="press">Press releases</button>
        </div>
      </div>
      ${featured ? featureCard(featured, true) : ''}
      ${others.length ? `<div class="news-grid" id="news-grid" style="margin-top:32px">\n${others.map(p => card(p)).join('')}      </div>` : ''}
      ${posts.length ? '' : '<p class="news-empty">News and press releases are coming soon.</p>'}
    </div>
  </section>
  <script>
  document.querySelectorAll('[data-nf]').forEach(function(b){b.addEventListener('click',function(){
    var f=b.dataset.nf;document.querySelectorAll('[data-nf]').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
    document.querySelectorAll('#news-grid .news-card').forEach(function(c){c.hidden=!(f==='all'||c.dataset.cat===f);});
  });});
  </script>
`;
write('news/index.html', page({ depth: 1, mainHtml: newsMain, meta: { title: 'News, Guides & Press Releases | Upsize Property Renovation', description: 'Roofing and renovation guides for homeowners, and company news and press releases from Upsize Property Renovation in Peterborough.', url: '/news/', nav: 'news',
  ldExtra: [crumbsLd([['Home', '/'], ['News', '/news/']]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Upsize news and press releases', url: SITE + '/news/',
    hasPart: posts.map(p => ({ '@type': p.cat === 'Press release' ? 'NewsArticle' : 'BlogPosting', headline: p.title, url: SITE + p.url, datePublished: p.date })) }] } }));

/* ---------- inner pages ---------- */
const pagesBuilt = [];
const pdir = path.join(SRC, '_pages');
for (const f of fs.existsSync(pdir) ? fs.readdirSync(pdir).filter(f => f.endsWith('.html')) : []) {
  const raw = fs.readFileSync(path.join(pdir, f), 'utf8');
  const m = raw.match(/^<!--meta\s+([\s\S]*?)\s*-->\n?/);
  if (!m) throw new Error('Missing <!--meta {...} --> in ' + f);
  const meta = JSON.parse(m[1]);
  const ld = [];
  if (meta.breadcrumb) ld.push(crumbsLd(meta.breadcrumb));
  if (meta.service) ld.push({ '@context': 'https://schema.org', '@type': 'Service', provider: { '@id': SITE + '/#business' }, url: SITE + meta.path,
    areaServed: ['Peterborough', 'Werrington', 'Bretton', 'Orton', 'Stanground', 'Fletton', 'Castor', 'Market Deeping', 'Eye', 'Glinton', 'Crowland', 'Oundle', 'Wansford', 'Kings Cliffe', 'Bourne', 'March', 'Chatteris', 'Stamford', 'Ketton', 'Spalding', 'Pinchbeck', 'Holbeach', 'Long Sutton', 'Wisbech', 'Upwell', 'Huntingdon', 'Godmanchester', 'St Neots', 'Corby', 'Kettering', 'Oakham', 'Grantham', 'Boston', "King's Lynn", 'Cambridge'], ...meta.service });
  if (meta.faq) ld.push(faqLd(meta.faq));
  const outRel = meta.path.replace(/^\//, '') + '.html';
  const depth = outRel.split('/').length - 1;
  write(outRel, page({ depth, mainHtml: raw.slice(m[0].length), withContact: meta.contact !== false, meta: { ...meta, url: meta.path, ldExtra: ld } }));
  if (!meta.noindex) pagesBuilt.push(meta.path);
}

/* ---------- homepage: latest news block ---------- */
const newsBlock = featured ? `  <!-- NEWS:START (filled automatically by build.js from content/news) -->
  <section class="section" id="news">
    <div class="wrap">
      <div class="news-head">
        <div class="sec-top">
          <span class="eyebrow reveal">News &amp; press</span>
          <h2 class="reveal d1">Latest news and press releases</h2>
        </div>
        <a class="btn btn--navy reveal d2" href="/news/">All news</a>
      </div>
      <div class="nf-grid">
${featureCard(featured)}        <ul class="nf-list reveal d1">
${others.slice(0, 3).map(listItem).join('')}        </ul>
      </div>
    </div>
  </section>
  <!-- NEWS:END -->` : `  <!-- NEWS:START (filled automatically by build.js from content/news) -->\n  <!-- NEWS:END -->`;
home = home.replace(/  <!-- NEWS:START[\s\S]*?<!-- NEWS:END -->/, newsBlock);
fs.writeFileSync(path.join(OUT, 'index.html'), home);

/* ---------- sitemap, RSS, llms.txt ---------- */
let sm = fs.readFileSync(path.join(SRC, 'sitemap.xml'), 'utf8');
const extra = ['/news/', ...pagesBuilt, ...posts.map(p => p.url)]
  .filter(u => !sm.includes(`<loc>${SITE}${u}</loc>`))
  .map(u => { const p = posts.find(x => x.url === u); return `  <url><loc>${SITE}${u}</loc><lastmod>${p ? (p.updated || p.date) : TODAY}</lastmod><priority>${p ? '0.6' : '0.8'}</priority></url>`; });
sm = sm.replace('</urlset>', extra.join('\n') + (extra.length ? '\n' : '') + '</urlset>');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sm);

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Upsize Property Renovation – news and press releases</title>
  <link>${SITE}/news/</link>
  <atom:link href="${SITE}/news/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Roofing and renovation guides and company news from Upsize Property Renovation, Peterborough.</description>
  <language>en-gb</language>
${posts.slice(0, 20).map(p => `  <item><title>${esc(p.title)}</title><link>${SITE}${p.url}</link><guid>${SITE}${p.url}</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><category>${p.cat}</category><description>${esc(p.summary || '')}</description></item>`).join('\n')}
</channel>
</rss>
`;
write('news/feed.xml', rss);

let llms = fs.readFileSync(path.join(SRC, 'llms.txt'), 'utf8');
if (posts.length) llms += `\n## News, guides and press releases\n${posts.map(p => `- [${p.title}](${SITE}${p.url}) (${p.cat}, ${p.date})${p.summary ? ': ' + p.summary : ''}`).join('\n')}\n`;
fs.writeFileSync(path.join(OUT, 'llms.txt'), llms);

console.log(`Built ${pagesBuilt.length} page(s), ${posts.length} news post(s) -> dist/`);
