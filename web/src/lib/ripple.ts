// Global Material-style click ripple for tactile button feedback.
// Attaches one listener; any .btn / .tile / .action-chip / [data-ripple]
// (which are position:relative; overflow:hidden) gets a ripple on press.

const SELECTOR = '.btn, .tile, .action-chip, [data-ripple]';

export function installRipple() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const ev = e as PointerEvent;
      const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>(SELECTOR);
      if (!target || target.hasAttribute('disabled')) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple-ink';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${ev.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${ev.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    },
    { passive: true },
  );
}
