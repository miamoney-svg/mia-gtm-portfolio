(() => {
  const root = document.getElementById('hero');
  const scene = root.querySelector('.meadow-scene');
  const grass = root.querySelector('.meadow-grass');
  const toggle = root.querySelector('.meadow-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !scene.animate) return;

  // Reuse the original foreground pixels; the mask excludes the path and trees.
  function resize() {
    const width = root.clientWidth, height = root.clientHeight;
    const ratio = width / height, source = 1400 / 876;
    const cropWidth = ratio < source ? 876 * ratio : 1400;
    const cropHeight = ratio > source ? 1400 / ratio : 876;
    const x = (1400 - cropWidth) * (width <= 600 ? 0.7 : 0.5);
    grass.setAttribute('viewBox', `${x} ${(876 - cropHeight) / 2} ${cropWidth} ${cropHeight}`);
  }
  new ResizeObserver(resize).observe(root);
  resize();
  grass.removeAttribute('hidden');
  const zoom = scene.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.10)' }],
    { duration: 8000, easing: 'cubic-bezier(0.35, 0, 0.25, 1)', fill: 'forwards' }
  );
  let playing = true, zoomFinished = false;
  root.dataset.motion = 'zooming';
  toggle.hidden = false;
  function labels() {
    toggle.textContent = playing ? 'Pause motion' : 'Resume motion';
    toggle.setAttribute('aria-pressed', String(!playing));
  }
  labels();
  toggle.addEventListener('click', () => {
    playing = !playing;
    if (playing) {
      if (!zoomFinished) zoom.play();
      grass.unpauseAnimations();
    } else {
      if (!zoomFinished) zoom.pause();
      grass.pauseAnimations();
    }
    labels();
  });
  zoom.addEventListener('finish', () => { zoomFinished = true; root.dataset.motion = 'foreground-only'; });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      zoom.finish();
      grass.setAttribute('hidden', '');
      grass.pauseAnimations();
      toggle.hidden = true;
    }
  });
})();
