/* v2 scroll behaviour: dial hero, sticky statement, ticket parallax, nav theme, reveals.
   Vanilla JS, no dependencies. Respects prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- build the dial: 60 ticks + 12 numbers ---------- */
  var ticks = document.getElementById('dialTicks'), nums = document.getElementById('dialNums');
  if (ticks && nums) {
    for (var i = 0; i < 60; i++) {
      var a = (i / 60) * Math.PI * 2, major = i % 5 === 0;
      var r1 = major ? 144 : 152, r2 = 160;
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', 200 + Math.sin(a) * r1); ln.setAttribute('y1', 200 - Math.cos(a) * r1);
      ln.setAttribute('x2', 200 + Math.sin(a) * r2); ln.setAttribute('y2', 200 - Math.cos(a) * r2);
      ln.setAttribute('stroke-width', major ? 3 : 1.2);
      ticks.appendChild(ln);
    }
    for (var n = 1; n <= 12; n++) {
      var an = (n / 12) * Math.PI * 2, t = document.createElementNS(NS, 'text');
      t.setAttribute('x', 200 + Math.sin(an) * 124); t.setAttribute('y', 200 - Math.cos(an) * 124);
      t.textContent = String(n); nums.appendChild(t);
    }
  }

  /* ---------- dial hands: live clock, plus a progress ring tied to scroll ---------- */
  var hH = document.getElementById('handHour'), hM = document.getElementById('handMin'), hS = document.getElementById('handSec');
  var ring = document.getElementById('dialProgress'), statusText = document.getElementById('statusText');
  var hero = document.getElementById('hero');
  function setHands(d) {
    var s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    hS.style.transform = 'rotate(' + (s * 6) + 'deg)';
    hM.style.transform = 'rotate(' + (m * 6) + 'deg)';
    hH.style.transform = 'rotate(' + (h * 30) + 'deg)';
  }
  if (hH) {
    setHands(new Date());
    if (!reduce) { (function tick() { setHands(new Date()); requestAnimationFrame(tick); })(); }
    else { hS.style.display = 'none'; }   /* reduced motion: static dial, no sweeping seconds hand */
  }
  function statusFor(p) { return p < 0.08 ? 'Starting' : p < 0.5 ? 'In progress' : p < 0.95 ? 'Almost there' : 'Complete'; }
  function updateRing() {
    if (!ring || !hero) return;
    var r = hero.getBoundingClientRect(), vh = window.innerHeight;
    /* 0 at top of page, 1 once the hero has scrolled ~70% out of view */
    var p = Math.max(0, Math.min(1, (-r.top) / (r.height * 0.7)));
    /* start part-filled so the dial reads as "in progress" at load */
    var shown = reduce ? 1 : 0.12 + p * 0.88;
    ring.style.strokeDashoffset = String(100 - shown * 100);
    if (statusText) statusText.textContent = reduce ? 'Complete' : statusFor(shown);
  }

  /* ---------- sticky dark statement: giant words slide, ticket parallax ---------- */
  var statement = document.getElementById('statement');
  var giantSpans = statement ? statement.querySelectorAll('.giant span') : [];
  var ticket = statement ? statement.querySelector('.ticket') : null;
  function updateStatement() {
    if (!statement || reduce) return;
    var r = statement.getBoundingClientRect(), total = r.height - window.innerHeight;
    if (total <= 0) return;
    var p = Math.max(0, Math.min(1, -r.top / total));
    giantSpans.forEach(function (s, i) {
      var dir = i % 2 === 0 ? -1 : 1;                /* alternate left / right */
      s.style.transform = 'translateX(' + (dir * (p - 0.5) * 18) + 'vw)';
    });
    if (ticket && window.innerWidth > 900) {
      ticket.style.transform = 'translateY(calc(-50% + ' + ((0.5 - p) * 70) + 'px)) rotate(' + ((p - 0.5) * 3) + 'deg)';
    }
  }

  /* ---------- nav flips light/dark depending on the scene underneath ---------- */
  var nav = document.getElementById('siteNav');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  function updateNav() {
    if (!nav) return;
    var y = nav.offsetHeight / 2, onDark = false;
    for (var i = 0; i < scenes.length; i++) {
      var r = scenes[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { onDark = scenes[i].classList.contains('dark'); break; }
    }
    nav.classList.toggle('on-dark', onDark);
  }

  /* ---------- one rAF-throttled scroll handler ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { updateRing(); updateStatement(); updateNav(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateRing(); updateStatement(); updateNav();

  /* ---------- reveal on scroll ---------- */
  var targets = document.querySelectorAll('.pcard, .proof > div, .sunbed-list li, .ba-card, .section-head, .quote > div:first-child');
  targets.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  } else { targets.forEach(function (el) { el.classList.add('in'); }); }
})();
