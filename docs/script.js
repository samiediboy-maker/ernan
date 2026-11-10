(() => {
  const button = document.querySelector('.theme-toggle');
  const sync = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک');
    button.title = dark ? 'حالت روشن' : 'حالت تاریک';
  };
  button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('ernan-theme', theme); } catch (_) {}
    sync();
  });
  sync();
})();
(() => {
  const section = document.querySelector('.hero-scroll');
  const video = section?.querySelector('video');
  if (!video || section.classList.contains('own-photo-hero')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ready = false, scheduled = false, target = 0;
  const fail = () => {
    section.classList.add('video-failed');
    section.classList.remove('video-ready');
    section.querySelector('.video-status').textContent = 'ویدیو بارگذاری نشد؛ تصویر جایگزین نمایش داده می‌شود.';
  };
  const seek = () => {
    if (ready && !video.seeking && Math.abs(video.currentTime - target) > .025) {
      try { video.currentTime = target; } catch (_) { /* Await next media event. */ }
    }
  };
  const update = () => {
    scheduled = false;
    const rect = section.getBoundingClientRect();
    const distance = Math.max(1, section.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    section.style.setProperty('--progress', progress);
    section.style.setProperty('--copy-opacity', Math.max(0, 1 - progress * 4));
    target = (reduced.matches ? .9 : progress) * Math.max(0, video.duration - .05);
    seek();
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  const loaded = () => {
    if (!Number.isFinite(video.duration)) return;
    ready = true;
    video.pause();
    section.classList.add('video-ready');
    schedule();
  };
  video.addEventListener('loadeddata', loaded);
  video.addEventListener('seeked', seek);
  video.addEventListener('error', fail);
  video.querySelector('source').addEventListener('error', fail);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  if (video.readyState >= 2) loaded();
})();

(() => {
  const section = document.querySelector('.own-photo-hero');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pending = false;
  const update = () => {
    pending = false;
    const p = reduced.matches ? 0 : Math.max(0, Math.min(1, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight-innerHeight)));
    section.style.setProperty('--progress', p);
    section.style.setProperty('--copy-opacity', Math.max(0, 1-p*3));
    section.style.setProperty('--photo-scale', 1+p*.12);
  };
  const schedule = () => { if (!pending) { pending=true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  schedule();
})();
