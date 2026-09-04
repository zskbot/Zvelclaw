(() => {
  const drawer = document.querySelector('.drawer');
  const menu = document.querySelector('[data-menu]');
  if (!drawer || !menu) return;

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
})();
