// Gera o site estático em /dist a partir de src/config.json, src/locales/*.json e src/assets.
// Uso: node build.js   (sem dependências)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'config.json'), 'utf8'));
const YEARS = cfg.stats.find(s => s.key === 'years').value;
const LANGS = ['pt', 'es', 'en'];
const L = Object.fromEntries(LANGS.map(l => [l,
  JSON.parse(fs.readFileSync(path.join(SRC, 'locales', l + '.json'), 'utf8').replace(/\{years\}/g, YEARS))]));
const PAGES = ['home', 'about', 'certificates', 'clients', 'breweries', 'composting', 'feed', 'tech', 'news', 'contact', 'privacy'];
const SOL = ['breweries', 'composting', 'feed', 'tech'];
const BASE = cfg.siteUrl.replace(/\/$/, '');

/* ---------- self-checks: traduções completas, sem travessões, vídeos únicos ---------- */
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k + (Array.isArray(v) ? `[${v.length}]` : '')]);
const ref = keys(L.pt).sort().join('\n');
for (const l of LANGS) {
  const k = keys(L[l]).sort().join('\n');
  if (k !== ref) throw new Error(`Locale ${l}.json tem chaves diferentes de pt.json:\n` +
    k.split('\n').filter(x => !ref.includes(x)).concat(ref.split('\n').filter(x => !k.includes(x))).join('\n'));
  const raw = JSON.stringify(L[l]);
  if (/[–—]/.test(raw)) throw new Error(`Locale ${l}.json contém travessão (— ou –). Use ponto e vírgula.`);
}
const vids = [...cfg.testimonials.map(t => t.youtubeId), ...cfg.videos.map(v => v.youtubeId)].filter(Boolean);
if (new Set(vids).size !== vids.length) throw new Error('Há vídeos do YouTube repetidos em testimonials/videos no config.json.');

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (lang, page) => (lang === 'pt' ? '/' : `/${lang}/`) + (L[lang].routes[page] ? L[lang].routes[page] + '/' : '');
const abs = u => BASE + u;
const fmt = (lang, n) => new Intl.NumberFormat(L[lang].htmlLang).format(n);
const date = (lang, d) => new Intl.DateTimeFormat(L[lang].htmlLang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d));
const maps = o => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.address);
const wa = (o, lang) => `https://wa.me/${o.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(L[lang].common.waText)}`;

const ICON = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  brewery: '<path d="M3 20V9l5 3V9l5 3V4h5v16z"/><path d="M2 20h20M7 16h2M12 16h2"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  cattle: '<path d="M4 6c0 2 1.5 3 3 3M20 6c0 2-1.5 3-3 3"/><path d="M7 9h10l-1 7a4 4 0 0 1-8 0z"/><path d="M10 17h4M10 12h.01M14 12h.01"/>',
  compost: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  field: '<path d="M3 20h18"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/><path d="M12 13V5M12 8l3-2M12 10 9 8"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  cert: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chat: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const SOL_ICON = { breweries: 'brewery', composting: 'compost', feed: 'cattle', tech: 'chip' };

