(() => {
  const isHome = /(?:^|\/)Zvelclaw\/?$|(?:^|\/)Zvelclaw\/index\.html$|\/index\.html$/.test(window.location.pathname);
  const isCodespaces = /\/pages\/codespaces\.html$/.test(window.location.pathname);

  // Restore the original two-page navigation model:
  // GitHub Pages home and the standalone Zvelclaw/Codespaces page.
  if (isHome) {
    const topnav = document.querySelector('.topnav');
    if (topnav && !topnav.querySelector('[data-menu]')) {
      const menuButton = document.createElement('button');
      menuButton.className = 'menu-btn';
      menuButton.setAttribute('data-menu', '');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-controls', 'site-navigation');
      menuButton.setAttribute('aria-label', 'Mở menu');
      menuButton.type = 'button';
      menuButton.innerHTML = '<span class="hamb"><i></i><i></i><i></i></span>';
      topnav.insertBefore(menuButton, topnav.firstElementChild);

      const drawer = document.createElement('aside');
      drawer.className = 'drawer';
      drawer.id = 'site-navigation';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.innerHTML = `
        <div class="drawer-head">ZVELCLAW / NAVIGATION</div>
        <a href="pages/new.html"><span class="ico">01</span>Mới</a>
        <a href="pages/projects.html"><span class="ico">02</span>Dự án</a>
        <a href="pages/artifacts.html"><span class="ico">03</span>Cổ vật</a>
        <a href="pages/codes.html"><span class="ico">04</span>Mã số</a>
        <a href="pages/customize.html"><span class="ico">05</span>Tùy chỉnh</a>
        <a href="pages/design.html"><span class="ico">06</span>Thiết kế</a>
        <a href="pages/codespaces.html"><span class="ico">08</span>Codespaces</a>
        <a href="pages/settings.html"><span class="ico">07</span>Cài đặt</a>`;
      document.body.insertBefore(drawer, document.body.firstElementChild);

      const style = document.createElement('style');
      style.textContent = `
        .menu-btn{width:42px;height:42px;border:1px solid var(--line);background:var(--ink-2);color:var(--bone);cursor:pointer;display:grid;place-items:center;flex:0 0 auto}
        .hamb{width:19px;height:14px;display:flex;flex-direction:column;justify-content:space-between}
        .hamb i{height:2px;background:currentColor;width:100%;display:block}
        .drawer{position:fixed;inset:68px auto 0 0;width:310px;background:#101319;border-right:1px solid var(--line);z-index:49;transform:translateX(-102%);transition:.22s ease;padding:20px}
        .drawer.open{transform:none}
        .drawer-head{font:11px 'IBM Plex Mono',monospace;color:var(--muted);padding:8px 12px 14px}
        .drawer a{display:flex;align-items:center;gap:12px;padding:14px 12px;border:1px solid transparent;color:var(--bone-dim);margin-bottom:3px}
        .drawer a:hover,.drawer a.active{background:var(--ink-2);border-color:var(--line);color:var(--bone)}
        .drawer .ico{width:24px;color:var(--claw);font:13px 'IBM Plex Mono',monospace}
        @media(max-width:860px){.drawer{width:min(310px,90vw)}.menu-btn{width:40px;height:40px}}
      `;
      document.head.appendChild(style);

      const setOpen = (open) => {
        drawer.classList.toggle('open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        drawer.setAttribute('aria-hidden', String(!open));
      };

      drawer.querySelectorAll('a[href]').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
      });
      menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(!drawer.classList.contains('open'));
      });
      document.addEventListener('click', (event) => {
        if (drawer.classList.contains('open') && !drawer.contains(event.target) && event.target !== menuButton) setOpen(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && drawer.classList.contains('open')) {
          setOpen(false);
          menuButton.focus();
        }
      });
    }
  }

  const drawer = document.querySelector('.drawer');
  const menu = document.querySelector('[data-menu]');

  if (drawer) {
    const existingCodespaces = drawer.querySelector('a[href="codespaces.html"], a[href="pages/codespaces.html"], a[href="#codespaces"]');
    if (!existingCodespaces && !isHome) {
      const codesLink = document.createElement('a');
      codesLink.href = 'codespaces.html';
      codesLink.innerHTML = '<span class="ico">08</span>Codespaces';
      const settingsLink = drawer.querySelector('a[href="settings.html"]');
      if (settingsLink) drawer.insertBefore(codesLink, settingsLink);
      else drawer.appendChild(codesLink);
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

  if (drawer && menu && !(isHome && menu.dataset.drawerBound === 'true')) {
    const setOpen = (open) => {
      drawer.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
    };

    const currentPath = window.location.pathname.replace(/\\/g, '/');
    drawer.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) return;
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
    menu.dataset.drawerBound = 'true';

    if (!isHome) {
      menu.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(!drawer.classList.contains('open'));
      });

      document.addEventListener('click', (event) => {
        if (drawer.classList.contains('open') && !drawer.contains(event.target)) setOpen(false);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && drawer.classList.contains('open')) {
          setOpen(false);
          menu.focus();
        }
      });
    }
  }

  // The GitHub Pages homepage remains standalone. Do not embed Codespaces here.
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