/**
 * @file site/js/components/tour.js
 *
 * CloudRDR 45-Second Interactive Presentation Tour for Evaluators & Executives.
 * Built following emil-emil-design-eng and make-interfaces-feel-better principles:
 *   - Non-destructive DOM updates (avoids destroying UI elements every second)
 *   - Tabular figures for jitter-free timer rendering
 *   - Viewport-anchored fixed spotlight halo tracking target elements on scroll/resize
 *   - Direct stage jumping, pause/resume, and keyboard accessibility (Space, Arrows, Esc)
 */

export const TOUR_STAGES = [
  {
    idx: 1,
    title: '1. Cryptographic Baseline Integrity (RFC 6962 Merkle DAG)',
    desc: 'Streams SHA-256 digests for all protected cloud files and deterministically seals them into a single immutable Merkle Root Apex.',
    targetId: 'heroMerkleTree',
    startSec: 0,
    endSec: 11,
    action: () => {
      document.querySelector('[data-scenario="calm"]')?.click();
      const hero = document.getElementById('heroMerkleTree');
      hero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  },
  {
    idx: 2,
    title: '2. Velocity Surge & Canary Decoy Sentinel (Threshold Heuristics)',
    desc: 'When modification velocity surges beyond 30% or a zero-touch canary trap is touched, CloudRDR declares a ransomware incident in sub-second latency.',
    targetId: 'pipelineTrack',
    startSec: 11,
    endSec: 23,
    action: () => {
      document.querySelector('[data-scenario="attack"]')?.click();
      const node = document.querySelectorAll('#pipelineTrack .pipeline-node')[2];
      if (node && typeof node.click === 'function') node.click();
      const section = document.getElementById('pipeline-walkthrough') || document.getElementById('pipelineTrack');
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  },
  {
    idx: 3,
    title: '3. Sub-60s Automated IAM Write Lockdown & RFC 8032 Signature',
    desc: 'An automated control-plane IAM Deny-All policy instantly revokes compromised credentials; the incident record is sealed with an Ed25519 signature.',
    targetId: 'pipelineVisualizer',
    startSec: 23,
    endSec: 34,
    action: () => {
      const node = document.querySelectorAll('#pipelineTrack .pipeline-node')[3];
      if (node && typeof node.click === 'function') node.click();
      const viz = document.getElementById('pipelineVisualizer');
      viz?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  },
  {
    idx: 4,
    title: '4. 100% Cryptographic AEAD Recovery & Verification',
    desc: 'Decrypts authenticated ChaCha20-Poly1305 / AES-256-GCM backups in quarantine, mathematically proving 100% integrity match against the pre-attack baseline.',
    targetId: 'pipelineVisualizer',
    startSec: 34,
    endSec: 45,
    action: () => {
      document.querySelector('[data-scenario="restore"]')?.click();
      const node = document.querySelectorAll('#pipelineTrack .pipeline-node')[5];
      if (node && typeof node.click === 'function') node.click();
      const viz = document.getElementById('pipelineVisualizer');
      viz?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  },
];

let tourState = {
  isActive: false,
  isPaused: false,
  currentStage: 0,
  progressTimer: null,
  elapsedSec: 0,
  totalSec: 45,
};

let tourBarEl = null;
let spotlightOverlayEl = null;

// Cached DOM node references inside tourBarEl
let _progressFillEl = null;
let _timerLabelEl = null;
let _stagePillEl = null;
let _titleEl = null;
let _descEl = null;
let _pauseBtn = null;
let _prevBtn = null;
let _nextBtn = null;
let _stepChips = [];

let _scrollThrottle = null;

/**
 * Recalculate spotlight halo geometry relative to current viewport.
 */
function updateSpotlight() {
  if (!spotlightOverlayEl || !tourState.isActive) return;
  const s = TOUR_STAGES[tourState.currentStage];
  if (!s || !s.targetId) return;

  const targetEl = document.getElementById(s.targetId);
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const padding = 12;

  // Viewport-relative positioning using fixed coordinates
  spotlightOverlayEl.style.top = `${Math.max(8, rect.top - padding)}px`;
  spotlightOverlayEl.style.left = `${Math.max(8, rect.left - padding)}px`;
  spotlightOverlayEl.style.width = `${rect.width + padding * 2}px`;
  spotlightOverlayEl.style.height = `${rect.height + padding * 2}px`;
  spotlightOverlayEl.classList.add('active');
}

function handleViewportChange() {
  if (_scrollThrottle) return;
  _scrollThrottle = requestAnimationFrame(() => {
    updateSpotlight();
    _scrollThrottle = null;
  });
}

/**
 * Handle tour keyboard controls.
 */
function handleKeyDown(e) {
  if (!tourState.isActive) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    endPresentationTour();
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    togglePause();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (tourState.currentStage < TOUR_STAGES.length - 1) {
      goToStage(tourState.currentStage + 1);
    } else {
      endPresentationTour();
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (tourState.currentStage > 0) {
      goToStage(tourState.currentStage - 1);
    }
  }
}

/**
 * Construct the tour bar UI once and bind persistent events.
 */
function renderTourUI() {
  if (!tourBarEl) {
    tourBarEl = document.createElement('div');
    tourBarEl.id = 'presentationTourBar';
    tourBarEl.className = 'presentation-tour-bar';
    tourBarEl.setAttribute('role', 'region');
    tourBarEl.setAttribute('aria-label', 'Interactive 45-Second Presentation Tour');

    tourBarEl.innerHTML = `
      <div class="tour-progress-track" aria-hidden="true">
        <div class="tour-progress-fill" style="width: 0%;"></div>
      </div>
      <div class="tour-content">
        <div class="tour-lead">
          <span class="tour-badge">45s Presentation Tour</span>
          <span class="tour-timer" id="tourTimer">00s / 45s</span>
          <span class="tour-stage-pill" id="tourStagePill">Stage 1 of 4</span>
          <div class="tour-step-jump-group" role="tablist" aria-label="Tour Stages">
            <button type="button" class="tour-step-chip active" data-stage="0" title="Jump to Stage 1">1</button>
            <button type="button" class="tour-step-chip" data-stage="1" title="Jump to Stage 2">2</button>
            <button type="button" class="tour-step-chip" data-stage="2" title="Jump to Stage 3">3</button>
            <button type="button" class="tour-step-chip" data-stage="3" title="Jump to Stage 4">4</button>
          </div>
        </div>
        <div class="tour-title" id="tourTitle"></div>
        <div class="tour-desc" id="tourDesc"></div>
        <div class="tour-actions">
          <button type="button" id="tourPrevBtn" class="tour-btn" title="Previous Stage (ArrowLeft)">Previous</button>
          <button type="button" id="tourPauseBtn" class="tour-btn primary" title="Pause or Resume (Spacebar)">Pause</button>
          <button type="button" id="tourNextBtn" class="tour-btn" title="Next Stage (ArrowRight)">Next</button>
          <button type="button" id="tourExitBtn" class="tour-btn close" title="Exit Presentation Tour (Esc)">Exit Tour</button>
        </div>
      </div>
    `;

    document.body.appendChild(tourBarEl);

    // Cache internal elements
    _progressFillEl = tourBarEl.querySelector('.tour-progress-fill');
    _timerLabelEl = tourBarEl.querySelector('#tourTimer');
    _stagePillEl = tourBarEl.querySelector('#tourStagePill');
    _titleEl = tourBarEl.querySelector('#tourTitle');
    _descEl = tourBarEl.querySelector('#tourDesc');
    _pauseBtn = tourBarEl.querySelector('#tourPauseBtn');
    _prevBtn = tourBarEl.querySelector('#tourPrevBtn');
    _nextBtn = tourBarEl.querySelector('#tourNextBtn');
    _stepChips = Array.from(tourBarEl.querySelectorAll('.tour-step-chip'));

    // Bind event listeners once
    _prevBtn?.addEventListener('click', () => {
      if (tourState.currentStage > 0) goToStage(tourState.currentStage - 1);
    });

    _nextBtn?.addEventListener('click', () => {
      if (tourState.currentStage < TOUR_STAGES.length - 1) {
        goToStage(tourState.currentStage + 1);
      } else {
        endPresentationTour();
      }
    });

    _pauseBtn?.addEventListener('click', togglePause);

    tourBarEl.querySelector('#tourExitBtn')?.addEventListener('click', endPresentationTour);

    _stepChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const stageIdx = parseInt(chip.getAttribute('data-stage'), 10);
        if (!Number.isNaN(stageIdx)) {
          goToStage(stageIdx);
        }
      });
    });
  }

  if (!spotlightOverlayEl) {
    spotlightOverlayEl = document.createElement('div');
    spotlightOverlayEl.id = 'tourSpotlightHalo';
    spotlightOverlayEl.className = 'tour-spotlight-halo';
    document.body.appendChild(spotlightOverlayEl);
  }
}

