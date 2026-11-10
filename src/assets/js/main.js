// Interações do site. Tudo funciona sem JS (conteúdo visível, contadores mostram o valor final).
(function () {
  var d = document, root = d.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  // tema
  var tb = d.querySelector('.theme-toggle');
  if (tb) tb.addEventListener('click', function () {
    var n = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = n; store('theme', n);
  });

  // idioma salvo para a próxima visita
  d.querySelectorAll('[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () { store('lang', a.dataset.lang); });
  });

  // menu mobile + header com sombra
  var hdr = d.querySelector('.site-header'), mb = d.querySelector('.menu-btn');
  if (mb) mb.addEventListener('click', function () {
    var open = hdr.classList.toggle('open');
    mb.setAttribute('aria-expanded', open);
  });
  d.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () { hdr.classList.remove('open'); mb && mb.setAttribute('aria-expanded', 'false'); });
  });
  var onScroll = function () { hdr && hdr.classList.toggle('scrolled', scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // fecha o WhatsApp ao clicar fora
  var wa = d.querySelector('.wa');
  d.addEventListener('click', function (e) { if (wa && wa.open && !wa.contains(e.target)) wa.open = false; });

  // contadores: o HTML já traz o valor final; animamos de 0 até ele ao entrar na tela
  var nf = new Intl.NumberFormat(root.lang);
  function count(el) {
    var to = +el.dataset.to, t0 = performance.now(), dur = 1800;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = nf.format(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step); else el.textContent = nf.format(to);
    })(t0);
  }

  // revelar ao rolar
  var els = d.querySelectorAll('.rv, .count');
  if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (en.target.classList.contains('count')) { if (!reduce) count(en.target); }
        else en.target.classList.add('in');
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // diagrama do ciclo
  var cy = d.querySelector('.cycle');
  if (cy) {
    var keys = Array.prototype.map.call(cy.querySelectorAll('.cy-steps li'), function (li) { return li.dataset.step; });
    var idx = 0, timer = null, visible = false;
    var setActive = function (k) {
      idx = keys.indexOf(k);
      cy.querySelectorAll('[data-step]').forEach(function (el) {
        var on = el.dataset.step === k;
        el.classList.toggle('active', on);
        var b = el.tagName === 'LI' ? el.querySelector('button') : el;
        b.setAttribute('aria-pressed', on);
      });
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var play = function () { if (!timer && !reduce && visible) timer = setInterval(function () { setActive(keys[(idx + 1) % keys.length]); }, 3600); };
    var pick = function (k) { stop(); cy.dataset.user = '1'; setActive(k); };
    cy.querySelectorAll('.cy-node').forEach(function (n) {
      n.addEventListener('click', function () { pick(n.dataset.step); });
      n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n.dataset.step); } });
      n.addEventListener('mouseenter', function () { if (!cy.dataset.user) { stop(); setActive(n.dataset.step); } });
    });
    cy.querySelectorAll('.cy-steps button').forEach(function (b) {
      b.addEventListener('click', function () { pick(b.parentNode.dataset.step); });
    });
    cy.addEventListener('mouseleave', function () { if (!cy.dataset.user) play(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting; if (visible && !cy.dataset.user) play(); else stop();
    }).observe(cy);
    var svg = cy.querySelector('svg');
    if (reduce && svg.pauseAnimations) svg.pauseAnimations();
  }

  // YouTube: só carrega ao clicar
  d.querySelectorAll('.yt[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.yt) + '?autoplay=1&rel=0';
      f.title = b.getAttribute('aria-label');
      f.className = 'yt';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      b.replaceWith(f);
    });
  });

  // formulário: mensagem de sucesso após o envio (Netlify redireciona com ?enviado=1)
  if (/[?&]enviado=1/.test(location.search)) {
    var ok = d.querySelector('.form-ok');
    if (ok) { ok.hidden = false; ok.scrollIntoView({ block: 'center' }); }
  }

  // formulário com serviço externo (Vercel): envia sem sair da página; se falhar, envia do jeito normal
  var af = d.querySelector('form[data-ajax]');
  if (af && window.fetch) af.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = af.querySelector('[type=submit]'); btn.disabled = true;
    fetch(af.action, { method: 'POST', body: new FormData(af), headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw r;
        af.reset(); af.hidden = true;
        var ok = d.querySelector('.form-ok'); ok.hidden = false; ok.focus && ok.scrollIntoView({ block: 'center' });
      })
      .catch(function () { btn.disabled = false; af.submit(); });
  });
})();
