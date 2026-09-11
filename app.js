(() => {
  const drawer = document.querySelector('.drawer');
  const menu = document.querySelector('[data-menu]');

  if (drawer) {
    const existingCodespaces = drawer.querySelector('a[href="codespaces.html"]');
    if (!existingCodespaces) {
      const codesLink = document.createElement('a');
      codesLink.href = 'codespaces.html';
      codesLink.innerHTML = '<span class="ico">08</span>Codespaces';
      const settingsLink = drawer.querySelector('a[href="settings.html"]');
      if (settingsLink) drawer.insertBefore(codesLink, settingsLink);
      else drawer.appendChild(codesLink);
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
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

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
