/* Start full-page downloads after the first painted hero, or on browsing intent. */
(function () {
  const root = document.documentElement;
  const urls = window.PACE_PAGE_SCRIPTS;
  const wall = document.getElementById('wall');
  const events = new AbortController();
  const initialHash = location.hash;
  let pending = null, ready = false, idle = null;
  root.classList.add('page-pending');

  function script(url) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.async = false;
      el.src = url;
      el.onload = resolve;
      el.onerror = () => { el.remove(); reject(new Error('Could not load ' + url)); };
      document.body.appendChild(el);
    });
  }
  function start(reason) {
    if (ready) return Promise.resolve();
    if (pending) return pending;
    if (idle !== null && window.cancelIdleCallback) cancelIdleCallback(idle);
    root.dataset.pageLoadReason = reason;
    root.dataset.pageState = 'loading';
    // Fetch the app alongside its dependencies, but execute it only after they succeed.
    if (!document.querySelector('link[data-page-app]')) {
      const preload = document.createElement('link');
      preload.rel = 'preload'; preload.as = 'script'; preload.href = urls[3];
      preload.dataset.pageApp = ''; document.head.appendChild(preload);
    }
    pending = Promise.all(urls.slice(0, 3).map(script)).then(() => script(urls[3])).then(() => {
      ready = true;
      root.dataset.pageState = 'ready';
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
      root.classList.remove('page-pending');
      if (initialHash && initialHash !== '#top' && location.hash === initialHash) document.getElementById(decodeURIComponent(initialHash.slice(1)))?.scrollIntoView();
      events.abort();
    }).catch((error) => {
      pending = null;
      root.dataset.pageState = 'error';
      // Keep static content readable; the next browsing action retries the scripts.
      console.warn(error.message);
    });
    return pending;
  }
  const options = { passive: true, signal: events.signal };
  window.addEventListener('scroll', () => { if (scrollY > 24) start('scroll'); }, options);
  window.addEventListener('wheel', (e) => { if (e.deltaY > 0) start('scroll-intent'); }, options);
  window.addEventListener('touchmove', () => start('scroll-intent'), options);
  document.addEventListener('keydown', (e) => {
    if (['PageDown', 'ArrowDown', 'End', ' '].includes(e.key) && !e.target.closest('input,textarea,button,a,[contenteditable]')) start('keyboard');
  }, { signal: events.signal });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') !== '#top') {
      const hash = a.getAttribute('href');
      start('navigation').then(() => {
        if (location.hash === hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, { signal: events.signal });
  document.addEventListener('pace:navigate', (e) => {
    const id = e.detail.id;
    start('navigation').then(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, { signal: events.signal });

  // The poster or a decoded video frame is enough; never wait for the whole video.
  const visual = new Promise((resolve) => {
    let observer;
    const done = () => { observer?.disconnect(); wall.removeEventListener('loadeddata', done); resolve(); };
    const posterURL = new URL(wall.poster, document.baseURI).href;
    wall.addEventListener('loadeddata', done, { once: true });
    if (wall.readyState >= 2 || performance.getEntriesByName(posterURL).some((e) => e.responseEnd > 0)) { done(); return; }
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes('resource')) {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((e) => e.name === posterURL && e.responseEnd > 0)) done();
      });
      observer.observe({ type: 'resource', buffered: true });
    } else {
      const poster = new Image();
      poster.onload = done; poster.onerror = done; poster.src = wall.poster;
    }
  });
  const painted = window.PACEFirstPaint;
  if ((location.hash && location.hash !== '#top') || scrollY > 24) start('navigation');
  Promise.all([painted, visual]).then(() => {
    if (ready || pending) return;
    if ('requestIdleCallback' in window) idle = requestIdleCallback(() => start('idle-after-hero'), { timeout: 1500 });
    else start('after-hero');
  });
})();
