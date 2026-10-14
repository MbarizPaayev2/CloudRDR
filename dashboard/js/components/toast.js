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
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    threat: '⚡',
  };

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = iconMap[type] || '•';

  const textSpan = document.createElement('span');
  textSpan.className = 'toast-text';
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Dismiss notice');
  closeBtn.textContent = '✕';
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
