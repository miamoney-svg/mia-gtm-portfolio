(() => {
  const root = document.getElementById('hero');
  const image = root.querySelector('.meadow-landscape');
  const toggle = root.querySelector('.meadow-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !image.animate) return;

  const zoom = image.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }],
    { duration: 18000, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' }
  );
  root.dataset.motion = 'zooming';
  toggle.hidden = false;
  toggle.textContent = 'Pause zoom';
  toggle.addEventListener('click', () => {
    const paused = zoom.playState !== 'paused';
    paused ? zoom.pause() : zoom.play();
    toggle.textContent = paused ? 'Resume zoom' : 'Pause zoom';
    toggle.setAttribute('aria-pressed', String(paused));
    root.dataset.motion = paused ? 'paused' : 'zooming';
  });
  zoom.addEventListener('finish', () => {
    root.dataset.motion = 'settled';
    toggle.hidden = true;
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) zoom.finish();
  });
})();