function togglePause() {
  tourState.isPaused = !tourState.isPaused;
  if (_pauseBtn) {
    _pauseBtn.textContent = tourState.isPaused ? 'Resume' : 'Pause';
    _pauseBtn.setAttribute('title', tourState.isPaused ? 'Resume (Spacebar)' : 'Pause (Spacebar)');
  }
}

/**
 * Updates UI labels and indicators without re-rendering the DOM tree.
 */
function syncStageUI() {
  const s = TOUR_STAGES[tourState.currentStage];
  if (!s) return;

  if (_titleEl) _titleEl.textContent = s.title;
  if (_descEl) _descEl.textContent = s.desc;
  if (_stagePillEl) _stagePillEl.textContent = `Stage ${s.idx} of 4`;

  if (_prevBtn) _prevBtn.disabled = tourState.currentStage === 0;
  if (_nextBtn) {
    _nextBtn.textContent = tourState.currentStage === TOUR_STAGES.length - 1 ? 'Finish' : 'Next';
  }

  _stepChips.forEach((chip, i) => {
    chip.classList.toggle('active', i === tourState.currentStage);
  });

  updateSpotlight();
}

/**
 * Advance to a specific stage index and run its scenario triggers.
 */
export function goToStage(stageIdx) {
  if (stageIdx < 0 || stageIdx >= TOUR_STAGES.length) {
    endPresentationTour();
    return;
  }

  tourState.currentStage = stageIdx;
  const s = TOUR_STAGES[stageIdx];
  tourState.elapsedSec = s.startSec;

  if (typeof s.action === 'function') {
    s.action();
  }

  syncStageUI();
}

