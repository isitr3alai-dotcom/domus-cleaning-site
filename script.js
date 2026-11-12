/* DomusClean247: no dependencies.
   Booking: validate -> send to the Domus backend (Google Sheet + calendar + alerts) if
   DOMUS_API is set; otherwise hand off to WhatsApp with the details prefilled. */
(function () {
  'use strict';
  var WA = '447931265549';
  // Deploy Domus-Backend-Code.gs as a Web app, then paste its /exec URL here:
  var DOMUS_API = "";

  function post(payload) {
    return fetch(DOMUS_API, { method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- reviews: approved ones from the backend + on-site form ---------- */
  if (DOMUS_API) {
    var cb = 'domusReviews_' + Date.now();
    window[cb] = function (res) {
      if (!res || !res.ok || !res.reviews || !res.reviews.length) return;
      var grid = document.getElementById('reviews-grid');
      res.reviews.forEach(function (r) {
        var n = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
        var f = document.createElement('figure'); f.className = 'rcard';
        f.innerHTML = '<div class="stars" aria-label="' + n + ' out of 5">' + '★'.repeat(n) + '</div><blockquote>“' + esc(r.text) +
          '”</blockquote><figcaption><b>' + esc(r.name) + '</b><span>' + esc(r.service) + (r.date ? ' · ' + esc(r.date) : '') + '</span></figcaption>';
        grid.appendChild(f);
      });
    };
    var sc = document.createElement('script');
    sc.src = DOMUS_API + (DOMUS_API.indexOf('?') > -1 ? '&' : '?') + 'action=reviews&callback=' + cb;
    document.body.appendChild(sc);

    var rf = document.getElementById('review-form');
    rf.hidden = false;
    rf.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('r-name').value.trim(), text = document.getElementById('r-text').value.trim();
      document.getElementById('err-review').classList.toggle('show', !name || !text);
      if (!name || !text) return;
      post({ type: 'review', name: name, rating: document.getElementById('r-rating').value,
        service: document.getElementById('r-service').value, text: text }).catch(function () {});
      rf.querySelectorAll('input,textarea').forEach(function (el) { el.value = ''; });
      document.getElementById('review-thanks').hidden = false;
    });
  }

  /* ---------- mobile menu ---------- */
  var menu = document.querySelector('.menu'), nav = document.querySelector('.nav');
  menu.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- toast ---------- */
  var toast = document.getElementById('toast'), toastMsg = document.getElementById('toast-msg'), toastTimer;
  function showToast(msg) {
    toastMsg.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3200);
  }

  /* ---------- gallery filter ---------- */
  var tabs = document.querySelectorAll('.tab-btn'), items = document.querySelectorAll('.gallery-item');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      tabs.forEach(function (b) { var on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
      items.forEach(function (it) { it.classList.toggle('is-hidden', !(f === 'all' || it.dataset.cat === f)); });
    });
  });

  /* ---------- oven before/after slider (drag, touch, keyboard) ---------- */
  var slider = document.getElementById('oven-slider');
  if (slider) {
    var pos = 50, dragging = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    slider.setAttribute('tabindex', '0'); slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-valuemin', '0'); slider.setAttribute('aria-valuemax', '100');
    function set(p) {
      pos = Math.max(0, Math.min(100, p));
      slider.style.setProperty('--pos', pos + '%');
      slider.setAttribute('aria-valuenow', String(Math.round(pos)));
    }
    function fromEvent(e) {
      var r = slider.getBoundingClientRect(), x = e.touches ? e.touches[0].clientX : e.clientX;
      return ((x - r.left) / r.width) * 100;
    }
    slider.addEventListener('mousedown', function (e) { dragging = true; set(fromEvent(e)); });
    window.addEventListener('mousemove', function (e) { if (dragging) set(fromEvent(e)); });
    window.addEventListener('mouseup', function () { dragging = false; });
    slider.addEventListener('touchstart', function (e) { dragging = true; set(fromEvent(e)); }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (dragging) set(fromEvent(e)); }, { passive: true });
    window.addEventListener('touchend', function () { dragging = false; });
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { set(pos - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { set(pos + 5); e.preventDefault(); }
    });
    set(50);
    /* one-off auto-wipe demo the first time it scrolls into view (skipped if reduced motion) */
    if (!reduce && 'IntersectionObserver' in window) {
      var played = false;
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || played) return;
          played = true; obs.disconnect();
          var from = 88, to = 30, t0 = null, dur = 1700;
          function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
          function step(ts) {
            if (dragging) return;
            if (t0 === null) t0 = ts;
            var k = Math.min(1, (ts - t0) / dur);
            set(from + (to - from) * ease(k));
            if (k < 1) requestAnimationFrame(step);
          }
          set(from); requestAnimationFrame(step);
        });
      }, { threshold: 0.4 }).observe(slider);
    }
  }

  /* ---------- "book this service" buttons prefill the form ---------- */
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = document.getElementById('f-service');
      if (sel) sel.value = a.dataset.service;
    });
  });

  /* ---------- booking form ---------- */
  var form = document.getElementById('booking-form');
  var dateEl = document.getElementById('f-date');
  function isoToday() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0]; }
  dateEl.min = isoToday();

  function err(id, show, text) {
    var el = document.getElementById(id);
    if (text) el.textContent = text;
    el.classList.toggle('show', show);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var name = v('f-name'), phone = v('f-phone'), email = v('f-email'), service = document.getElementById('f-service').value,
        date = dateEl.value, time = document.getElementById('f-time').value, address = v('f-address'),
        products = document.getElementById('f-products').selectedOptions[0].textContent, notes = v('f-notes');
    var ok = true, today = isoToday();

    if (!name) { err('err-name', true); ok = false; } else err('err-name', false);
    if (phone.length < 8) { err('err-phone', true); ok = false; } else err('err-phone', false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err('err-email', true); ok = false; } else err('err-email', false);
    if (!service) { err('err-service', true); ok = false; } else err('err-service', false);
    if (!date || date < today) { err('err-date', true, date && date < today ? 'Please select a future date.' : 'Please select a date.'); ok = false; } else err('err-date', false);
    if (!address) { err('err-address', true); ok = false; } else err('err-address', false);
    if (!ok) { var first = form.querySelector('.form-error.show'); if (first) first.closest('label').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    var btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.firstChild.textContent = 'Sending... ';

    var msg = "Hi Domus Cleaning!\n\nI'd like to book a clean:\n\n" +
      '• Name: ' + name + '\n• Service: ' + service + '\n• Date: ' + date + (time ? ' (' + time + ')' : '') +
      '\n• Address: ' + address + '\n• Phone: ' + phone + '\n• Email: ' + email +
      '\n• Products: ' + products + (notes ? '\n• Notes: ' + notes : '') +
      '\n\nPlease confirm when available. Thank you!';
    var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);

    function showConfirm(sent) {
      document.getElementById('booking-form-wrap').style.display = 'none';
      document.getElementById('confirm-name').textContent = name.split(' ')[0];
      document.getElementById('confirm-wa').href = url;
      if (!sent) {
        // Nothing has been stored yet: the booking only reaches Domus once they press Send in WhatsApp.
        document.getElementById('confirm-eyebrow').textContent = 'Almost done';
        document.getElementById('confirm-title').textContent = 'One more step';
        document.getElementById('confirm-text').textContent = 'Tap Send in WhatsApp to confirm your booking — your details are already filled in.';
        document.getElementById('confirm-wa').textContent = 'Open WhatsApp again ↗';
      }
      var c = document.getElementById('booking-confirm'); c.hidden = false; c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(sent ? 'Booking request sent' : 'Opening WhatsApp…');
      if (!sent) setTimeout(function () { window.open(url, '_blank', 'noopener'); }, 900);
    }
    if (DOMUS_API) {
      post({ type: 'booking', name: name, phone: phone, email: email, service: service, date: date,
        time: time, address: address, products: products, notes: notes })
        .then(function () { showConfirm(true); }).catch(function () { showConfirm(false); });
    } else {
      setTimeout(function () { showConfirm(false); }, 400);
    }
  });
})();
