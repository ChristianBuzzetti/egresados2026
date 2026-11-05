/* EGRESADOS 2026 · black & gold — vanilla JS, sin dependencias */
(() => {
  'use strict';
  window.EG_OK = true;

  // ===== Fecha y hora de la fiesta (hora Argentina, UTC-3). Cambiar acá. =====
  const FIESTA = '2026-12-12T21:00:00-03:00';
  const TARGET = new Date(FIESTA).getTime();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const SMALL = innerWidth < 760;
  const root = document.documentElement;
  // modo liviano: lo decide el <head> (núcleos, memoria, ahorro de datos, reduced motion)
  // y, si no, un muestreo de FPS de 2 s al cargar (más abajo)
  let LITE = root.classList.contains('lite');
  const FORCED = /-fijo$/.test(root.getAttribute('data-mode') || '');
  const GOLDS = ['#fff6d5', '#f7e7a1', '#d4af37', '#b8860b', '#e9cf7a', '#ffffff'];
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------------------------------------------------------
     Texto letra por letra
  --------------------------------------------------------------- */
  // el título ya viene partido en el HTML (se ve sin esperar al JS); esto es respaldo
  $$('[data-split]').forEach(el => {
    if (el.querySelector('.ch')) return;
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.textContent = '';
    [...txt].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = c;
      el.appendChild(s);
    });
  });

  /* ---------------------------------------------------------------
     Ecualizadores
  --------------------------------------------------------------- */
  $$('[data-eq]').forEach(el => {
    if (el.children.length) return;   // el del hero ya viene en el HTML
    const n = +el.dataset.eq;   // en modo liviano el CSS oculta una de cada dos
    let html = '';
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const env = 0.35 + 0.65 * Math.sin(t * Math.PI);           // más alto al centro
      const hi = Math.min(1, env * rand(0.75, 1.05)).toFixed(2);
      const lo = (0.08 + Math.random() * 0.2).toFixed(2);
      html += `<i style="--d:${rand(0.35, 0.95).toFixed(2)}s;--dl:${(-Math.random()).toFixed(2)}s;--hi:${hi};--lo:${lo}"></i>`;
    }
    el.innerHTML = html;
  });

  /* Surcos del vinilo */
  const grooves = $('#grooves');
  if (grooves) {
    let g = '';
    for (let r = 192; r > 76; r -= 5) g += `<circle r="${r}" stroke-width="${r % 3 ? 0.8 : 1.4}"/>`;
    grooves.innerHTML = g;
  }

  /* ---------------------------------------------------------------
     Videos: el hero según orientación; el otro, lazy en la sección CTA
  --------------------------------------------------------------- */
  const portrait = innerHeight >= innerWidth || innerWidth < 760;
  const heroKind = portrait ? 'vertical' : 'wide';
  const ctaKind = portrait ? 'wide' : 'vertical';

  /* Formato: en iOS / Safari (o si el navegador no asegura VP9) va el mp4 primero;
     en el resto el webm (más liviano en Chrome/Android). */
  const UA = navigator.userAgent;
  const IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(UA);
  const probe = document.createElement('video');
  const vp9 = probe.canPlayType ? probe.canPlayType('video/webm; codecs="vp9"') || probe.canPlayType('video/webm; codecs=vp9') : '';
  const ORDER = (IOS || SAFARI || vp9 !== 'probably')
    ? [['mp4', 'video/mp4'], ['webm', 'video/webm']]
    : [['webm', 'video/webm'], ['mp4', 'video/mp4']];

  const FADE = 0.6; // s antes del final en que arranca el fundido

  // iOS exige muted + playsinline como ATRIBUTOS y como propiedades para el autoplay
  function inlineMuted(v) {
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('disablepictureinpicture', ''); v.setAttribute('disableremoteplayback', '');
  }

  function tryPlay(v) {
    if (!v._src) return;
    v.muted = true;
    const pr = v.play();
    // si falla (ahorro de energía, política de autoplay) el video queda oculto → se ve el poster
    if (pr && pr.catch) pr.catch(() => v.classList.remove('ready', 'fading'));
  }

  /* Crossfade del loop: se funde al poster/negro justo antes del final y vuelve
     a aparecer cuando el loop ya saltó al principio → el corte no se nota. */
  function smoothLoop(v) {
    let lastT = 0;
    const check = () => {
      const d = v.duration, t = v.currentTime;
      if (d && isFinite(d) && d > FADE * 3) {
        if (t < lastT - 0.5 || t < 0.15) v.classList.remove('fading');   // ya reinició
        else if (t > d - FADE) v.classList.add('fading');
      }
      lastT = t;
    };
    if ('requestVideoFrameCallback' in v) {
      const onFrame = () => { check(); v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
    }
    v.addEventListener('timeupdate', check);   // respaldo (y para iOS viejos)
    v.addEventListener('seeked', check);
    // por si algún navegador ignora loop y dispara ended
    v.addEventListener('ended', () => { v.currentTime = 0; tryPlay(v); });
  }

  function setVideo(v, kind, play) {
    v.poster = `media/poster_${kind}.webp?v=4`;
    inlineMuted(v);
    if (RM) { v.removeAttribute('autoplay'); v.autoplay = false; v.preload = 'none'; return; } // solo poster
    v.autoplay = true; v.setAttribute('autoplay', ''); v.loop = true;
    for (const [ext, type] of ORDER) {
      const s = document.createElement('source');
      s.src = `media/hero_${kind}.${ext}?v=4`;
      s.type = type;
      v.appendChild(s);
    }
    v._src = true;
    v.addEventListener('playing', () => v.classList.add('ready'));
    v.addEventListener('error', () => v.classList.remove('ready'), true); // error en <source> → poster
    smoothLoop(v);
    v.load();
    if (play) tryPlay(v);
  }

  const heroVideo = $('#heroVideo');
  // el video del hero arranca recién cuando terminó de cargar el primer pantallazo
  // (no compite con fuentes ni poster; mientras tanto se ve el poster)
  const startHero = () => { if (!LITE && !heroVideo._src) setVideo(heroVideo, heroKind, true); };
  if (!LITE) {
    if (document.readyState === 'complete') setTimeout(startHero, 0);
    else addEventListener('load', () => setTimeout(startHero, 0), { once: true });
  }

  // libera un video (modo liviano): deja de descargar y decodificar
  function dropVideo(v) {
    if (!v) return;
    try { v.pause(); } catch (_) {}
    v._src = false;
    v.removeAttribute('autoplay'); v.autoplay = false;
    $$('source', v).forEach(s => s.remove());
    v.removeAttribute('src');
    v.classList.remove('ready', 'fading');
    try { v.load(); } catch (_) {}
  }

  // iOS en modo ahorro bloquea el autoplay: reintentar con el primer toque
  if (!RM) {
    const kick = () => {
      $$('video.bg-video').forEach(v => { if (v._src && v.paused && v._visible !== false) tryPlay(v); });
    };
    addEventListener('touchstart', kick, { once: true, passive: true });
    addEventListener('pointerdown', kick, { once: true, passive: true });
  }

  const ctaVideo = $('#ctaVideo');
  const ctaSec = $('#playlist');
  if ('IntersectionObserver' in window) {
    let loaded = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loaded) {
        loaded = true;
        if (LITE) return;
        setVideo(ctaVideo, ctaKind, true);
        if (RM) ctaVideo.classList.add('ready'); // muestra el poster
      }
    }, { rootMargin: '400px 0px' }).observe(ctaSec);

    // pausar videos fuera de pantalla
    if (!RM) {
      const vis = new IntersectionObserver(entries => entries.forEach(e => {
        const v = e.target.querySelector('video');
        if (!v) return;
        v._visible = e.isIntersecting;
        if (!v._src) return;
        if (e.isIntersecting) tryPlay(v); else v.pause();
      }), { threshold: 0 });
      vis.observe($('.hero'));
      vis.observe(ctaSec);
    }
  }

  /* Pausar animaciones CSS de las secciones que no están en pantalla */
  if ('IntersectionObserver' in window) {
    const offIO = new IntersectionObserver(entries => entries.forEach(e => {
      e.target.classList.toggle('off', !e.isIntersecting);
    }), { rootMargin: '120px 0px' });
    $$('[data-anim]').forEach(el => offIO.observe(el));
  }

  /* ---------------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------------- */
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal').forEach((el, i) => {
      el.style.transitionDelay = (el.parentElement.classList.contains('info-grid') ? (i % 3) * 0.08 : 0) + 's';
      io.observe(el);
    });
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------------------------------------------------------------
     Scroll: parallax del hero + barra de progreso
  --------------------------------------------------------------- */
  const heroInner = $('#heroInner');
  const progress = $('#progress');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, h = innerHeight;
    const max = document.documentElement.scrollHeight - h;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (RM || y > h * 1.2) return;
    const k = y / h;
    if (LITE) { heroInner.style.transform = ''; heroInner.style.opacity = Math.max(0, 1 - k * 1.3); return; }
    heroInner.style.transform = `translate3d(0,${y * 0.35}px,0) scale(${1 - k * 0.08})`;
    heroInner.style.opacity = Math.max(0, 1 - k * 1.3);
    heroVideo.style.transform = `scale(${1 + k * 0.18})`;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------
     FX canvas: chispas + confeti (encima de todo, sin capturar clicks)
  --------------------------------------------------------------- */
  const fx = $('#fx');
  const fctx = fx.getContext('2d');
  let DPR = Math.min(devicePixelRatio || 1, LITE ? 1 : 2);
  const Q = () => (LITE ? 0.5 : 1);   // cantidad de partículas según el modo
  let FW = 0, FH = 0;
  const parts = [];
  let fxRunning = false;

  function sizeFx() {
    FW = innerWidth; FH = innerHeight;
    fx.width = FW * DPR; fx.height = FH * DPR;
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeFx();

  function spark(x, y, power = 1) {
    const a = rand(0, Math.PI * 2), sp = rand(2, 9) * power;
    parts.push({ k: 's', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 1, decay: rand(0.012, 0.03),
      c: GOLDS[(Math.random() * GOLDS.length) | 0], w: rand(1.2, 2.6) });
  }
  function confetto(x, y, vx, vy) {
    parts.push({ k: 'c', x, y, vx, vy, life: 1, decay: rand(0.002, 0.004), rot: rand(0, 6.28), vr: rand(-0.2, 0.2),
      flip: rand(0, 6.28), vf: rand(0.08, 0.2), w: rand(7, 13), h: rand(4, 7), c: GOLDS[(Math.random() * 5) | 0],
      sway: rand(0.5, 1.5) });
  }
  function burst(x, y, n = 26, power = 1) {
    if (RM) return;
    n = Math.round(n * Q());
    for (let i = 0; i < n; i++) spark(x, y, power);
    startFx();
  }
  function confettiBlast(x, y, n = 120) {
    if (RM) return;
    n = Math.round(n * Q());
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05), sp = rand(6, 17);
      confetto(x, y, Math.cos(a) * sp, Math.sin(a) * sp);
    }
    burst(x, y, 30, 1.4);
  }
  // cañón desde un borde: dispara en abanico hacia arriba/adentro (no explota sobre el texto)
  function confettiCannon(x, y, dir, n = 80) {
    if (RM) return;
    n = Math.round(n * Q());
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + dir * rand(0.15, 0.6), sp = rand(13, 22);
      confetto(x, y, Math.cos(a) * sp, Math.sin(a) * sp);
    }
    startFx();
  }
  let rainUntil = 0;
  function confettiRain(ms = 4000) {
    if (RM) return;
    rainUntil = performance.now() + ms;
    startFx();
  }
  function startFx() {
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop(now) {
    fctx.clearRect(0, 0, FW, FH);
    if (now < rainUntil && parts.length < (LITE ? 160 : 400)) {
      for (let i = 0; i < (LITE ? 2 : SMALL ? 3 : 5); i++) confetto(rand(0, FW), -20, rand(-1, 1), rand(1, 4));
    }
    fctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k === 's') {
        p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.22;
        const ox = p.x, oy = p.y;
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        fctx.globalAlpha = Math.max(0, p.life);
        fctx.strokeStyle = p.c; fctx.lineWidth = p.w; fctx.lineCap = 'round';
        fctx.beginPath(); fctx.moveTo(ox - p.vx * 1.5, oy - p.vy * 1.5); fctx.lineTo(p.x, p.y); fctx.stroke();
      }
    }
    fctx.globalCompositeOperation = 'source-over';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k === 'c') {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.16;
        p.flip += p.vf; p.rot += p.vr;
        p.x += p.vx + Math.sin(p.flip) * p.sway; p.y += p.vy;
        if (p.y > FH + 30) p.life = 0; else p.life -= p.decay;
        fctx.globalAlpha = Math.min(1, p.life * 3);
        fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.scale(1, Math.cos(p.flip));
        fctx.fillStyle = p.c; fctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        fctx.restore();
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    fctx.globalAlpha = 1;
    if (parts.length || now < rainUntil) requestAnimationFrame(fxLoop);
    else { fxRunning = false; fctx.clearRect(0, 0, FW, FH); }
  }

  /* ---------------------------------------------------------------
     Glitter de fondo (canvas, ligero)
  --------------------------------------------------------------- */
  const gl = $('#glitter');
  const gctx = gl.getContext('2d');
  const GDPR = Math.min(devicePixelRatio || 1, 1.5);
  let GW = 0, GH = 0, glitter = [], glRunning = false;
  function sizeGl() {
    GW = innerWidth; GH = innerHeight;
    gl.width = GW * GDPR; gl.height = GH * GDPR;
    gctx.setTransform(GDPR, 0, 0, GDPR, 0, 0);
  }
  function makeGlitter() {
    const n = SMALL ? 40 : 100;
    glitter = Array.from({ length: n }, () => ({
      x: rand(0, GW), y: rand(0, GH), r: rand(0.6, 2.2), vy: rand(-0.35, -0.08), vx: rand(-0.12, 0.12),
      ph: rand(0, 6.28), sp: rand(0.02, 0.06), star: Math.random() < 0.18, c: GOLDS[(Math.random() * 4) | 0]
    }));
  }
  let lastScroll = scrollY;
  function glLoop() {
    if (document.hidden || LITE) { glRunning = false; gctx.clearRect(0, 0, GW, GH); return; }
    gctx.clearRect(0, 0, GW, GH);
    const dy = (scrollY - lastScroll) * 0.25; lastScroll = scrollY;
    for (const p of glitter) {
      p.ph += p.sp; p.x += p.vx; p.y += p.vy - dy * p.r * 0.5;
      if (p.y < -10) { p.y = GH + 10; p.x = rand(0, GW); }
      if (p.y > GH + 10) { p.y = -10; p.x = rand(0, GW); }
      if (p.x < -10) p.x = GW + 10; if (p.x > GW + 10) p.x = -10;
      const tw = 0.5 + 0.5 * Math.sin(p.ph);
      gctx.globalAlpha = 0.2 + tw * 0.8;
      gctx.fillStyle = p.c;
      gctx.beginPath(); gctx.arc(p.x, p.y, p.r, 0, 6.283); gctx.fill();
      if (p.star && tw > 0.75) {
        const L = p.r * 6 * tw;
        gctx.strokeStyle = '#fff6d5'; gctx.lineWidth = 0.8;
        gctx.beginPath(); gctx.moveTo(p.x - L, p.y); gctx.lineTo(p.x + L, p.y); gctx.moveTo(p.x, p.y - L); gctx.lineTo(p.x, p.y + L); gctx.stroke();
      }
    }
    gctx.globalAlpha = 1;
    requestAnimationFrame(glLoop);
  }
  function startGl() { if (!RM && !LITE && !glRunning && !document.hidden) { glRunning = true; requestAnimationFrame(glLoop); } }
  if (!RM && !LITE) { sizeGl(); makeGlitter(); startGl(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) startGl(); });

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { sizeFx(); if (!RM && !LITE) { sizeGl(); makeGlitter(); } }, 150);
  });

  /* ---------------------------------------------------------------
     Brillo que sigue al cursor + chispas al tocar
  --------------------------------------------------------------- */
  const glow = $('#cursorGlow');
  if (!RM) {
    if (FINE) {
      let gx = 0, gy = 0, lastSpark = 0;
      addEventListener('pointermove', e => {
        if (LITE) return;
        gx = e.clientX; gy = e.clientY;
        glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
        glow.classList.add('on');
        const now = performance.now();
        if (now - lastSpark > 40) { lastSpark = now; spark(gx, gy, 0.35); startFx(); }
      }, { passive: true });
      document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    }
    addEventListener('pointerdown', e => burst(e.clientX, e.clientY, SMALL ? 22 : 30), { passive: true });
  }

  /* CTA: ráfaga extra al tocar (el link sigue funcionando normal) */
  $('#cta').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    confettiBlast(r.left + r.width / 2, r.top + r.height / 2, 60);
  });

  /* ---------------------------------------------------------------
     Toast
  --------------------------------------------------------------- */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg, ms = 3200) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  /* ---------------------------------------------------------------
     Easter egg: tocar el 2026 cinco veces → modo fiesta
  --------------------------------------------------------------- */
  const year = $('#year');
  let taps = 0, tapT;
  year.addEventListener('click', () => {
    taps++;
    clearTimeout(tapT);
    tapT = setTimeout(() => (taps = 0), 1600);
    year.classList.remove('tap', 'boom'); void year.offsetWidth;
    if (taps >= 5) {
      taps = 0;
      year.classList.add('boom');
      partyMode();
    } else {
      year.classList.add('tap');
      if (taps >= 2) toast(['🔥', '🔥🔥 ¡seguí!', '🔥🔥🔥 ¡una más!'][taps - 2], 900);
    }
  });
  function partyMode() {
    toast('🪩 ¡MODO FIESTA ACTIVADO! 🪩', 3800);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 120]);
    if (RM) return;
    confettiRain(5000);
    confettiBlast(innerWidth / 2, innerHeight * 0.55, 140);
    root.classList.add('party');
    setTimeout(() => root.classList.remove('party'), 6000);
  }

  /* ---------------------------------------------------------------
     Cuenta regresiva con flip
  --------------------------------------------------------------- */
  const units = {};
  $$('#countdown .unit').forEach(u => {
    units[u.dataset.unit] = { el: u, digits: u.querySelector('.digits'), flips: [] };
  });

  function makeFlip() {
    const f = document.createElement('span');
    f.className = 'flip';
    f.innerHTML = '<span class="t"><i></i></span><span class="b"><i></i></span><span class="ft"><i></i></span><span class="fb"><i></i></span>';
    f._t = f.querySelector('.t i'); f._b = f.querySelector('.b i');
    f._ft = f.querySelector('.ft i'); f._fb = f.querySelector('.fb i');
    f._v = null;
    f.querySelector('.fb').addEventListener('animationend', () => {
      f._b.textContent = f._v;
      f.classList.remove('go');
    });
    return f;
  }
  function setFlip(f, v, animate) {
    if (f._v === v) return;
    const old = f._v;
    f._v = v;
    if (!animate || old === null) {
      f._t.textContent = f._b.textContent = v;
      return;
    }
    f.classList.remove('go');
    f._t.textContent = v;      // mitad superior nueva (queda detrás)
    f._b.textContent = old;    // mitad inferior vieja (hasta que baja la hoja)
    f._ft.textContent = old;   // hoja que cae: arriba vieja
    f._fb.textContent = v;     // hoja que cae: abajo nueva
    void f.offsetWidth;
    f.classList.add('go');
  }
  function setUnit(key, value, animate) {
    const u = units[key];
    const str = String(value).padStart(2, '0');
    if (u.flips.length !== str.length) {
      u.digits.innerHTML = '';
      u.flips = [...str].map(() => { const f = makeFlip(); u.digits.appendChild(f); return f; });
    }
    [...str].forEach((c, i) => setFlip(u.flips[i], c, animate));
  }

  const horaEl = $('#hora');
  try {
    horaEl.textContent = new Date(FIESTA).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Buenos_Aires' });
  } catch (_) { /* queda 21:00 */ }

  const cdSec = $('#cuenta');
  const cdEl = $('#countdown');
  let first = true, celebrated = false;
  function tick() {
    const diff = TARGET - Date.now();
    if (diff <= 0) { itsToday(); return; }
    const s = Math.floor(diff / 1000);
    const animate = !RM && !first;
    setUnit('d', Math.floor(s / 86400), animate);
    setUnit('h', Math.floor((s % 86400) / 3600), animate);
    setUnit('m', Math.floor((s % 3600) / 60), animate);
    setUnit('s', s % 60, animate);
    cdEl.setAttribute('aria-label', `Faltan ${Math.floor(s / 86400)} días, ${Math.floor((s % 86400) / 3600)} horas y ${Math.floor((s % 3600) / 60)} minutos`);
    first = false;
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  function itsToday() {
    if (celebrated) return;
    celebrated = true;
    cdSec.classList.add('is-today');
    $('#today').hidden = false;
    $('.dots', cdSec) && ($('.dots', cdSec).style.display = 'none');
    if (RM) return;
    const fire = () => {
      confettiCannon(-10, innerHeight + 10, 1, SMALL ? 70 : 100);
      confettiCannon(innerWidth + 10, innerHeight + 10, -1, SMALL ? 70 : 100);
      confettiRain(3500);
    };
    // explota al cargar y cuando vuelven a ver la sección
    setTimeout(fire, 600);
    if ('IntersectionObserver' in window) {
      let lastFire = performance.now();
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && performance.now() - lastFire > 4000) { lastFire = performance.now(); fire(); }
      }, { threshold: 0.4 }).observe($('#today'));
    }
  }

  // ===== Cierre de la lista de temas: viernes 11/12/2026 23:59 (AR) =====
  (function () {
    const CIERRE = new Date('2026-12-11T23:59:00-03:00').getTime();
    const cta = document.getElementById('cta'), left = document.getElementById('cta-left'), note = document.getElementById('cta-note');
    if (!cta || !left) return;
    function upd() {
      const d = CIERRE - Date.now();
      if (d <= 0) {
        cta.classList.add('is-closed'); cta.removeAttribute('href'); cta.setAttribute('aria-disabled', 'true');
        const l = cta.querySelector('.cta-label'); if (l) l.textContent = 'Lista cerrada';
        if (note) note.innerHTML = 'La lista de temas cerró el <b>viernes 11/12 a las 23:59</b>. ¡Nos vemos en la fiesta!';
        left.textContent = ''; return;
      }
      const m = Math.floor(d / 60000), dd = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
      left.textContent = '⏳ Cierra en ' + (dd ? dd + (dd === 1 ? ' día, ' : ' días, ') : '') + hh + ' h ' + mm + ' min';
      setTimeout(upd, 30000);
    }
    upd();
  })();
  tick();

  /* Syne (solo el título de la playlist, abajo de todo): se baja después del load
     para no competir con el primer pantallazo; hasta entonces se ve con Inter 800 */
  const loadSyne = () => {
    if (!('FontFace' in window)) return;
    const f = new FontFace('Syne', 'url(fonts/syne-latin-800.woff2?v=4) format("woff2")', {
      weight: '800', style: 'normal', display: 'swap',
      unicodeRange: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    });
    f.load().then(ff => document.fonts.add(ff)).catch(() => {});
  };
  if (document.readyState === 'complete') loadSyne(); else addEventListener('load', loadSyne, { once: true });

  /* ---------------------------------------------------------------
     Modo liviano automático: muestreo de FPS ~2 s al cargar
  --------------------------------------------------------------- */
  function goLite(why) {
    if (LITE) return;
    LITE = true;
    root.classList.add('lite');
    root.setAttribute('data-mode', 'lite');
    root.setAttribute('data-lite-why', why);
    try { sessionStorage.setItem('eg-mode-auto', 'lite'); } catch (_) {}
    dropVideo(heroVideo); dropVideo(ctaVideo);
    heroVideo.style.transform = '';
    DPR = 1; sizeFx();
    onScroll();
  }
  let autoLite = false;
  try { autoLite = sessionStorage.getItem('eg-mode-auto') === 'lite'; } catch (_) {}
  if (!LITE && !FORCED) {
    if (autoLite) goLite('sesion');
    else {
      const sample = () => {
        if (document.hidden) { document.addEventListener('visibilitychange', sample, { once: true }); return; }
        let n = 0, t0 = 0, hid = false;
        const onHide = () => { hid = true; };
        document.addEventListener('visibilitychange', onHide, { once: true });
        const f = t => {
          if (!t0) t0 = t;
          n++;
          if (t - t0 < 2000) return requestAnimationFrame(f);
          document.removeEventListener('visibilitychange', onHide);
          if (hid) return;
          const fps = (n - 1) * 1000 / (t - t0);
          root.setAttribute('data-fps', fps.toFixed(1));
          if (fps < 45) goLite('fps ' + fps.toFixed(0));
        };
        requestAnimationFrame(f);
      };
      const start = () => setTimeout(sample, 300);
      if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    }
  }
})();