/* ---------- layout ---------- */
function head(lang, page, meta) {
  const t = L[lang];
  const canonical = abs(url(lang, page));
  const og = abs('/assets/img/og.jpg');
  const alts = LANGS.map(l => `<link rel="alternate" hreflang="${L[l].htmlLang}" href="${abs(url(l, page))}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${abs(url('pt', page))}">`;
  // Só a home em PT redireciona para o idioma salvo, para nunca gerar loop.
  const redirect = page === 'home' && lang === 'pt'
    ? `var l=localStorage.getItem('lang');if((l==='es'||l==='en')&&location.pathname==='/'&&!location.search)location.replace('/'+l+'/');` : '';
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${canonical}">
${alts}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.companyName)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.home.hero.title)}">
<meta property="og:locale" content="${t.ogLocale}">
${LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${L[l].ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${og}">
<meta name="twitter:image:alt" content="${esc(t.home.hero.title)}">
<meta name="theme-color" content="#0A2533">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="apple-touch-icon" href="/assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
<script>(function(){var r=document.documentElement;r.classList.add('js');try{var t=localStorage.getItem('theme');r.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');${redirect}}catch(e){}})();</script>
<script src="/assets/js/main.js" defer></script>
${meta.schema ? `<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>` : ''}
</head>`;
}

function header(lang, page) {
  const t = L[lang], n = t.nav, br = cfg.offices.br, py = cfg.offices.py;
  const items = [
    ['about', url(lang, 'about')], ['solutions', url(lang, 'home') + '#solutions'], ['tech', url(lang, 'tech')],
    ['clients', url(lang, 'clients')], ['news', url(lang, 'news')], ['contact', url(lang, 'contact')]
  ];
  const cur = { about: 'about', tech: 'tech', clients: 'clients', news: 'news', contact: 'contact', breweries: 'solutions', composting: 'solutions', feed: 'solutions' }[page];
  return `<a class="skip" href="#main">${esc(n.skip)}</a>
<div class="topbar"><div class="wrap topbar-in">
  <span><b>BR</b><a href="tel:${br.phoneE164}">${br.phoneDisplay}</a><a href="mailto:${br.email}">${br.email}</a></span>
  <span><b>PY</b><a href="tel:${py.phoneE164}">${py.phoneDisplay}</a><a href="mailto:${py.email}">${py.email}</a></span>
</div></div>
<header class="site-header" id="top"><div class="wrap hdr">
  <a class="brand" href="${url(lang, 'home')}"><img src="/assets/img/logo.webp" width="532" height="187" alt="${esc(t.common.logoAlt)}"></a>
  <nav class="nav" id="nav" aria-label="${esc(n.main)}">
    <ul>${items.map(([k, h]) => `<li><a href="${h}"${cur === k ? ' aria-current="page"' : ''}>${esc(n[k])}</a></li>`).join('')}</ul>
  </nav>
  <div class="hdr-tools">
    <div class="lang" role="group" aria-label="${esc(n.langLabel)}">${LANGS.map(l =>
      `<a href="${url(l, page)}" hreflang="${L[l].htmlLang}" lang="${L[l].htmlLang}" data-lang="${l}" title="${L[l].name}"${l === lang ? ' aria-current="true"' : ''}>${L[l].label}</a>`).join('<span aria-hidden="true">|</span>')}</div>
    <button class="icon-btn theme-toggle" type="button" aria-label="${esc(n.theme)}">${icon('sun', 'i-sun')}${icon('moon', 'i-moon')}</button>
    <a class="btn btn-primary hdr-cta" href="${url(lang, 'contact')}">${esc(n.cta)}</a>
    <button class="icon-btn menu-btn" type="button" aria-label="${esc(n.menu)}" aria-controls="nav" aria-expanded="false">${icon('menu')}</button>
  </div>
</div></header>`;
}

function office(lang, key, h = 'h3') {
  const t = L[lang].common, o = cfg.offices[key];
  return `<div class="office">
  <${h}>${esc(key === 'br' ? t.brazil : t.paraguay)}<small>${esc(o.city)}</small></${h}>
  <ul class="contact-list">
    <li>${icon('phone')}<a href="tel:${o.phoneE164}">${o.phoneDisplay}</a></li>
    <li>${icon('mail')}<a href="mailto:${o.email}">${o.email}</a></li>
    <li>${icon('pin')}<span>${esc(o.address)}</span></li>
  </ul>
  <a class="btn btn-ghost btn-sm" href="${maps(o)}" target="_blank" rel="noopener">${icon('pin')}${esc(t.seeOnMap)}</a>
</div>`;
}

function socials(lang) {
  const s = Object.entries(cfg.social).filter(([, v]) => v);
  if (!s.length) return '';
  return `<div class="social"><p class="f-h">${esc(L[lang].common.follow)}</p>${s.map(([k, v]) =>
    `<a href="${esc(v)}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`).join('')}</div>`;
}

function footer(lang) {
  const t = L[lang], c = t.common, n = t.nav;
  return `<footer class="site-footer"><div class="wrap">
  <div class="f-grid">
    <div class="f-about">
      <a class="brand" href="${url(lang, 'home')}"><img src="/assets/img/logo.webp" width="532" height="187" alt="${esc(c.logoAlt)}" loading="lazy"></a>
      <p>${esc(c.footerText)}</p>
      ${socials(lang)}
    </div>
    <div><p class="f-h">${esc(c.footerNav)}</p><ul>
      <li><a href="${url(lang, 'about')}">${esc(t.about.h1)}</a></li>
      <li><a href="${url(lang, 'certificates')}">${esc(c.certificates)}</a></li>
      <li><a href="${url(lang, 'clients')}">${esc(t.clients.h1)}</a></li>
      <li><a href="${url(lang, 'news')}">${esc(t.news.h1)}</a></li>
      <li><a href="${url(lang, 'contact')}">${esc(n.contact)}</a></li>
    </ul></div>
    <div><p class="f-h">${esc(c.footerSolutions)}</p><ul>
      ${SOL.map(k => `<li><a href="${url(lang, k)}">${esc(t.solutions[k].name)}</a></li>`).join('')}
    </ul></div>
    ${office(lang, 'br', 'p')}
    ${office(lang, 'py', 'p')}
  </div>
  <div class="f-bottom">
    <p>&copy; ${new Date().getFullYear()} ${esc(cfg.companyName)}. ${esc(c.rights)}</p>
    <a href="${url(lang, 'privacy')}">${esc(c.privacy)}</a>
  </div>
</div></footer>
<details class="wa">
  <summary aria-label="${esc(c.waLabel)}">${icon('chat')}</summary>
  <div class="wa-pop">
    <p>${esc(c.waQuestion)}</p>
    <a href="${wa(cfg.offices.br, lang)}" target="_blank" rel="noopener">${esc(c.brazil)}<small>${cfg.offices.br.phoneDisplay}</small></a>
    <a href="${wa(cfg.offices.py, lang)}" target="_blank" rel="noopener">${esc(c.paraguay)}<small>${cfg.offices.py.phoneDisplay}</small></a>
  </div>
</details>`;
}

function page(lang, key, body, extra = {}) {
  const meta = { ...L[lang].pages[key], ...extra };
  return `${head(lang, key, meta)}
<body class="p-${key}">
${header(lang, key)}
<main id="main">
${body}
</main>
${footer(lang)}
</body>
</html>`;
}

/* ---------- componentes ---------- */
const crumbs = (lang, trail) => `<nav class="crumbs" aria-label="breadcrumb"><a href="${url(lang, 'home')}">${esc(L[lang].nav.home)}</a>${trail.map(([txt, h]) =>
  h ? `<span aria-hidden="true">/</span><a href="${h}">${esc(txt)}</a>` : `<span aria-hidden="true">/</span><span aria-current="page">${esc(txt)}</span>`).join('')}</nav>`;

const pageHero = (lang, h1, lead, trail) => `<section class="page-hero"><div class="hero-grid" aria-hidden="true"></div><div class="wrap">
  ${crumbs(lang, trail)}
  <h1 class="rv">${esc(h1)}</h1>
  <p class="lead rv">${esc(lead)}</p>
</div></section>`;

const ctaBand = lang => {
  const t = L[lang];
  return `<section class="cta-band"><div class="wrap cta-in rv">
  <h2>${esc(t.common.ctaTitle)}</h2>
  <p>${esc(t.common.ctaText)}</p>
  <div class="btns"><a class="btn btn-primary" href="${url(lang, 'contact')}">${esc(t.nav.cta)}${icon('arrow')}</a></div>
</div></section>`;
};

const solCards = lang => `<div class="sol-grid">${SOL.map((k, i) => {
  const s = L[lang].solutions[k];
  return `<article class="sol-card rv" style="--d:${i * 80}ms">
    <span class="sol-ic">${icon(SOL_ICON[k])}</span>
    <h3><a href="${url(lang, k)}">${esc(s.name)}</a></h3>
    <p>${esc(s.card)}</p>
    <span class="more" aria-hidden="true">${esc(L[lang].common.learnMore)}${icon('arrow')}</span>
  </article>`;
}).join('')}</div>`;

const ytFacade = (id, label, lang) => `<button class="yt" type="button" data-yt="${esc(id)}" aria-label="${esc(L[lang].common.playVideo + ' ' + label)}">
  <img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
  <span class="yt-play">${icon('play')}</span></button>`;

const marquee = () => {
  const row = cfg.clients.map(c => `<li style="--c:${c.color}">${esc(c.name)}</li>`).join('');
  return `<div class="marquee"><ul class="mq-track">${row}</ul><ul class="mq-track" aria-hidden="true">${row}</ul></div>`;
};

const newsCards = (lang, list) => `<div class="news-grid">${list.map((n, i) => {
  const it = L[lang].news.items[n.id];
  return `<article class="news-card rv" style="--d:${i * 80}ms">
    <time datetime="${n.date}">${date(lang, n.date)}</time>
    <h3><a href="${url(lang, 'news')}#${n.id}">${esc(it.title)}</a></h3>
    <p>${esc(it.excerpt)}</p>
    <span class="more" aria-hidden="true">${esc(L[lang].common.readMore)}${icon('arrow')}</span>
  </article>`;
}).join('')}</div>`;

/* ---------- diagrama do ciclo (SVG gerado no build) ---------- */
function cycle(lang) {
  const c = L[lang].home.cycle;
  const C = 380, R = 220;
  const N = [['brewery', 0, 'brewery'], ['residue', 60, 'truck'], ['treatment', 120, 'gear'], ['feed', 165, 'cattle'],
    ['compost', 210, 'compost'], ['products', 255, 'box'], ['field', 305, 'field']];
  const pos = a => [C + R * Math.sin(a * Math.PI / 180), C - R * Math.cos(a * Math.PI / 180)];
  const P = Object.fromEntries(N.map(([k, a]) => [k, pos(a)]));
  const arc = (a, b) => `M${P[a][0].toFixed(1)} ${P[a][1].toFixed(1)} A${R} ${R} 0 0 1 ${P[b][0].toFixed(1)} ${P[b][1].toFixed(1)}`;
  const curve = (a, b, k) => {
    const mx = (P[a][0] + P[b][0]) / 2, my = (P[a][1] + P[b][1]) / 2;
    return `M${P[a][0].toFixed(1)} ${P[a][1].toFixed(1)} Q${(C + (mx - C) * k).toFixed(1)} ${(C + (my - C) * k).toFixed(1)} ${P[b][0].toFixed(1)} ${P[b][1].toFixed(1)}`;
  };
  const paths = [arc('field', 'brewery'), arc('brewery', 'residue'), arc('residue', 'treatment'),
    arc('treatment', 'feed'), curve('treatment', 'compost', 0.45), curve('treatment', 'products', 0.2),
    curve('feed', 'field', 0.2), curve('compost', 'field', 0.45), arc('products', 'field')];
  const nodes = N.map(([k, a, ic]) => {
    const [x, y] = P[k], [lx, ly] = pos(a).map((v, i) => C + (v - C) * 1.27);
    const anchor = Math.abs(lx - C) < 30 ? 'middle' : lx > C ? 'start' : 'end';
    return `<g class="cy-node" data-step="${k}" tabindex="0" role="button" aria-label="${esc(c.steps[k].name)}">
      <circle class="cy-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="40"/>
      <circle class="cy-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="30"/>
      <svg x="${(x - 13).toFixed(1)}" y="${(y - 13).toFixed(1)}" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[ic]}</svg>
      <text x="${lx.toFixed(1)}" y="${(ly + 6).toFixed(1)}" text-anchor="${anchor}">${esc(c.steps[k].name)}</text>
    </g>`;
  }).join('');
  return `<div class="cycle">
  <div class="cy-figure rv">
    <svg class="cy-svg" viewBox="-120 0 1000 760" role="group" aria-label="${esc(c.title)}">
      <circle class="cy-ring" cx="${C}" cy="${C}" r="${R}"/>
      <circle class="cy-ring-inner" cx="${C}" cy="${C}" r="120"/>
      ${paths.map((d, i) => `<path id="cy-p${i}" class="cy-path" d="${d}"/>`).join('')}
      ${paths.map((_, i) => `<circle class="cy-pulse" r="4"><animateMotion dur="3.2s" begin="-${(i * 0.35).toFixed(2)}s" repeatCount="indefinite"><mpath href="#cy-p${i}"/></animateMotion></circle>`).join('')}
      <text class="cy-center" x="${C}" y="${C - 4}" text-anchor="middle">${esc(c.center)}</text>
      <text class="cy-center-sub" x="${C}" y="${C + 24}" text-anchor="middle">Eco 4 Solutions</text>
      ${nodes}
    </svg>
  </div>
  <ol class="cy-steps">${N.map(([k], i) => `<li data-step="${k}"${i === 0 ? ' class="active"' : ''}><button type="button" aria-pressed="${i === 0}">
    <span class="cy-n">${String(i + 1).padStart(2, '0')}</span><span class="cy-t">${esc(c.steps[k].name)}</span></button>
    <p>${esc(c.steps[k].text)}</p></li>`).join('')}</ol>
</div>`;
}

/* ---------- mapa estilizado (pontos gerados a partir de polígonos aproximados) ---------- */
// shortcut: contornos simplificados à mão (precisão ~50 km); trocar por GeoJSON real se o mapa precisar de detalhe.
const BR = [[-73.9, -7.5], [-72.9, -5.0], [-70.0, -4.2], [-69.5, -1.0], [-69.9, 1.7], [-66.9, 1.2], [-64.0, 2.0], [-64.8, 4.2], [-62.8, 4.0], [-60.7, 5.2], [-59.8, 1.8], [-56.5, 1.9], [-54.6, 2.3], [-51.6, 4.2], [-50.0, 1.8], [-48.5, -1.0], [-44.5, -2.5], [-41.5, -2.9], [-38.5, -3.7], [-35.2, -5.4], [-34.8, -7.5], [-35.3, -9.5], [-37.0, -11.0], [-38.9, -13.5], [-39.1, -17.5], [-39.8, -19.6], [-41.0, -22.0], [-43.2, -23.0], [-44.7, -23.4], [-47.0, -24.5], [-48.6, -26.5], [-48.6, -28.5], [-50.2, -30.5], [-52.5, -33.0], [-53.4, -33.7], [-53.5, -32.5], [-55.6, -30.9], [-57.6, -30.2], [-55.9, -28.4], [-53.8, -27.1], [-53.7, -26.2], [-54.6, -25.6], [-54.3, -24.0], [-55.7, -22.5], [-56.5, -22.1], [-57.9, -22.1], [-58.2, -19.8], [-57.6, -17.6], [-58.4, -16.3], [-60.2, -16.2], [-60.4, -13.5], [-61.8, -13.5], [-64.4, -12.4], [-65.4, -10.9], [-66.6, -9.9], [-68.6, -11.0], [-70.6, -11.0], [-70.5, -9.5], [-72.2, -10.0], [-73.2, -9.4]];
const PY = [[-58.2, -19.8], [-59.1, -19.3], [-61.7, -19.6], [-62.6, -22.2], [-61.0, -23.8], [-59.5, -24.6], [-57.6, -25.4], [-58.6, -27.3], [-56.4, -27.5], [-55.6, -27.3], [-54.6, -25.6], [-54.3, -24.0], [-55.7, -22.5], [-56.5, -22.1], [-57.9, -22.1]];
const inside = ([x, y], poly) => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r;
  }
  return r;
};
console.assert(inside([-47.9, -15.8], BR) && inside([-57.6, -25.3], PY) && !inside([-57.6, -25.3], BR) && !inside([-30, -10], BR), 'map polygons');
function map(lang) {
  const t = L[lang], K = 12, prj = (lon, lat) => [(lon + 75) * K, (6 - lat) * K];
  let dots = '';
  for (let lat = 5.6; lat > -34; lat -= 0.85) for (let lon = -74.5; lon < -34; lon += 0.85) {
    const p = [lon, lat], cls = inside(p, PY) ? 'py' : inside(p, BR) ? 'br' : '';
    if (cls) { const [x, y] = prj(lon, lat); dots += `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4"/>`; }
  }
  const pin = (k, name) => {
    const o = cfg.offices[k], [x, y] = prj(o.lon, o.lat), right = k === 'br';
    return `<g class="m-pin"><circle class="m-ping" cx="${x}" cy="${y}" r="10"/><circle class="m-core" cx="${x}" cy="${y}" r="7"/>
      <text x="${right ? x + 16 : x - 16}" y="${y + 5}" text-anchor="${right ? 'start' : 'end'}">${esc(name)}</text></g>`;
  };
  return `<svg class="map-svg" viewBox="0 0 500 490" role="img" aria-label="${esc(t.home.presence.mapAlt)}">${dots}
    ${pin('br', cfg.offices.br.city)}${pin('py', 'Villeta')}</svg>`;
}

/* ---------- páginas ---------- */
function home(lang) {
  const t = L[lang], h = t.home;
  const stats = cfg.stats.map((s, i) => `<div class="stat rv" style="--d:${i * 80}ms">
    <p class="stat-n"><span>${s.prefix}</span><span class="count" data-to="${s.value}">${fmt(lang, s.value)}</span></p>
    <p class="stat-l">${esc(h.stats.items[s.key])}</p></div>`).join('');
  const testi = cfg.testimonials.map((c, i) => {
    const it = h.testimonials.items[i];
    return `<figure class="testi rv" style="--d:${i * 80}ms">
      ${c.youtubeId ? ytFacade(c.youtubeId, c.name, lang) : ''}
      <blockquote><p>${esc(it.quote)}</p></blockquote>
      <figcaption><strong>${esc(c.name)}</strong><span>${esc(it.role)}, ${esc(c.company)}</span></figcaption>
    </figure>`;
  }).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': BASE + '/#org', name: cfg.companyName, url: BASE + '/', logo: abs('/assets/img/logo.png'),
        foundingDate: String(cfg.foundingYear), email: cfg.offices.br.email, areaServed: ['BR', 'PY'],
        sameAs: Object.values(cfg.social).filter(Boolean), description: t.pages.home.description },
      ...['br', 'py'].map(k => {
        const o = cfg.offices[k];
        return { '@type': 'LocalBusiness', '@id': BASE + '/#office-' + k, name: `${cfg.companyName} ${k === 'br' ? 'Brasil' : 'Paraguay'}`,
          parentOrganization: { '@id': BASE + '/#org' }, url: BASE + '/', image: abs('/assets/img/logo.png'), telephone: o.phoneE164, email: o.email,
          address: k === 'br'
            ? { '@type': 'PostalAddress', streetAddress: 'Rua Zélia, 182, Centro', addressLocality: 'Miguel Pereira', addressRegion: 'RJ', addressCountry: 'BR' }
            : { '@type': 'PostalAddress', addressLocality: 'Villeta', addressRegion: 'Departamento Central', addressCountry: 'PY' },
          geo: { '@type': 'GeoCoordinates', latitude: o.lat, longitude: o.lon } };
      })
    ]
  };
  const body = `
<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-grid"></div>
    <svg class="hero-flow" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
      <path d="M-50 520 C 250 380, 420 640, 700 470 S 1100 300, 1260 380"/>
      <path d="M-50 580 C 300 450, 480 700, 760 540 S 1120 380, 1260 450"/>
      <path d="M-50 460 C 220 320, 380 560, 650 410 S 1080 230, 1260 300"/>
      <path class="amber" d="M-50 640 C 280 540, 520 720, 800 600 S 1140 480, 1260 520"/>
    </svg>
  </div>
  <div class="wrap hero-in">
    <ul class="chips rv">${h.hero.chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <h1 class="rv">${esc(h.hero.title)}</h1>
    <p class="lead rv">${esc(h.hero.lead)}</p>
    <div class="btns rv">
      <a class="btn btn-primary" href="#solutions">${esc(h.hero.primary)}${icon('arrow')}</a>
      <a class="btn btn-outline" href="${url(lang, 'contact')}">${esc(h.hero.secondary)}</a>
    </div>
  </div>
</section>

<section class="stats" aria-labelledby="stats-h"><div class="wrap">
  <h2 id="stats-h" class="sr-only">${esc(h.stats.title)}</h2>
  <div class="stat-grid">${stats}</div>
</div></section>

<section class="sec cycle-sec" id="ciclo" aria-labelledby="cycle-h"><div class="wrap">
  <div class="sec-head"><h2 id="cycle-h" class="rv">${esc(h.cycle.title)}</h2><p class="rv">${esc(h.cycle.lead)}</p></div>
  ${cycle(lang)}
</div></section>

<section class="sec" id="solutions" aria-labelledby="sol-h"><div class="wrap">
  <div class="sec-head"><h2 id="sol-h" class="rv">${esc(h.solutions.title)}</h2><p class="rv">${esc(h.solutions.lead)}</p></div>
  ${solCards(lang)}
</div></section>

<section class="sec tech-sec" aria-labelledby="tech-h"><div class="hero-grid" aria-hidden="true"></div><div class="wrap">
  <div class="tech-layout">
    <div>
      <h2 id="tech-h" class="rv">${esc(h.tech.title)}</h2>
      <p class="lead rv">${esc(h.tech.lead)}</p>
      <p class="rv"><a class="btn btn-primary" href="${url(lang, 'tech')}">${esc(h.tech.cta)}${icon('arrow')}</a></p>
    </div>
    <ol class="tech-steps">${h.tech.steps.map((s, i) => `<li class="rv" style="--d:${i * 90}ms"><span class="ts-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(s.t)}</h3><p>${esc(s.p)}</p></div></li>`).join('')}</ol>
  </div>
  <div class="benefits rv"><h3>${esc(h.tech.benefitsTitle)}</h3><ul>${h.tech.benefits.map(b => `<li>${icon('check')}${esc(b)}</li>`).join('')}</ul></div>
