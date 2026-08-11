export function setTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  if (nextTheme === 'dark') {
    document.body.classList.add('cds--g100');
    document.body.classList.remove('cds--white');
  } else {
    document.body.classList.remove('cds--g100');
  }
  document.body.dataset.theme = nextTheme;
  window.localStorage.setItem('theme', nextTheme);

  const toggle = document.querySelector('#theme-toggle');
  if (toggle) {
    const darkMode = nextTheme === 'dark';
    toggle.setAttribute('aria-pressed', String(darkMode));
    toggle.setAttribute('aria-label', darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    toggle.title = darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  }
}

export function initializeTheme() {
  const savedTheme = window.localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

export function toggleTheme() {
  const isDark = document.body.classList.contains('cds--g100');
  setTheme(isDark ? 'light' : 'dark');
}
