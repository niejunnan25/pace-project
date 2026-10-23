/* Attach offscreen posters/sources only as their video approaches the viewport. */
(function () {
  function prepare(video) {
    if (video.dataset.poster) {
      video.poster = video.dataset.poster;
      delete video.dataset.poster;
    }
    if (video.dataset.src && !video.getAttribute('src')) video.src = video.dataset.src;
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { prepare(e.target); io.unobserve(e.target); }
  }, { rootMargin: '250px 0px' }) : null;
  const seeks = new WeakMap();
  window.PACESeekVideo = (video, time, play = false) => {
    prepare(video);
    const previous = seeks.get(video);
    if (previous) video.removeEventListener('loadedmetadata', previous);
    if (video.readyState >= 1) video.currentTime = time;
    else {
      const apply = () => { video.currentTime = time; seeks.delete(video); };
      seeks.set(video, apply);
      video.addEventListener('loadedmetadata', apply, { once: true });
      video.preload = 'metadata';
      video.load();
    }
    if (play) video.play().catch(() => {});
  };
  window.PACEPrepareVideo = prepare;
  window.PACEObserveMedia = (root = document) => {
    root.querySelectorAll('video[data-poster], video[data-src]').forEach((v) => {
      if (io) io.observe(v); else prepare(v);
      v.addEventListener('pointerdown', () => prepare(v), { once: true });
      v.addEventListener('focus', () => prepare(v), { once: true });
    });
  };
  window.PACEObserveMedia();
})();
