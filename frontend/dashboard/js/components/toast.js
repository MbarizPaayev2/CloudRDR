/**
 * @file dashboard/js/components/toast.js
 * CloudRDR Toast Notification System
 * Built according to Vercel Web Interface Guidelines & Design Motion Principles.
 */

let _toastContainer = null;

function ensureToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      _toastContainer.className = 'toast-container';
      _toastContainer.setAttribute('role', 'region');
      _toastContainer.setAttribute('aria-label', 'Security alerts and system notices');
      _toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message - Message text.
 * @param {'info'|'success'|'warning'|'threat'} [type='info'] - Status type.
 * @param {number} [duration=4000] - Duration in ms.
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute('role', 'status');

  const iconMap = {
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    threat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  };

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.innerHTML = iconMap[type] || iconMap.info;

  const textSpan = document.createElement('span');
  textSpan.className = 'toast-text';
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Dismiss notice');
  closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  closeBtn.addEventListener('click', () => dismissToast(toast));

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  toast.classList.remove('visible');
  toast.classList.add('dismissing');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 250);
}
