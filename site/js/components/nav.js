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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--brand);">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            CloudRDR
            <span class="brand-badge">Academic Project</span>
          </a>

          <ul class="nav-links" id="mainNavLinks">
            <li><a href="${basePath}index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Overview</a></li>
            <li><a href="${basePath}how-it-works.html" class="nav-link ${activePage === 'how' ? 'active' : ''}">How It Works</a></li>
            <li><a href="${basePath}demo/index.html" class="nav-link ${activePage === 'demo' ? 'active' : ''}">Live Demo</a></li>
            <li><a href="${basePath}team.html" class="nav-link ${activePage === 'team' ? 'active' : ''}">Team</a></li>
            <li><a href="${basePath}docs.html" class="nav-link ${activePage === 'docs' ? 'active' : ''}">ISMS Docs</a></li>
          </ul>

          <div class="header-actions">
            <button id="themeToggleBtn" class="theme-toggle-btn" aria-label="Toggle light and dark color mode" title="Toggle Theme">
              <svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>

            <a href="${basePath}demo/index.html" class="btn btn-primary btn-sm">
              Open the demo ↗
            </a>

            <button class="mobile-nav-toggle" id="mobileNavBtn" aria-label="Toggle navigation menu">
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
          <div>
            <strong>CloudRDR</strong> // Information Security, Year 3 University Capstone (ISMS, Cloud Security, Cryptography)
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

  // 3. Theme toggle logic
  const savedTheme = localStorage.getItem('cloudrdr-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const themeBtn = document.querySelector('#themeToggleBtn');
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cloudrdr-theme', next);
  });

  // 4. Mobile nav toggle
  const mobileBtn = document.querySelector('#mobileNavBtn');
  const navLinks = document.querySelector('#mainNavLinks');
  mobileBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
  });
}