/**
 * Start the 45-second interactive presentation tour.
 */
export function startPresentationTour() {
  renderTourUI();

  tourState.isActive = true;
  tourState.isPaused = false;
  tourState.elapsedSec = 0;
  tourState.currentStage = 0;

  if (_pauseBtn) _pauseBtn.textContent = 'Pause';

  tourBarEl.classList.add('active');
  goToStage(0);

  window.addEventListener('scroll', handleViewportChange, { passive: true });
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('keydown', handleKeyDown);

  if (tourState.progressTimer) clearInterval(tourState.progressTimer);

  tourState.progressTimer = setInterval(() => {
    if (!tourState.isActive || tourState.isPaused) return;

    tourState.elapsedSec += 1;

    // Smooth progress update without DOM teardown
    const percent = Math.min(100, Math.round((tourState.elapsedSec / tourState.totalSec) * 100));
    if (_progressFillEl) _progressFillEl.style.width = `${percent}%`;
    if (_timerLabelEl) {
      const paddedSec = String(tourState.elapsedSec).padStart(2, '0');
      _timerLabelEl.textContent = `${paddedSec}s / 45s`;
    }

    // Stage progression triggers
    if (tourState.elapsedSec === 11) {
      goToStage(1);
    } else if (tourState.elapsedSec === 23) {
      goToStage(2);
    } else if (tourState.elapsedSec === 34) {
      goToStage(3);
    } else if (tourState.elapsedSec >= tourState.totalSec) {
      endPresentationTour();
    }
  }, 1000);
}

/**
 * Conclude presentation tour and restore calm scenario baseline.
 */
export function endPresentationTour() {
  tourState.isActive = false;

  if (tourState.progressTimer) {
    clearInterval(tourState.progressTimer);
    tourState.progressTimer = null;
  }

  window.removeEventListener('scroll', handleViewportChange);
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('keydown', handleKeyDown);

  if (tourBarEl) tourBarEl.classList.remove('active');
  if (spotlightOverlayEl) spotlightOverlayEl.classList.remove('active');

  // Reset to calm baseline
  document.querySelector('[data-scenario="calm"]')?.click();
}
