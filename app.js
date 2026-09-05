(() => {
  const drawer = document.querySelector('.drawer');
  const menu = document.querySelector('[data-menu]');
  const isHome = /(?:^|\/)Zvelclaw\/?$|(?:^|\/)Zvelclaw\/index\.html$|\/index\.html$/.test(window.location.pathname);
  const isCodespaces = /\/pages\/codespaces\.html$/.test(window.location.pathname);

  if (drawer) {
    const existingCodespaces = drawer.querySelector('a[href="codespaces.html"]');
    if (!existingCodespaces) {
      const codesLink = document.createElement('a');
      codesLink.href = isHome ? '#codespaces' : 'codespaces.html';
      codesLink.innerHTML = '<span class="ico">08</span>Codespaces';
      const settingsLink = drawer.querySelector('a[href="settings.html"]');
      if (settingsLink) drawer.insertBefore(codesLink, settingsLink);
      else drawer.appendChild(codesLink);
    } else if (isHome) {
      existingCodespaces.href = '#codespaces';
    }
  }

  if (isCodespaces) {
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('.page-navlinks')) {
      const nav = document.createElement('nav');
      nav.className = 'page-navlinks';
      nav.setAttribute('aria-label', 'Điều hướng trang');
      nav.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto;margin-right:12px;flex-wrap:wrap;';
      nav.innerHTML = `
        <a href="../" style="padding:7px 10px;border:1px solid transparent;border-radius:7px;color:var(--muted);text-decoration:none;font-size:13px;white-space:nowrap;">Tổng quan</a>
        <a href="../#deploy" style="padding:7px 10px;border:1px solid transparent;border-radius:7px;color:var(--muted);text-decoration:none;font-size:13px;white-space:nowrap;">Deploy</a>
        <a href="codespaces.html" aria-current="page" style="padding:7px 10px;border:1px solid var(--line);border-radius:7px;color:inherit;text-decoration:none;font-size:13px;white-space:nowrap;">Codespaces</a>`;
      const title = topbar.querySelector('.page-title');
      if (title) topbar.insertBefore(nav, title);
      else topbar.appendChild(nav);
    }
  }

  if (drawer && menu) {
    const setOpen = (open) => {
      drawer.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
    };

    const currentPath = window.location.pathname.replace(/\\/g, '/');
    drawer.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) return;

      if (isHome && href === '#codespaces') {
        link.addEventListener('click', () => setOpen(false));
        return;
      }

      if (href.startsWith('#')) return;

      const target = new URL(href, window.location.href).pathname.replace(/\\/g, '/');
      const current = currentPath.endsWith('/') ? `${currentPath}index.html` : currentPath;
      const normalizedTarget = target.endsWith('/') ? `${target}index.html` : target;

      if (current === normalizedTarget) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }

      link.addEventListener('click', () => setOpen(false));
    });

    menu.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');

    menu.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!drawer.classList.contains('open'));
    });

    document.addEventListener('click', (event) => {
      if (drawer.classList.contains('open') && !drawer.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('open')) {
        setOpen(false);
        menu.focus();
      }
    });
  }

  if (isHome) {
    const existing = document.querySelector('#codespaces');
    if (!existing) {
      const section = document.createElement('section');
      section.id = 'codespaces';
      section.style.cssText = 'max-width:1180px;margin:0 auto 100px;padding:0 40px;scroll-margin-top:90px;';
      section.innerHTML = `
        <div style="background:var(--ink-2);border:1px solid var(--line);overflow:hidden;">
          <div style="padding:22px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <div><div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--claw);margin-bottom:7px;">08 · CODESPACES</div><h2 style="font-size:28px;font-weight:600;">Cloud development, ngay trong Zvelclaw.</h2><p style="margin-top:8px;color:var(--muted);font-size:14px;">Codespaces được tích hợp trực tiếp vào trang GitHub Pages này.</p></div>
            <a class="btn btn-primary" href="pages/codespaces.html">Mở workspace →</a>
          </div>
          <div style="padding:0;">
            <iframe title="Zvelclaw Codespaces" src="pages/codespaces.html" loading="lazy" style="display:block;width:100%;height:780px;border:0;background:var(--ink);"></iframe>
          </div>
        </div>`;
      const footer = document.querySelector('footer');
      if (footer) footer.parentNode.insertBefore(section, footer);
      else document.body.appendChild(section);
    }
  }

  const form = document.querySelector('#task-form');
  const result = document.querySelector('#task-result');
  if (!form || !result) return;

  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const description = form.elements.description.value.trim();
    const project = form.elements.project.value;
    const executionMode = form.elements.executionMode.value;

    if (description.length < 8) {
      result.textContent = 'ERROR · Mô tả task phải có ít nhất 8 ký tự.';
      return;
    }

    button.disabled = true;
    result.textContent = 'CREATING · Đang tạo task...';

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, project, executionMode })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

      result.textContent = `CREATED · ${data.task.id}`;
      form.reset();

      if (data.url) {
        const link = document.createElement('a');
        link.href = data.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = ' Mở task manifest →';
        result.appendChild(link);
      }
    } catch (error) {
      result.textContent = `ERROR · ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
})();
