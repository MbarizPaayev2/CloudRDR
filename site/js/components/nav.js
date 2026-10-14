/**
 * @file site/js/components/nav.js
 * Shared Header Navigation & Footer Component.
 */

/**
 * Initialize shared navigation and footer across all pages.
 * @param {Object} [options]
 * @param {string} [options.activePage='']
 * @param {string} [options.basePath='']
 */
export function initSharedNav(options = {}) {
  const basePath = options.basePath || '';
  const activePage = options.activePage || '';

  // 1. Inject or Populate Site Header
  const headerContainer = document.querySelector('#site-header-container');
  if (headerContainer) {
    headerContainer.innerHTML = `
      <header class="site-header" role="banner">
        <div class="container header-inner">
          <a href="${basePath}index.html" class="site-brand" aria-label="CloudRDR Homepage">
            <svg width="38" height="38" viewBox="0 0 240 240" style="flex-shrink:0;">
              <defs>
                <linearGradient id="nav_tfD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#0284C7"/></linearGradient>
                <linearGradient id="nav_lfD" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#1E3A8A"/></linearGradient>
                <linearGradient id="nav_rfD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#047857"/></linearGradient>
                <linearGradient id="nav_rgD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38BDF8"/><stop offset="50%" stop-color="#6366F1"/><stop offset="100%" stop-color="#10B981"/></linearGradient>
              </defs>
              <g transform="translate(120, 124)">
                <path d="M 65,-55 A 85,85 0 1,0 75,40" fill="none" stroke="url(#nav_rgD)" stroke-width="12" stroke-linecap="round" />
                <polygon points="84,22 86,52 58,42" fill="#10B981" />
                <circle cx="0" cy="0" r="66" fill="none" stroke="var(--border)" stroke-width="2.5" stroke-dasharray="3 6" />
                <path d="M -22,-25 V -44 A 22,22 0 0,1 22,-44 V -25" fill="none" stroke="var(--logo-shackle, #1E293B)" stroke-width="9" stroke-linecap="round" />
                <polygon points="0,-42 42,-18 0,6 -42,-18" fill="url(#nav_tfD)" />
                <polygon points="-42,-18 0,6 0,54 -42,30" fill="url(#nav_lfD)" />
                <polygon points="0,6 42,-18 42,30 0,54" fill="url(#nav_rfD)" />
                <polyline points="-20,-18 0,-30 20,-18" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
                <line x1="0" y1="6" x2="0" y2="36" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
                <circle cx="0" cy="6" r="6" fill="#FFFFFF" /><circle cx="0" cy="-30" r="4.5" fill="#FFFFFF" />
                <circle cx="-20" cy="-18" r="4.5" fill="#FFFFFF" /><circle cx="20" cy="-18" r="4.5" fill="#FFFFFF" />
              </g>
            </svg>
            <span>Cloud<span style="color:#38BDF8">R</span><span style="color:#0EA5E9">D</span><span style="color:#10B981">R</span></span>
          </a>

          <ul class="nav-links" id="mainNavLinks">
            <li><a href="${basePath}index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Overview</a></li>
            <li><a href="${basePath}how-it-works.html" class="nav-link ${activePage === 'how' ? 'active' : ''}">How It Works</a></li>
            <li><a href="${basePath}demo/index.html" class="nav-link ${activePage === 'demo' ? 'active' : ''}">Live Demo</a></li>
            <li><a href="${basePath}team.html" class="nav-link ${activePage === 'team' ? 'active' : ''}">Team</a></li>
            <li><a href="${basePath}docs.html" class="nav-link ${activePage === 'docs' ? 'active' : ''}">ISMS Docs</a></li>
          </ul>

          <div class="header-actions">
            <button type="button" id="themeToggleBtn" class="theme-toggle-btn" aria-label="Toggle color mode" title="Toggle Theme">
              <!-- Dynamically populated icon -->
            </button>

            <a href="/login" class="nav-link" style="font-size:0.85rem;padding:4px 8px;font-weight:600;">Sign In</a>

            <button type="button" class="mobile-nav-toggle" id="mobileNavBtn" aria-label="Toggle navigation menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  // 2. Inject or Populate Site Footer
  const footerContainer = document.querySelector('#site-footer-container');
  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer class="site-footer" role="contentinfo">
        <div class="container footer-inner">
          <div style="display:flex;align-items:center;gap:12px;">
            <svg width="28" height="28" viewBox="0 0 240 240" style="flex-shrink:0;">
              <g transform="translate(120, 124)">
                <path d="M 65,-55 A 85,85 0 1,0 75,40" fill="none" stroke="url(#nav_rgD)" stroke-width="14" stroke-linecap="round" />
                <polygon points="84,22 86,52 58,42" fill="#10B981" />
                <path d="M -22,-25 V -44 A 22,22 0 0,1 22,-44 V -25" fill="none" stroke="var(--logo-shackle, #1E293B)" stroke-width="10" stroke-linecap="round" />
                <polygon points="0,-42 42,-18 0,6 -42,-18" fill="url(#nav_tfD)" />
                <polygon points="-42,-18 0,6 0,54 -42,30" fill="url(#nav_lfD)" />
                <polygon points="0,6 42,-18 42,30 0,54" fill="url(#nav_rfD)" />
                <polyline points="-20,-18 0,-30 20,-18" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
                <line x1="0" y1="6" x2="0" y2="36" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
                <circle cx="0" cy="6" r="6" fill="#FFFFFF" />
              </g>
            </svg>
            <div>
              <strong>Cloud<span style="color:#38BDF8">R</span><span style="color:#0EA5E9">D</span><span style="color:#10B981">R</span></strong> — Cloud Ransomware Detection &amp; Cryptographic Recovery Platform
            </div>
          </div>
          <ul class="footer-links">
            <li><a href="${basePath}how-it-works.html">How It Works</a></li>
            <li><a href="${basePath}demo/index.html">Product Demo</a></li>
            <li><a href="${basePath}team.html">Project Team</a></li>
            <li><a href="${basePath}docs.html">Documents</a></li>
          </ul>
        </div>
      </footer>
    `;
  }

  // 3. Theme Toggle & State Management
  function getEffectiveTheme() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return 'dark'; // Cyber SOC Obsidian as default
  }

  function renderThemeToggle(theme) {
    const btn = document.querySelector('#themeToggleBtn');
    if (!btn) return;
    const isDark = theme === 'dark';
    btn.innerHTML = isDark
      ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  const savedTheme = localStorage.getItem('cloudrdr-theme');
  const initialTheme = savedTheme || 'dark'; // Always default to Cyber Dark for maximum eye comfort
  document.documentElement.setAttribute('data-theme', initialTheme);
  renderThemeToggle(initialTheme);

  const themeBtn = document.querySelector('#themeToggleBtn');
  themeBtn?.addEventListener('click', () => {
    // Spring feedback
    themeBtn.style.transform = 'scale(0.88) rotate(15deg)';
    setTimeout(() => {
      themeBtn.style.transform = '';
    }, 160);

    const current = getEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cloudrdr-theme', next);
    renderThemeToggle(next);
  });

  // 4. Mobile nav toggle
  const mobileBtn = document.querySelector('#mobileNavBtn');
  const navLinks = document.querySelector('#mainNavLinks');
  mobileBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
  });
}
