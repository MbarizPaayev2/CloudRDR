/**
 * @file dashboard/js/components/tour.js
 *
 * CloudRDR SOC Interactive Product Tour.
 * Formulated following Prowler tour specifications (prowler-tour).
 * Guides SOC operators through the six critical defense surfaces using data-tour-id attributes.
 */

export const TOUR_STEPS = [
  {
    tourId: 'tour-status-strip',
    title: 'Real-Time Defense Health Strip',
    description:
      'Continuous telemetry monitoring the detection engine, cloud storage links, Merkle baseline roots, and ChaCha20-Poly1305 / AES-256-GCM AEAD backup integrity.',
    placement: 'bottom',
  },
  {
    tourId: 'tour-simulate-attack',
    title: 'Controlled Attack Simulation Harness',
    description:
      'Test CloudRDR in a safe, sandboxed environment. Triggers a high-velocity ransomware attack pattern to verify automated write isolation and canary tripwire reactions.',
    placement: 'bottom',
  },
  {
    tourId: 'tour-nav-detection',
    title: 'Sliding-Window Anomaly Detection',
    description:
      'Inspect real-time storage event rates. Evaluates modifications against historical baselines and trips containment when rate thresholds (e.g. >30% change) are violated.',
    placement: 'right',
  },
  {
    tourId: 'tour-nav-incidents',
    title: 'Incident Containment & Ed25519 Dossiers',
    description:
      'View isolated incidents with sub-60s automated IAM write freeze records. Every incident is signed with Ed25519 keys for legal non-repudiation.',
    placement: 'right',
  },
  {
    tourId: 'tour-nav-recovery',
    title: 'Two-Phase Verified Quarantine Recovery',
    description:
      'Restore files with cryptographic guarantees. Data is first verified against pre-attack SHA-256 hashes in quarantine before requiring explicit operator promotion.',
    placement: 'right',
  },
  {
    tourId: 'tour-nav-audit',
    title: 'Tamper-Evident Hash-Chained Audit Ledger',
    description:
      'Immutable audit trail linking genesis to the current tip via cryptographic SHA-256 pointers. Conforms to NIST CSF v2.0, ISO 27001, and HIPAA § 164.312 requirements.',
    placement: 'right',
  },
];

let currentStepIndex = 0;
let tourOverlayElement = null;

/**
 * Start or restart the product tour.
 */
export function startProductTour() {
  currentStepIndex = 0;
  renderTourStep();
}

/**
 * End the tour and clean up DOM elements.
 */
export function stopProductTour() {
  if (tourOverlayElement) {
    tourOverlayElement.remove();
    tourOverlayElement = null;
  }
  document.querySelectorAll('.tour-highlight-active').forEach((el) => {
    el.classList.remove('tour-highlight-active');
  });
}

/**
 * Render the current step modal and highlight target element.
 */
function renderTourStep() {
  stopProductTour();

  const step = TOUR_STEPS[currentStepIndex];
  if (!step) return;

  const targetEl = document.querySelector(`[data-tour-id="${step.tourId}"]`);
  if (targetEl) {
    targetEl.classList.add('tour-highlight-active');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  tourOverlayElement = document.createElement('div');
  tourOverlayElement.className = 'prowler-tour-modal-backdrop';
  tourOverlayElement.innerHTML = `
    <div class="prowler-tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div class="prowler-tour-header">
        <span class="prowler-tour-step-count">Step ${currentStepIndex + 1} of ${TOUR_STEPS.length}</span>
        <button type="button" class="prowler-tour-close-btn" id="tourCloseBtn" aria-label="Close tour">&times;</button>
      </div>
      <h3 id="tourTitle" class="prowler-tour-title">${step.title}</h3>
      <p class="prowler-tour-desc">${step.description}</p>
      <div class="prowler-tour-footer">
        <button type="button" class="btn btn-secondary btn-sm" id="tourPrevBtn" ${currentStepIndex === 0 ? 'disabled' : ''}>Previous</button>
        <div style="flex: 1"></div>
        <button type="button" class="btn btn-primary btn-sm" id="tourNextBtn">
          ${currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(tourOverlayElement);

  document.getElementById('tourCloseBtn')?.addEventListener('click', stopProductTour);
  document.getElementById('tourPrevBtn')?.addEventListener('click', () => {
    if (currentStepIndex > 0) {
      currentStepIndex -= 1;
      renderTourStep();
    }
  });
  document.getElementById('tourNextBtn')?.addEventListener('click', () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      currentStepIndex += 1;
      renderTourStep();
    } else {
      stopProductTour();
    }
  });
}
