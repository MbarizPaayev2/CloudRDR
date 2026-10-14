/**
 * @file site/js/motion.js
 * CloudRDR Motion Engine
 * Inspired by Motion v11+ / Framer Motion principles:
 * - Spring physics (stiffness, damping, visualDuration, bounce)
 * - Gesture recognition (whileHover, whileTap)
 * - Staggered reveals (staggerChildren)
 * - Shared layout indicators (layoutId emulation)
 * - AnimatePresence exit & enter transitions
 * Respects prefers-reduced-motion for accessibility.
 */

const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Spring easing presets (KaTeX / Bezier approximations of Framer Motion springs)
 */
export const SPRINGS = {
  snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  gentle: 'cubic-bezier(0.25, 1, 0.5, 1)',
  stiff: 'cubic-bezier(0, 0, 0.2, 1)',
};

/**
 * Attach whileTap and whileHover spring gestures to interactive buttons and cards.
 * Mirrors Framer Motion: whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }}
 */
export function initGestures() {
  if (prefersReducedMotion) return;

  const interactiveSelector = `
    .btn,
    .theme-toggle-btn,
    .tree-tab-btn,
    .tab-btn,
    .metric-item,
    .spotlight-card,
    .doc-item,
    .soc-cmd-pill,
    .soc-incident-btn
  `;

  document.querySelectorAll(interactiveSelector).forEach((el) => {
    // Avoid double-binding
    if (el.dataset.motionBound) return;
    el.dataset.motionBound = 'true';

    // whileHover & whileTap
    el.style.transition = el.style.transition
      ? `${el.style.transition}, transform 140ms ${SPRINGS.snappy}, box-shadow 200ms ${SPRINGS.gentle}`
      : `transform 140ms ${SPRINGS.snappy}, box-shadow 200ms ${SPRINGS.gentle}`;

    el.addEventListener('pointerdown', () => {
      el.style.transform = 'scale(0.965) translateY(1px)';
    });

    const reset = () => {
      el.style.transform = '';
    };

    el.addEventListener('pointerup', reset);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
  });
}

/**
 * Stagger entrance animation for child elements.
 * Mirrors Framer Motion: variants with { transition: { staggerChildren: 0.06 } }
 * @param {HTMLElement|string} container - Parent element or selector
 * @param {string} childSelector - Selector for child items
 * @param {number} [staggerMs=55] - Delay between children in ms
 */
export function staggerReveal(container, childSelector, staggerMs = 55) {
  if (prefersReducedMotion) return;

  const parent = typeof container === 'string' ? document.querySelector(container) : container;
  if (!parent) return;

  const children = parent.querySelectorAll(childSelector);
  children.forEach((child, index) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(14px)';
    child.style.transition = `opacity 320ms ${SPRINGS.gentle}, transform 360ms ${SPRINGS.snappy}`;
    child.style.transitionDelay = `${index * staggerMs}ms`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        child.style.opacity = '1';
        child.style.transform = 'translateY(0)';
      });
    });
  });
}

/**
 * Shared layout transition emulation for segmented tab controls.
 * Mirrors Framer Motion layoutId="activePill"
 * Smoothly morphs or slides active state.
 * @param {string} containerSelector - Toolbar / tab nav selector
 * @param {string} tabSelector - Tab buttons selector
 */
export function initSharedLayoutTabs(containerSelector, tabSelector) {
  const containers = document.querySelectorAll(containerSelector);
  containers.forEach((container) => {
    const tabs = container.querySelectorAll(tabSelector);
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Spring feedback on the clicked active tab
        if (!prefersReducedMotion) {
          tab.style.transform = 'scale(0.94)';
          setTimeout(() => {
            tab.style.transform = '';
          }, 120);
        }
      });
    });
  });
}

/**
 * AnimatePresence Enter: animate modal or popover with spring physics.
 * @param {HTMLElement} el
 */
export function animatePresenceEnter(el) {
  if (!el || prefersReducedMotion) return;
  el.style.opacity = '0';
  el.style.transform = 'scale(0.96) translateY(8px)';
  el.style.transition = `opacity 240ms ${SPRINGS.gentle}, transform 320ms ${SPRINGS.bounce}`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1) translateY(0)';
    });
  });
}

/**
 * Global Motion Engine Initializer
 */
export function initMotionEngine() {
  initGestures();
  initSharedLayoutTabs('#heroTreeControls', '.tree-tab-btn');
  initSharedLayoutTabs('.tab-nav', '.tab-btn');

  // Stagger reveal metrics strip when visible
  const metricsGrid = document.querySelector('.metrics-grid');
  if (metricsGrid && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            staggerReveal(metricsGrid, '.metric-item', 70);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(metricsGrid);
  }

  // Observe dynamic additions (e.g. modals, lists) to re-bind gestures
  const mutationObserver = new MutationObserver((mutations) => {
    let shouldRebind = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        shouldRebind = true;
        break;
      }
    }
    if (shouldRebind) {
      initGestures();
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// Auto-run if DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotionEngine);
  } else {
    initMotionEngine();
  }
}