</div></section>

<section class="sec clients-sec" aria-labelledby="cli-h"><div class="wrap">
  <div class="sec-head"><h2 id="cli-h" class="rv">${esc(h.clients.title)}</h2><p class="rv">${esc(h.clients.lead)}</p></div>
</div>${marquee()}</section>

<section class="sec" aria-labelledby="tst-h"><div class="wrap">
  <div class="sec-head"><h2 id="tst-h" class="rv">${esc(h.testimonials.title)}</h2></div>
  <div class="testi-grid">${testi}</div>
</div></section>

<section class="sec presence" aria-labelledby="pre-h"><div class="wrap presence-in">
  <div>
    <h2 id="pre-h" class="rv">${esc(h.presence.title)}</h2>
    <p class="lead rv">${esc(h.presence.lead)}</p>
    <div class="offices rv">${office(lang, 'br')}${office(lang, 'py')}</div>
  </div>
  <div class="map rv">${map(lang)}</div>
</div></section>

<section class="sec" aria-labelledby="news-h"><div class="wrap">
  <div class="sec-head row"><h2 id="news-h" class="rv">${esc(h.news.title)}</h2><a class="link rv" href="${url(lang, 'news')}">${esc(t.common.allNews)}${icon('arrow')}</a></div>
  ${newsCards(lang, [...cfg.news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3))}
