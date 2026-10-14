/**
 * @file dashboard/js/components/verdictStamp.js
 *
 * Verdict display: updates the large verdict word in the sidebar,
 * the stamp overlay, and body class for page-edge red wash.
 *
 * Security: uses textContent only, no innerHTML.
 */

const VERDICT_CONFIG = {
  normal: {
    word: 'NORMAL',
    sub: 'All systems operating within parameters',
    bodyClass: 'verdict-normal',
    stampClass: null,
    stampText: null,
  },
  suspicious: {
    word: 'SUSPICIOUS',
    sub: 'Elevated change rate detected — monitoring',
    bodyClass: 'verdict-suspicious',
    stampClass: 'restoring',
    stampText: '⚡ SUSPICIOUS',
  },
  ransomware: {
    word: 'RANSOMWARE',
    sub: 'Attack in progress — account frozen',
    bodyClass: 'verdict-ransomware',
    stampClass: 'open',
    stampText: '⚠ RANSOMWARE',
  },
};

let _lastVerdict = null;

/**
 * Update all verdict-related UI elements.
 * @param {string} verdict - 'normal'|'suspicious'|'ransomware'
 * @param {boolean} canaryTriggered
 */
export function updateVerdictStamp(verdict, canaryTriggered = false) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.normal;

  // 1. Verdict word
  const wordEl = document.getElementById('verdictWord');
  if (wordEl) {
    wordEl.textContent = cfg.word;
    // Replace all verdict classes
    wordEl.className = `verdict-word ${verdict}`;
    wordEl.setAttribute('aria-label', `Verdict: ${cfg.word}`);
  }

  // 2. Verdict sub-text
  const subEl = document.getElementById('verdictSub');
  if (subEl) {
    subEl.textContent = canaryTriggered && verdict === 'ransomware'
      ? 'Canary file touched — attack confirmed'
      : cfg.sub;
  }

  // 3. Stamp overlay
  const stampEl = document.getElementById('verdictStampEl');
  if (stampEl) {
    if (cfg.stampText) {
      stampEl.textContent = cfg.stampText;
      stampEl.className = `status-stamp ${cfg.stampClass || ''}`;
      stampEl.style.display = 'inline-block';
      // Trigger stamp animation if verdict changed
      if (verdict !== _lastVerdict) {
        stampEl.classList.remove('stamped');
        // Force reflow so animation replays
        void stampEl.offsetWidth;
        stampEl.classList.add('stamped');
      }
    } else {
      stampEl.style.display = 'none';
    }
  }

  // 4. Body class for red wash animation
  document.body.classList.remove('verdict-normal', 'verdict-suspicious', 'verdict-ransomware');
  document.body.classList.add(cfg.bodyClass);

  _lastVerdict = verdict;
}
