/**
 * @file site/js/components/tour.js
 * 45-Second Guided Presentation Tour for Teachers and Evaluators.
 * Highlights the 4 critical defense milestones with spotlight halos and automated walkthrough.
 */

let tourState = {
  isActive: false,
  isPaused: false,
  currentStage: 0,
  timer: null,
  progressTimer: null,
  elapsedSec: 0,
  totalSec: 45
};

const TOUR_STAGES = [
  {
    idx: 1,
    title: '1. Cryptographic Baseline Integrity (RFC 6962 Merkle DAG)',
    desc: 'Calculates streaming SHA-256 hashes for all protected files and deterministically seals them into a single immutable Merkle Root Apex.',
    targetId: 'heroMerkleTree',
    action: () => {
      document.querySelector('[data-scenario="calm"]')?.click();
      document.getElementById('pipelineTrack')?.children[0]?.click();
    },
    duration: 11
  },
  {
    idx: 2,
    title: '2. Velocity Surge & Canary Sentinel (Threshold Heuristics)',
    desc: 'When change velocity reaches 30% or a hidden canary trap is touched, the system declares a RANSOMWARE incident in zero-time latency.',
    targetId: 'heroMerkleTree',
    action: () => {
      document.querySelector('[data-scenario="attack"]')?.click();
      document.getElementById('pipelineTrack')?.children[2]?.click();
    },
    duration: 11
  },
  {
    idx: 3,
    title: '3. Sub-10s Automated IAM Lockdown & RFC 8032 Signature',
    desc: 'An automated control-plane IAM Deny-All policy immediately revokes compromised credentials, while an incident record is digitally signed with Ed25519.',
    targetId: 'pipelineVisualizer',
    action: () => {
      document.getElementById('pipelineTrack')?.children[3]?.click();
    },
    duration: 11
  },
  {
    idx: 4,
    title: '4. 100% Verified AEAD Recovery & Baseline Validation',
    desc: 'Decrypts backups using AES-256-GCM authenticated tags, restoring all objects with 100% cryptographic match against the baseline Merkle Root.',
    targetId: 'heroMerkleTree',
    action: () => {
      document.querySelector('[data-scenario="restore"]')?.click();
      document.getElementById('pipelineTrack')?.children[5]?.click();
    },
    duration: 12
  }
];

let tourBarEl = null;
let spotlightOverlayEl = null;

function renderTourUI() {
  if (!tourBarEl) {
    tourBarEl = document.createElement('div');
    tourBarEl.id = 'presentationTourBar';
    tourBarEl.className = 'presentation-tour-bar';
    document.body.appendChild(tourBarEl);
  }

  if (!spotlightOverlayEl) {
    spotlightOverlayEl = document.createElement('div');
    spotlightOverlayEl.id = 'tourSpotlightHalo';
    spotlightOverlayEl.className = 'tour-spotlight-halo';
    document.body.appendChild(spotlightOverlayEl);
  }
}

function updateTourBar() {
  if (!tourBarEl) return;
  const s = TOUR_STAGES[tourState.currentStage];
  const percent = Math.min(100, Math.round((tourState.elapsedSec / tourState.totalSec) * 100));

  tourBarEl.innerHTML = `
    <div class="tour-progress-track">
      <div class="tour-progress-fill" style="width:${percent}%;"></div>
    </div>
    <div class="tour-content">
      <div class="tour-lead">
        <span class="tour-badge">45s Presentation Tour</span>
        <span class="tour-timer">${tourState.elapsedSec}s / ${tourState.totalSec}s</span>
        <span class="tour-stage-pill">${s ? `Stage ${s.idx}/4` : ''}</span>
      </div>
      <div class="tour-title">${s ? s.title : ''}</div>
      <div class="tour-desc">${s ? s.desc : ''}</div>
      <div class="tour-actions">
        <button id="tourPrevBtn" class="tour-btn" title="Previous Stage">Previous</button>
        <button id="tourPauseBtn" class="tour-btn primary">${tourState.isPaused ? 'Resume' : 'Pause'}</button>
        <button id="tourNextBtn" class="tour-btn" title="Next Stage">Next</button>
        <button id="tourExitBtn" class="tour-btn close" title="Exit Tour">Exit Tour</button>
      </div>
    </div>
  `;

  tourBarEl.querySelector('#tourPrevBtn')?.addEventListener('click', () => {
    if (tourState.currentStage > 0) goToStage(tourState.currentStage - 1);
  });
  tourBarEl.querySelector('#tourNextBtn')?.addEventListener('click', () => {
    if (tourState.currentStage < TOUR_STAGES.length - 1) goToStage(tourState.currentStage + 1);
    else endPresentationTour();
  });
  tourBarEl.querySelector('#tourPauseBtn')?.addEventListener('click', () => {
    tourState.isPaused = !tourState.isPaused;
    updateTourBar();
  });
  tourBarEl.querySelector('#tourExitBtn')?.addEventListener('click', endPresentationTour);
}

function highlightElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el || !spotlightOverlayEl) return;

  const rect = el.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  spotlightOverlayEl.style.top = `${rect.top + scrollTop - 12}px`;
  spotlightOverlayEl.style.left = `${rect.left + scrollLeft - 12}px`;
  spotlightOverlayEl.style.width = `${rect.width + 24}px`;
  spotlightOverlayEl.style.height = `${rect.height + 24}px`;
  spotlightOverlayEl.classList.add('active');

  // Smooth scroll
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function goToStage(stageIdx) {
  if (stageIdx >= TOUR_STAGES.length) {
    endPresentationTour();
    return;
  }

  tourState.currentStage = stageIdx;
  const s = TOUR_STAGES[stageIdx];
  if (s && typeof s.action === 'function') {
    s.action();
  }
  if (s && s.targetId) {
    highlightElement(s.targetId);
  }
  updateTourBar();
}

export function startPresentationTour() {
  renderTourUI();
  tourState.isActive = true;
  tourState.isPaused = false;
  tourState.elapsedSec = 0;
  tourState.currentStage = 0;

  tourBarEl.classList.add('active');
  goToStage(0);

  if (tourState.progressTimer) clearInterval(tourState.progressTimer);
  tourState.progressTimer = setInterval(() => {
    if (!tourState.isPaused && tourState.isActive) {
      tourState.elapsedSec++;
      updateTourBar();

      // Check stage progression
      if (tourState.elapsedSec === 11) goToStage(1);
      else if (tourState.elapsedSec === 22) goToStage(2);
      else if (tourState.elapsedSec === 33) goToStage(3);
      else if (tourState.elapsedSec >= tourState.totalSec) {
        endPresentationTour();
      }
    }
  }, 1000);
}

export function endPresentationTour() {
  tourState.isActive = false;
  if (tourState.progressTimer) {
    clearInterval(tourState.progressTimer);
    tourState.progressTimer = null;
  }
  if (tourBarEl) tourBarEl.classList.remove('active');
  if (spotlightOverlayEl) spotlightOverlayEl.classList.remove('active');
  document.querySelector('[data-scenario="calm"]')?.click();
}