</div></section>

<section class="sec quick" aria-labelledby="qc-h"><div class="wrap">
  <div class="quick-in rv">
    <div><h2 id="qc-h">${esc(h.contact.title)}</h2><p>${esc(h.contact.lead)}</p>
      <div class="btns"><a class="btn btn-primary" href="${url(lang, 'contact')}">${esc(t.nav.cta)}${icon('arrow')}</a></div></div>
    <div class="quick-links">
      <a href="tel:${cfg.offices.br.phoneE164}">${icon('phone')}<span><small>${esc(t.common.brazil)}</small>${cfg.offices.br.phoneDisplay}</span></a>
      <a href="tel:${cfg.offices.py.phoneE164}">${icon('phone')}<span><small>${esc(t.common.paraguay)}</small>${cfg.offices.py.phoneDisplay}</span></a>
      <a href="mailto:${cfg.offices.br.email}">${icon('mail')}<span><small>${esc(t.common.brazil)}</small>${cfg.offices.br.email}</span></a>
      <a href="mailto:${cfg.offices.py.email}">${icon('mail')}<span><small>${esc(t.common.paraguay)}</small>${cfg.offices.py.email}</span></a>
    </div>
  </div>
</div></section>`;
  return page(lang, 'home', body, { schema });
}

function solution(lang, key) {
  const t = L[lang], s = t.solutions[key];
  const steps = key === 'tech' ? `<section class="sec tech-sec"><div class="hero-grid" aria-hidden="true"></div><div class="wrap">
    <h2 class="rv">${esc(t.home.tech.title)}</h2>
    <ol class="tech-steps wide">${t.home.tech.steps.map((x, i) => `<li class="rv" style="--d:${i * 90}ms"><span class="ts-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(x.t)}</h3><p>${esc(x.p)}</p></div></li>`).join('')}</ol>
  </div></section>` : '';
  const others = SOL.filter(k => k !== key);
  const body = `${pageHero(lang, s.h1, s.lead, [[t.nav.solutions, url(lang, 'home') + '#solutions'], [s.name]])}
