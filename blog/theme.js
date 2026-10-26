(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'guangzhao-blog-theme';
  let theme = 'dark';
  try {
    if (localStorage.getItem(storageKey) === 'light') theme = 'light';
  } catch {
    // The toggle still works when browser storage is unavailable.
  }
  root.dataset.theme = theme;

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animating = false;
    let previousEdge = -1;

    function updateLabel() {
      const label = root.dataset.theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    updateLabel();
    button.hidden = false;
    function applyTheme(nextTheme) {
      root.dataset.theme = nextTheme;
      updateLabel();
      try {
        localStorage.setItem(storageKey, root.dataset.theme);
      } catch {
        // Keep the selected theme for this page even without persistence.
      }
    }

    function waveGeometry() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Pick a different edge each time, with a random origin along that edge.
      const edges = [0, 1, 2, 3].filter(edge => edge !== previousEdge);
      const edge = edges[Math.floor(Math.random() * edges.length)];
      previousEdge = edge;
      const along = 0.15 + Math.random() * 0.7;
      const origins = [
        [-80, height * along], [width + 80, height * along],
        [width * along, -80], [width * along, height + 80],
      ];
      const [x, y] = origins[edge];
      const band = Math.min(100, Math.max(64, width * 0.08));
      const radius = Math.max(
        Math.hypot(x, y), Math.hypot(width - x, y),
        Math.hypot(x, height - y), Math.hypot(width - x, height - y),
      ) + band;
      return { x, y, radius, band };
    }

    async function changeTheme() {
      if (animating) return;
      const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      if (reducedMotion.matches) {
        applyTheme(nextTheme);
        return;
      }
      if (!document.startViewTransition) {
        root.classList.add('theme-fade');
        applyTheme(nextTheme);
        window.setTimeout(() => root.classList.remove('theme-fade'), 450);
        return;
      }

      animating = true;
      button.setAttribute('aria-disabled', 'true');
      const { x, y, radius, band } = waveGeometry();
      const glass = document.createElement('div');
      glass.className = 'theme-wave';
      glass.setAttribute('aria-hidden', 'true');
      document.body.append(glass);
      root.style.setProperty('--tide-x', `${x}px`);
      root.style.setProperty('--tide-y', `${y}px`);
      root.style.setProperty('--tide-band', `${band}px`);
      root.classList.add('theme-tide');

      let transition;
      const animations = [];
      const skip = () => transition?.skipTransition();
      const onVisibility = () => { if (document.hidden) skip(); };
      window.addEventListener('resize', skip, { once: true });
      document.addEventListener('visibilitychange', onVisibility);
      reducedMotion.addEventListener('change', skip, { once: true });
      try {
        transition = document.startViewTransition(() => applyTheme(nextTheme));
        await transition.ready;
        const timing = { duration: 1800, easing: 'cubic-bezier(0.37, 0, 0.22, 1)', fill: 'both' };
        const reveal = root.animate([
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
        ], { ...timing, pseudoElement: '::view-transition-new(root)' });
        animations.push(reveal);

        // Interpolate a typed length, rather than swapping discrete gradient images.
        // The band shape, blur, tint, duration, and easing are unchanged.
        const shimmer = root.animate([
          { '--tide-radius': '0px' },
          { '--tide-radius': `${radius}px` },
        ], {
          ...timing, pseudoElement: '::view-transition-group(theme-wave)',
        });
        animations.push(shimmer);
        // Both layers share an exact clock, including on a busy main thread.
        const startTime = document.timeline.currentTime;
        reveal.startTime = startTime;
        shimmer.startTime = startTime;
        // A skipped transition can finish while its animations are still suspended.
        await Promise.race([
          Promise.all(animations.map(animation => animation.finished)),
          transition.finished,
        ]);
        await transition.finished;
      } catch {
        // Resizes, background tabs, or unsupported animation features may skip the effect.
        transition?.skipTransition();
        applyTheme(nextTheme);
        if (transition) await transition.finished.catch(() => {});
      } finally {
        animations.forEach(animation => animation.cancel());
        window.removeEventListener('resize', skip);
        document.removeEventListener('visibilitychange', onVisibility);
        reducedMotion.removeEventListener('change', skip);
        glass.remove();
        root.classList.remove('theme-tide');
        for (const property of ['--tide-x', '--tide-y', '--tide-band']) {
          root.style.removeProperty(property);
        }
        button.removeAttribute('aria-disabled');
        animating = false;
      }
    }

    button.addEventListener('click', changeTheme);
  });
})();