<section class="sec"><div class="wrap split">
  <div class="blocks">${s.blocks.map((b, i) => `<div class="block rv" style="--d:${i * 80}ms"><h2>${esc(b.h)}</h2><p>${esc(b.p)}</p></div>`).join('')}</div>
  <aside class="points rv"><span class="sol-ic big">${icon(SOL_ICON[key])}</span><h2>${esc(s.pointsTitle)}</h2>
    <ul>${s.points.map(p => `<li>${icon('check')}${esc(p)}</li>`).join('')}</ul></aside>
</div></section>
${steps}
<section class="sec"><div class="wrap">
  <div class="sec-head"><h2 class="rv">${esc(t.home.solutions.title)}</h2></div>
  <div class="sol-grid three">${others.map(k => `<article class="sol-card rv"><span class="sol-ic">${icon(SOL_ICON[k])}</span>
    <h3><a href="${url(lang, k)}">${esc(t.solutions[k].name)}</a></h3><p>${esc(t.solutions[k].card)}</p>
    <span class="more" aria-hidden="true">${esc(t.common.learnMore)}${icon('arrow')}</span></article>`).join('')}</div>
</div></section>
${ctaBand(lang)}`;
  return page(lang, key, body);
}

function about(lang) {
  const t = L[lang], a = t.about;
  const body = `${pageHero(lang, a.h1, a.lead, [[a.h1]])}
<section class="sec"><div class="wrap split">
  <div><h2 class="rv">${esc(a.historyTitle)}</h2>${a.history.map(p => `<p class="rv">${esc(p)}</p>`).join('')}</div>
  <div class="mv">
    <div class="mv-card rv"><h2>${esc(a.missionTitle)}</h2><p>${esc(a.mission)}</p></div>
    <div class="mv-card rv"><h2>${esc(a.visionTitle)}</h2><p>${esc(a.vision)}</p></div>
  </div>
</div></section>
<section class="sec tech-sec"><div class="hero-grid" aria-hidden="true"></div><div class="wrap">
  <h2 class="rv">${esc(a.timelineTitle)}</h2>
  <ol class="timeline">${a.timeline.map((x, i) => `<li class="rv" style="--d:${i * 70}ms"><span class="tl-y">${esc(x.year)}</span><h3>${esc(x.t)}</h3><p>${esc(x.p)}</p></li>`).join('')}</ol>
</div></section>
<section class="sec"><div class="wrap">
  <div class="sec-head"><h2 class="rv">${esc(a.valuesTitle)}</h2></div>
  <div class="values">${a.values.map((v, i) => `<div class="value rv" style="--d:${i * 70}ms"><h3>${esc(v.t)}</h3><p>${esc(v.p)}</p></div>`).join('')}</div>
</div></section>
${ctaBand(lang)}`;
  return page(lang, 'about', body);
}

function certificates(lang) {
  const t = L[lang], c = t.certificates;
  const body = `${pageHero(lang, c.h1, c.lead, [[c.h1]])}
<section class="sec"><div class="wrap">
  <div class="cert-grid">${c.items.map((x, i) => `<article class="cert rv" style="--d:${i * 80}ms"><span class="sol-ic">${icon('cert')}</span><h2>${esc(x.t)}</h2><p>${esc(x.p)}</p></article>`).join('')}</div>
  <p class="note rv">${esc(c.note)} <a href="${url(lang, 'contact')}">${esc(c.request)}</a></p>
</div></section>
${ctaBand(lang)}`;
  return page(lang, 'certificates', body);
}

function clients(lang) {
  const t = L[lang], c = t.clients;
  const body = `${pageHero(lang, c.h1, c.lead, [[c.h1]])}
<section class="sec"><div class="wrap">
  <h2 class="rv">${esc(c.clientsTitle)}</h2>
  <ul class="logo-grid">${cfg.clients.map((x, i) => `<li class="rv" style="--c:${x.color};--d:${i * 50}ms">${esc(x.name)}</li>`).join('')}</ul>
</div></section>
<section class="sec"><div class="wrap">
  <h2 class="rv">${esc(c.partnersTitle)}</h2>
  <div class="values">${c.partners.map((v, i) => `<div class="value rv" style="--d:${i * 70}ms"><h3>${esc(v.t)}</h3><p>${esc(v.p)}</p></div>`).join('')}</div>
</div></section>
${ctaBand(lang)}`;
  return page(lang, 'clients', body);
}

function news(lang) {
  const t = L[lang], n = t.news;
  const sorted = [...cfg.news].sort((a, b) => b.date.localeCompare(a.date));
  const videos = cfg.videos.length ? `<section class="sec"><div class="wrap"><h2 class="rv">${esc(n.videosTitle)}</h2>
    <div class="video-grid">${cfg.videos.map(v => `<figure class="rv">${ytFacade(v.youtubeId, v.title[lang], lang)}<figcaption>${esc(v.title[lang])}</figcaption></figure>`).join('')}</div></div></section>` : '';
  const body = `${pageHero(lang, n.h1, n.lead, [[n.h1]])}
<section class="sec"><div class="wrap articles">
  ${sorted.map(x => {
    const it = n.items[x.id];
    return `<article class="article rv" id="${x.id}"><time datetime="${x.date}">${date(lang, x.date)}</time><h2>${esc(it.title)}</h2>
      <p class="lead">${esc(it.excerpt)}</p>${it.body.map(p => `<p>${esc(p)}</p>`).join('')}</article>`;
  }).join('')}
</div></section>
${videos}
${ctaBand(lang)}`;
  return page(lang, 'news', body);
}

function contact(lang) {
  const t = L[lang], c = t.contact, f = c.form;
  const field = (name, label, type = 'text', req = true, ac = '') => `<label class="field"><span>${esc(label)}${req ? ' <b aria-hidden="true">*</b>' : ''}</span>
    <input type="${type}" name="${name}"${req ? ' required' : ''}${ac ? ` autocomplete="${ac}"` : ''}></label>`;
  const select = (name, label, opts) => `<label class="field"><span>${esc(label)} <b aria-hidden="true">*</b></span>
    <select name="${name}" required><option value="">${esc(f.select)}</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
  const body = `${pageHero(lang, c.h1, c.lead, [[c.h1]])}
<section class="sec"><div class="wrap contact-layout">
  <div class="form-card rv">
    <h2>${esc(c.formTitle)}</h2>
    <p class="form-ok" role="status" hidden>${esc(f.success)}</p>
    ${cfg.formEndpoint
      // Vercel (ou qualquer host): envia para um serviço de formulários (ex.: Formspree) via fetch
      ? `<form name="contato" method="POST" action="${esc(cfg.formEndpoint)}" data-ajax>
      <input type="hidden" name="_subject" value="Contato pelo site (${lang.toUpperCase()})">`
      // Netlify: formulários nativos
      : `<form name="contato" method="POST" action="${url(lang, 'contact')}?enviado=1" data-netlify="true" netlify-honeypot="_gotcha">
      <input type="hidden" name="form-name" value="contato">`}
      <input type="hidden" name="idioma" value="${lang}">
      <p class="hp" hidden><label>Não preencha <input name="_gotcha" tabindex="-1" autocomplete="off"></label></p>
      <div class="form-grid">
        ${field('nome', f.name, 'text', true, 'name')}
        ${field('empresa', f.company, 'text', true, 'organization')}
        ${field('cargo', f.role, 'text', false, 'organization-title')}
        ${select('pais', f.country, f.countryOpts)}
        ${field('email', f.email, 'email', true, 'email')}
        ${field('telefone', f.phone, 'tel', false, 'tel')}
        ${select('interesse', f.interest, f.interestOpts)}
        <label class="field full"><span>${esc(f.message)} <b aria-hidden="true">*</b></span><textarea name="mensagem" rows="5" required></textarea></label>
      </div>
      <label class="consent"><input type="checkbox" name="consentimento_lgpd" value="sim" required><span>${esc(f.consent)} <a href="${url(lang, 'privacy')}">${esc(t.common.privacy)}</a></span></label>
      <p class="req-note"><b aria-hidden="true">*</b> ${esc(f.required)}</p>
      <button class="btn btn-primary" type="submit">${esc(f.submit)}${icon('arrow')}</button>
    </form>
  </div>
  <div class="contact-side">
    <h2 class="rv">${esc(c.officesTitle)}</h2>
    <div class="offices stack rv">${office(lang, 'br', 'h3')}${office(lang, 'py', 'h3')}</div>
  </div>
</div></section>`;
  return page(lang, 'contact', body);
}

function privacy(lang) {
  const t = L[lang], p = t.privacy;
  const body = `${pageHero(lang, p.h1, p.updated, [[p.h1]])}
<section class="sec"><div class="wrap prose">${p.sections.map(s => `<h2>${esc(s.h)}</h2>${s.p.map(x => `<p>${esc(x)}</p>`).join('')}`).join('')}</div></section>`;
  return page(lang, 'privacy', body);
}

function notFound() {
  const t = L.pt;
  return `${head('pt', 'home', { title: t.notFound.title, description: t.notFound.text }).replace(/<link rel="(canonical|alternate)"[^>]*>\n?/g, '')}
<body class="p-404">${header('pt', 'home')}<main id="main">
<section class="page-hero tall"><div class="hero-grid" aria-hidden="true"></div><div class="wrap">
  <h1>${esc(t.notFound.h1)}</h1><p class="lead">${esc(t.notFound.text)}</p>
  <div class="btns">${LANGS.map(l => `<a class="btn ${l === 'pt' ? 'btn-primary' : 'btn-outline'}" href="${url(l, 'home')}" lang="${L[l].htmlLang}">${esc(L[l].notFound.back)}</a>`).join('')}</div>
</div></section></main>${footer('pt')}</body></html>`;
}

/* ---------- escrita ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
const write = (rel, html) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
};
const RENDER = { home, about, certificates, clients, news, contact, privacy };
for (const lang of LANGS) for (const key of PAGES) {
  const html = SOL.includes(key) ? solution(lang, key) : RENDER[key](lang);
  if (/href="#"/.test(html)) throw new Error(`Link vazio (href="#") em ${lang}/${key}`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) throw new Error(`A página ${lang}/${key} precisa de exatamente um H1`);
  write(url(lang, key) + 'index.html', html);
}
write('404.html', notFound());

write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap(lang => PAGES.map(key => `<url><loc>${abs(url(lang, key))}</loc>
${LANGS.map(l => `  <xhtml:link rel="alternate" hreflang="${L[l].htmlLang}" href="${abs(url(l, key))}"/>`).join('\n')}
  <xhtml:link rel="alternate" hreflang="x-default" href="${abs(url('pt', key))}"/>
</url>`)).join('\n')}
</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

console.log(`OK: ${LANGS.length * PAGES.length} páginas geradas em dist/`);
