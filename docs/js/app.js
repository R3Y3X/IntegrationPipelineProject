import { loadContent } from './content.js';
import { initConfluentEnablement } from './confluent-enablement.js';
import { initWxdiEnablement } from './wxdi-enablement.js';
import { siteData, findLab, findStandalonePage } from './data.js';
import { getHomeRoute, getLabRoute, parseRoute } from './router.js';
import { initializeTheme, toggleTheme } from './theme.js';

const HOME_SECTION_IDS = new Set(['available-technologies', 'available-workshops', 'nosotros', 'acerca-de']);

const homeView = document.querySelector('#home-view');
const labView = document.querySelector('#lab-view');
const labShell = document.querySelector('#lab-shell');
const subnavEl = document.querySelector('#subnav-region');
const subnavItems = document.querySelector('#subnav-items');
const siteNavItems = document.querySelector('#site-nav-items');
const themeToggle = document.querySelector('#theme-toggle');
const hamburgerBtn = document.querySelector('#hamburger-btn');
const sideNav = document.querySelector('#side-nav');
const sideNavOverlay = document.querySelector('#side-nav-overlay');
const sideNavItemsMobile = document.querySelector('#side-nav-items-mobile');

function getHashTarget() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return null;
  if (raw.startsWith('/lab/') || raw.startsWith('lab/')) return null;
  const id = raw.replace(/^\//, '').split('/')[0];
  return HOME_SECTION_IDS.has(id) ? id : null;
}

function scrollToHomeSection(sectionId) {
  suppressScrollSpy(sectionId ? 500 : 250);
  if (!sectionId) {
    setNavActive(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  const el = document.getElementById(sectionId);
  if (!el) return;
  const targetTop = Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER_H);
  setNavActive(sectionId);
  window.scrollTo({ top: targetTop, behavior: 'auto' });
}

function setNavActive(sectionId) {
  siteNavItems.querySelectorAll('.hub-header-menu__trigger').forEach((trigger) => {
    trigger.removeAttribute('aria-current');
  });
  siteNavItems.querySelectorAll('a.cds--header__menu-item').forEach((link) => {
    const href = link.getAttribute('href') || '';
    let isCurrent = false;
    if (sectionId) {
      isCurrent = href === `#${sectionId}`;
    } else {
      isCurrent = href === '#/' || href === '#';
    }
    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function updateNavCurrent() {
  const route = parseRoute(window.location.hash || '#/');
  const currentHash = window.location.hash || '#/';
  // Primero limpiar todos
  siteNavItems.querySelectorAll('.cds--header__menu-item').forEach((link) => {
    link.removeAttribute('aria-current');
  });
  siteNavItems.querySelectorAll('.hub-header-menu__trigger').forEach((trigger) => {
    trigger.removeAttribute('aria-current');
  });
  if (route.view === 'page' || route.view === 'lab') {
    // Marcar el link de nav cuyo href coincide con el hash actual
    siteNavItems.querySelectorAll('.cds--header__menu-item').forEach((link) => {
      if ((link.getAttribute('href') || '') === currentHash) {
        link.setAttribute('aria-current', 'page');
        link.closest('.hub-header-menu')?.querySelector('.hub-header-menu__trigger')?.setAttribute('aria-current', 'page');
      }
    });
  } else {
    setNavActive(getHashTarget());
  }
}

const SPY_SECTIONS = ['available-technologies', 'available-workshops', 'nosotros', 'acerca-de'];
const HEADER_H = 48;
let scrollSpyRaf = null;
let scrollSpyBound = false;
let scrollSpySuppressedUntil = 0;
let scrollSpyResumeTimer = null;
let labTocObserver = null;

function suppressScrollSpy(duration) {
  scrollSpySuppressedUntil = Date.now() + duration;
  window.clearTimeout(scrollSpyResumeTimer);
  scrollSpyResumeTimer = window.setTimeout(() => {
    scrollSpySuppressedUntil = 0;
  }, duration);
}

function runScrollSpy() {
  scrollSpyRaf = null;
  if (homeView.hidden) return;
  if (Date.now() < scrollSpySuppressedUntil) return;
  const scrollY = window.scrollY;
  const trigger = scrollY + HEADER_H + 8;
  const atBottom = (window.innerHeight + scrollY) >= (document.body.scrollHeight - 64);
  if (atBottom) { setNavActive('acerca-de'); return; }
  let active = null;
  for (const id of SPY_SECTIONS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.offsetTop <= trigger) active = id;
  }
  setNavActive(active);
}

function onScrollSpy() {
  if (scrollSpyRaf) return;
  scrollSpyRaf = requestAnimationFrame(runScrollSpy);
}

function initScrollSpy() {
  window.removeEventListener('scroll', onScrollSpy);
  scrollSpyBound = false;
  window.addEventListener('scroll', onScrollSpy, { passive: true });
  scrollSpyBound = true;
  runScrollSpy();
}

function teardownScrollSpy() {
  window.removeEventListener('scroll', onScrollSpy);
  scrollSpyBound = false;
  if (scrollSpyRaf) { cancelAnimationFrame(scrollSpyRaf); scrollSpyRaf = null; }
}

// ── Lab ToC ──────────────────────────────────────────────────────
function teardownLabToc() {
  labTocObserver?.disconnect();
  labTocObserver = null;
}

function getLabHeadingId(heading, prefix, usedIds) {
  if (heading.id) { usedIds.add(heading.id); return heading.id; }
  const base = heading.textContent.trim().toLocaleLowerCase('es').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'seccion';
  let id = `${prefix}-${base}`;
  let suffix = 2;
  while (usedIds.has(id) || document.getElementById(id)) { id = `${prefix}-${base}-${suffix}`; suffix += 1; }
  heading.id = id;
  usedIds.add(id);
  return id;
}

function setActiveLabTocLink(toc, id) {
  toc.querySelectorAll('.lab-toc__link').forEach((link) => {
    if (link.dataset.tocTarget === id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function buildPageToc(proseEl, prefix, routeBase = '') {
  teardownLabToc();
  const layout = proseEl.closest('.lab-reading-layout');
  if (!layout) return;
  layout.classList.remove('lab-reading-layout--no-toc');
  const usedIds = new Set();
  const headings = Array.from(proseEl.querySelectorAll('h2'))
    .map((h) => ({ id: getLabHeadingId(h, prefix, usedIds), label: h.textContent.trim() }))
    .filter(({ label }) => label.length > 0);
  if (headings.length < 2) return;
  const toc = document.createElement('aside');
  toc.className = 'lab-toc';
  toc.setAttribute('aria-label', 'En esta página');
  toc.innerHTML = `
    <p class="lab-toc__title">En esta página</p>
    <nav class="lab-toc__nav" aria-label="Secciones">
      <ul class="lab-toc__list">
        ${headings.map(({ id, label }) => `<li><a class="lab-toc__link" href="${routeBase}" data-toc-target="${id}">${escapeHtml(label)}</a></li>`).join('')}
      </ul>
    </nav>`;
  layout.append(toc);
  const scrollToTarget = (link) => {
    const target = document.getElementById(link.dataset.tocTarget);
    if (!target) return;
    setActiveLabTocLink(toc, target.id);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  toc.addEventListener('click', (event) => {
    const link = event.target.closest('.lab-toc__link');
    if (!link) return;
    event.preventDefault();
    scrollToTarget(link);
  });
  toc.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      const link = event.target.closest('.lab-toc__link');
      if (!link) return;
      event.preventDefault();
      scrollToTarget(link);
    }
  });
  setActiveLabTocLink(toc, headings[0].id);
  labTocObserver = new IntersectionObserver((entries) => {
    const active = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (active) setActiveLabTocLink(toc, active.target.id);
  }, { rootMargin: '-144px 0px -62% 0px', threshold: 0 });
  headings.forEach(({ id }) => { const h = document.getElementById(id); if (h) labTocObserver.observe(h); });
}

function buildLabToc(proseEl, lab, step) {
  buildPageToc(proseEl, `${lab.slug}-${step.slug}`, getLabRoute(lab.slug, step.slug));
}

function buildStandaloneToc(proseEl, pageSlug) {
  buildPageToc(proseEl, `page-${pageSlug}`, `#/page/${pageSlug}`);
}

// ── SideNav ──────────────────────────────────────────────────────
function openSideNav() {
  sideNav.classList.add('cds--side-nav--expanded');
  sideNav.setAttribute('aria-hidden', 'false');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  hamburgerBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
  sideNavOverlay.classList.add('is-visible');
  sideNavOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('hub-side-nav-open');
}

function closeSideNav() {
  sideNav.classList.remove('cds--side-nav--expanded');
  sideNav.setAttribute('aria-hidden', 'true');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  hamburgerBtn.setAttribute('aria-label', 'Abrir menú de navegación');
  sideNavOverlay.classList.remove('is-visible');
  sideNavOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('hub-side-nav-open');
}

// ── Nav ──────────────────────────────────────────────────────────
function renderPlatformNav() {
  siteNavItems.innerHTML = siteData.topNav.map((item, index) => {
    if (!item.children) {
      return `<li><a class="cds--header__menu-item" href="${item.href}">${escapeHtml(item.label)}</a></li>`;
    }
    return `
      <li class="hub-header-menu">
        <button class="cds--header__menu-item hub-header-menu__trigger" type="button"
          aria-expanded="false" aria-controls="header-menu-${index}">
          ${escapeHtml(item.label)}
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 11 3 6l1.4-1.4L8 8.2l3.6-3.6L13 6z"/></svg>
        </button>
        <ul class="hub-header-menu__panel" id="header-menu-${index}" hidden>
          ${item.children.map((child) => `<li><a class="cds--header__menu-item hub-header-menu__child" href="${child.href}">${escapeHtml(child.label)}</a></li>`).join('')}
        </ul>
      </li>`;
  }).join('');

  const navLinks = siteData.topNav.map((item, index) => {
    if (!item.children) {
      return `<li><a class="cds--side-nav__link" href="${item.href}">${escapeHtml(item.label)}</a></li>`;
    }
    return `
      <li class="hub-side-nav__group">
        <button class="cds--side-nav__link hub-side-nav__group-trigger" type="button"
          aria-expanded="false" aria-controls="side-menu-${index}">
          <span>${escapeHtml(item.label)}</span><span aria-hidden="true">⌄</span>
        </button>
        <ul id="side-menu-${index}" class="hub-side-nav__children" hidden>
          ${item.children.map((child) => `<li><a class="cds--side-nav__link cds--side-nav__link--sub" href="${child.href}">${escapeHtml(child.label)}</a></li>`).join('')}
        </ul>
      </li>`;
  }).join('');
  const labLinks = siteData.sections.map((section) => {
    const labItems = section.labs.map((lab) =>
      `<li><a class="cds--side-nav__link cds--side-nav__link--sub" href="${getLabRoute(lab.slug)}">${lab.title}</a></li>`
    ).join('');
    return `<li class="hub-side-nav__section-label">${section.title}</li>${labItems}`;
  }).join('');
  sideNavItemsMobile.innerHTML = navLinks + labLinks;

  siteNavItems.querySelectorAll('.hub-header-menu__trigger').forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const setOpen = (open) => {
      trigger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    };
    trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { setOpen(false); trigger.focus(); }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
        panel.querySelector('a')?.focus();
      }
    });
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { setOpen(false); trigger.focus(); }
    });
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  });

  sideNavItemsMobile.querySelectorAll('.hub-side-nav__group-trigger').forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });
  });

  document.addEventListener('click', (event) => {
    siteNavItems.querySelectorAll('.hub-header-menu').forEach((menu) => {
      if (menu.contains(event.target)) return;
      const trigger = menu.querySelector('.hub-header-menu__trigger');
      const panel = menu.querySelector('.hub-header-menu__panel');
      trigger.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    });
  });
  siteNavItems.querySelectorAll('a.cds--header__menu-item').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = (link.getAttribute('href') || '').replace(/^#\/?/, '');
      const isHomeLink = target === '';
      if (!isHomeLink && !HOME_SECTION_IDS.has(target)) return;
      event.preventDefault();
      const sectionId = isHomeLink ? null : target;
      const destination = sectionId ? `#${sectionId}` : getHomeRoute();
      setNavActive(sectionId);
      suppressScrollSpy(sectionId ? 500 : 250);
      if (window.location.hash !== destination) window.location.hash = destination;
      else scrollToHomeSection(sectionId);
    });
  });
  updateNavCurrent();
}

async function renderPage(pageSlug) {
  const page = findStandalonePage(pageSlug);
  if (!page) { window.location.hash = '#/'; return; }

  // Ocultar home, mostrar lab-view (reutiliza el mismo contenedor)
  if (page.category) {
    document.body.setAttribute('data-category', page.category);
  } else {
    document.body.removeAttribute('data-category');
  }
  document.body.classList.remove('hub-view--home');
  document.body.classList.add('hub-view--lab');
  homeView.hidden = true;
  labView.hidden = false;
  teardownScrollSpy();

  // SIN subnav — página independiente
  subnavEl.setAttribute('hidden', '');
  subnavEl.style.display = 'none';

  // Shell simple sin ToC ni step nav
  labShell.className = 'lab-shell lab-shell--standalone';
  labShell.innerHTML = `
    <div class="lab-reading-layout">
      <div class="prose prose--full">
        <div id="lab-content-area"></div>
      </div>
    </div>
  `;

  const contentArea = labShell.querySelector('#lab-content-area');
  const html = await loadContent(page.file);
  contentArea.innerHTML = html;

  executeInlineScripts(contentArea);
  enhanceLabContent(contentArea, '');
  bindImageFallbacks(contentArea);

  if (pageSlug === 'confluent') {
    initConfluentEnablement(contentArea);
  }
  if (pageSlug === 'watsonx-data-integration') {
    initWxdiEnablement(contentArea);
  }

  const proseEl = labShell.querySelector('.prose');
  if (proseEl) buildStandaloneToc(proseEl, pageSlug);

  updateNavCurrent();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderTag(tag) {
  const tone = tag.tone || 'gray';
  return `<span class="cds--tag cds--tag--${escapeHtml(tone)}">${escapeHtml(tag.label)}</span>`;
}

function getMetadataTags(item) {
  const metadata = item.metadata || {};
  return [
    metadata.modality && { label: metadata.modality, tone: 'cool-gray' },
    metadata.duration && { label: metadata.duration, tone: 'gray' },
    metadata.stack && { label: metadata.stack, tone: metadata.stackTone || 'purple' },
    !metadata.stack && metadata.platform && { label: metadata.platform, tone: metadata.platformTone || 'purple' }
  ].filter(Boolean);
}

function ensureLabBanner(proseEl, section, lab, step) {
  let banner = proseEl.querySelector('.lab-banner');
  if (!banner) {
    const panel = proseEl.querySelector('.content-panel') || proseEl;
    banner = document.createElement('div');
    banner.className = 'lab-banner';
    const title = step.slug === 'overview' ? lab.title : step.label;
    banner.innerHTML = `
      <div class="lab-banner__tags"></div>
      <h1 class="cds--productive-heading-05 lab-banner__title">${escapeHtml(title)}</h1>
    `;
    panel.insertBefore(banner, panel.firstElementChild);
  }
  let tags = banner.querySelector('.lab-banner__tags');
  if (!tags) {
    tags = document.createElement('div');
    tags.className = 'lab-banner__tags';
    banner.insertBefore(tags, banner.firstElementChild);
  }
  tags.innerHTML = buildLabBannerTags(section, lab, step);
  return banner;
}

function buildLabBannerTags(section, lab, step) {
  const stepDef = lab.steps.find((item) => item.slug === step.slug) || step;
  const stepTags = getMetadataTags(stepDef);
  return stepTags.slice(0, 3).map(renderTag).join('');
}

function buildTechCard(tech) {
  const tagsMarkup = (tech.tags || []).slice(0, 3).map((tag) => {
    const tone = tag.tone || 'gray';
    return `<span class="cds--tag cds--tag--${escapeHtml(tone)}">${escapeHtml(tag.label)}</span>`;
  }).join('');
  return `
    <a class="cds--tile cds--tile--clickable hub-lab-card hub-lab-card--technology" href="${tech.route}"
       aria-label="Explorar ${escapeHtml(tech.title)}">
      <div class="hub-lab-card__media">
        <img src="${tech.image}" alt="Banner ${escapeHtml(tech.title)}" class="hub-lab-card__img" data-placeholder-path="${tech.image}" />
      </div>
      <div class="hub-lab-card__body">
        <div class="hub-lab-card__tags">${tagsMarkup}</div>
        <p class="cds--label-01 hub-lab-card__meta">${escapeHtml(tech.context)}</p>
        <h3 class="cds--productive-heading-02 hub-lab-card__title">${escapeHtml(tech.title)}</h3>
        <p class="cds--body-01 hub-lab-card__description">${escapeHtml(tech.description)}</p>
        <div class="hub-lab-card__footer">
          <span class="cds--link hub-lab-card__link">Explorar tecnología <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </a>
  `;
}

function buildLabCard(lab, section) {
  const imgPath = `./assets/images/labs/${lab.slug}/banner_lab.png?v=3`;
  return `
    <a class="cds--tile cds--tile--clickable hub-lab-card hub-lab-card--${section.id}" href="${getLabRoute(lab.slug)}"
       aria-label="Abrir laboratorio ${escapeHtml(lab.title)}">
      <div class="hub-lab-card__media">
        <img src="${imgPath}" alt="Banner ${escapeHtml(lab.title)}" class="hub-lab-card__img" data-placeholder-path="${imgPath}" />
      </div>
      <div class="hub-lab-card__body">
        <div class="hub-lab-card__tags">
          ${getMetadataTags(lab).slice(0, 3).map(renderTag).join('')}
        </div>
        <p class="cds--label-01 hub-lab-card__meta">${escapeHtml(lab.context)}</p>
        <h3 class="cds--productive-heading-02 hub-lab-card__title">${escapeHtml(lab.title)}</h3>
        <p class="cds--body-01 hub-lab-card__description">${escapeHtml(lab.description)}</p>
        <div class="hub-lab-card__footer">
          <span class="cds--link hub-lab-card__link">Iniciar laboratorio <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </a>
  `;
}

// ── Home page renderer ───────────────────────────────────────────
function renderHome() {
  const techCardsMarkup = siteData.technologies.map((tech) => buildTechCard(tech)).join('');
  const sectionsMarkup = siteData.sections.map((section) => {
    const cardsMarkup = section.labs.map((lab) => buildLabCard(lab, section)).join('');
    return `
      <div class="hub-workshop-section" id="section-${section.id}">
        <div class="cds--tile hub-level-banner" role="region" aria-label="${section.title}">
          <p class="hub-section-eyebrow">${escapeHtml(section.eyebrow)}</p>
          <h2 class="cds--productive-heading-04 hub-level-banner__title">${section.title}</h2>
          <p class="cds--body-01 hub-level-banner__desc">${section.description}</p>
        </div>
        <div class="hub-cards-grid">${cardsMarkup}</div>
      </div>
    `;
  }).join('');

  homeView.innerHTML = `
    <section class="hub-hero hub-hero--leadspace">
      <img src="./assets/images/labs/fraud-detection/leadspace-data-integration.avif" alt="" class="hub-hero__background" loading="eager" />
      <div class="hub-hero__inner">
        <div class="hub-hero__content">
          <p class="hub-hero__eyebrow">${siteData.hero.eyebrow}</p>
          <h1 class="hub-hero__title">${siteData.hero.title}</h1>
          <p class="cds--body-02 hub-hero__copy">${siteData.hero.description}</p>
          <div class="hub-hero__actions">
            <a class="cds--btn cds--btn--primary" href="#available-workshops">${siteData.hero.ctaLabel}</a>
            <a class="cds--btn cds--btn--secondary" href="#available-technologies">Explorar tecnologías</a>
          </div>
        </div>
      </div>
    </section>

    <section id="available-technologies" class="hub-section hub-section--surface">
      <div class="hub-section__inner">
        <header class="hub-section__header">
          <p class="hub-section-eyebrow">Conoce las plataformas</p>
          <h2 class="hub-section__heading">Tecnologías</h2>
        </header>
        <div class="hub-section__body">
          <div class="hub-cards-grid">${techCardsMarkup}</div>
        </div>
      </div>
    </section>

    <section id="available-workshops" class="hub-section hub-section--layer">
      <div class="hub-section__inner">
        <header class="hub-section__header">
          <p class="hub-section-eyebrow">Aprende haciendo</p>
          <h2 class="hub-section__heading">Bootcamps disponibles</h2>
        </header>
        <div class="hub-section__body">
          <div class="hub-sections-stack">${sectionsMarkup}</div>
        </div>
      </div>
    </section>

    <section id="nosotros" class="hub-section hub-section--surface">
      <div class="hub-section__inner">
        <header class="hub-section__header">
          <p class="hub-section-eyebrow">El equipo</p>
          <h2 class="hub-section__heading">Nosotros</h2>
          <p class="hub-section-lead">
            El equipo IBM que diseña experiencias prácticas para conectar plataformas, datos y agentes de IA.
          </p>
        </header>
        <div class="hub-section__body">
          <div class="hub-team-grid">

          <div class="hub-team-card">
            <div class="hub-team-card__avatar-wrap">
              <img src="./assets/images/equipo/pedrokara.png" alt="Foto de Pedro Kara" class="hub-team-card__avatar" loading="lazy" />
            </div>
            <div class="hub-team-card__body">
              <p class="hub-team-card__name">Pedro Kara</p>
              <p class="hub-team-card__role">IBM — Data Integration Specialist</p>
            </div>
            <div class="hub-team-card__accent hub-team-card__accent--teal"></div>
          </div>

          <div class="hub-team-card">
            <div class="hub-team-card__avatar-wrap">
              <img src="./assets/images/equipo/ignaciostruque.png" alt="Foto de Ignacio Struque" class="hub-team-card__avatar" loading="lazy" />
            </div>
            <div class="hub-team-card__body">
              <p class="hub-team-card__name">Ignacio Struque</p>
              <p class="hub-team-card__role">IBM — Data Integration Specialist</p>
            </div>
            <div class="hub-team-card__accent hub-team-card__accent--magenta"></div>
          </div>

          <div class="hub-team-card">
            <div class="hub-team-card__avatar-wrap">
              <img src="./assets/images/equipo/florenciaonetto.png" alt="Foto de Florencia Onetto" class="hub-team-card__avatar" loading="lazy" />
            </div>
            <div class="hub-team-card__body">
              <p class="hub-team-card__name">Florencia Onetto</p>
              <p class="hub-team-card__role">IBM — Data Integration Specialist</p>
            </div>
            <div class="hub-team-card__accent hub-team-card__accent--purple"></div>
          </div>

          <div class="hub-team-card">
            <div class="hub-team-card__avatar-wrap">
              <img src="./assets/images/equipo/luisreyes.png" alt="Foto de Luis Reyes" class="hub-team-card__avatar" loading="lazy" />
            </div>
            <div class="hub-team-card__body">
              <p class="hub-team-card__name">Luis Reyes</p>
              <p class="hub-team-card__role">IBM — Data Integration Specialist</p>
            </div>
            <div class="hub-team-card__accent hub-team-card__accent--cyan"></div>
          </div>

          </div>
        </div>
      </div>
    </section>

    <section id="acerca-de" class="hub-section hub-section--layer">
      <div class="hub-section__inner">
        <header class="hub-section__header">
          <p class="hub-section-eyebrow">Acerca de</p>
          <h2 class="hub-section__heading">Data Integration Workshops</h2>
        </header>
        <div class="hub-section__body hub-section__body--prose">
          <p class="hub-section-lead">
            Un hub de bootcamps de IBM para aprender integración de datos mediante casos end-to-end,
            recursos preparados y validaciones sobre flujos reales.
          </p>
          <p class="hub-section-lead">
            El primer caso disponible fue diseñado para <strong>Beetech</strong>: una arquitectura de detección
            de fraude que conecta <strong>Confluent Cloud</strong>, <strong>Flink</strong>,
            <strong>watsonx.data integration</strong> y <strong>watsonx Orchestrate</strong>.
          </p>
        </div>
      </div>
    </section>
  `;

  bindImageFallbacks(homeView);
}

// ── Subnav ───────────────────────────────────────────────────────
function renderSubnav(links, currentHref) {
  subnavItems.innerHTML = links.map((link) => {
    const isActive = link.href === currentHref;
    const activeClass = isActive ? ' cds--tabs__nav-item--selected' : '';
    const ariaCurrent = isActive ? ' aria-current="page"' : '';
    return `<li><a class="cds--tabs__nav-item${activeClass}" href="${link.href}"${ariaCurrent}>${link.label}</a></li>`;
  }).join('');
}

// ── Image fallbacks ───────────────────────────────────────────────
const PERSON_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M16 16a7 7 0 1 0-7-7 7 7 0 0 0 7 7Zm0-12a5 5 0 1 1-5 5 5 5 0 0 1 5-5Zm9 28H7a2 2 0 0 1-2-2v-1a8.7 8.7 0 0 1 9-8h4a8.7 8.7 0 0 1 9 8v1a2 2 0 0 1-2 2Zm-9-9a6.7 6.7 0 0 0-7 6v1h14v-1a6.7 6.7 0 0 0-7-6Z"/></svg>`;

function replaceTeamAvatar(image) {
  if (image.dataset.teamFallback === 'true') return;
  image.dataset.teamFallback = 'true';
  const wrap = image.closest('.hub-team-card__avatar-wrap');
  if (!wrap) return;
  image.remove();
  wrap.classList.add('hub-team-card__avatar-wrap--empty');
  wrap.innerHTML = PERSON_ICON_SVG;
}

function replaceMissingImage(image) {
  if (image.dataset.carbonFallback === 'true') return;
  image.dataset.carbonFallback = 'true';
  const placeholder = document.createElement('div');
  placeholder.className = 'carbon-image-placeholder';
  const label = document.createElement('span');
  label.className = 'carbon-image-placeholder__label';
  label.textContent = 'Imagen pendiente';
  const srcPath = image.dataset.placeholderPath || image.getAttribute('src') || '';
  const pathTag = document.createElement('code');
  pathTag.className = 'carbon-image-placeholder__path';
  pathTag.textContent = srcPath;
  const description = document.createElement('p');
  description.className = 'carbon-image-placeholder__description';
  description.textContent = 'Guarda tu imagen en la ruta indicada para mostrar el banner del laboratorio.';
  placeholder.append(label, pathTag, description);
  image.replaceWith(placeholder);
}

function bindImageFallbacks(container) {
  container.querySelectorAll('img').forEach((image) => {
    image.loading = image.loading || 'lazy';
    if (image.classList.contains('hub-team-card__avatar')) {
      image.addEventListener('error', () => replaceTeamAvatar(image), { once: true });
      if (image.complete && image.naturalWidth === 0) replaceTeamAvatar(image);
    } else {
      image.addEventListener('error', () => replaceMissingImage(image), { once: true });
      if (image.complete && image.naturalWidth === 0) replaceMissingImage(image);
    }
  });
  bindScreenshotLightbox(container);
}

let activeLightbox = null;
let lightboxScrollY = 0;

function lockPageScroll() {
  lightboxScrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lightboxScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockPageScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo({ top: lightboxScrollY, behavior: 'auto' });
}

function closeScreenshotLightbox() {
  if (!activeLightbox) return;
  activeLightbox.remove();
  unlockPageScroll();
  document.removeEventListener('keydown', onLightboxKeydown);
  activeLightbox = null;
}

function onLightboxKeydown(event) {
  if (event.key === 'Escape') closeScreenshotLightbox();
}

function openScreenshotLightbox(src, alt) {
  closeScreenshotLightbox();
  const overlay = document.createElement('div');
  overlay.className = 'lab-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt || 'Captura ampliada');

  const img = document.createElement('img');
  img.className = 'lab-lightbox__img';
  img.src = src;
  img.alt = alt || '';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lab-lightbox__close';
  closeBtn.setAttribute('aria-label', 'Cerrar imagen ampliada');
  closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    closeScreenshotLightbox();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeScreenshotLightbox();
  });
  img.addEventListener('click', (event) => event.stopPropagation());

  overlay.append(closeBtn, img);
  document.body.append(overlay);
  lockPageScroll();
  document.addEventListener('keydown', onLightboxKeydown);
  activeLightbox = overlay;
  closeBtn.focus();
}

function bindScreenshotLightbox(container) {
  container.querySelectorAll('.lab-figure .lab-figure__img').forEach((image) => {
    if (image.dataset.lightboxBound === 'true') return;
    const figure = image.closest('.lab-figure');
    const enableLightbox = () => {
      if (image.dataset.carbonFallback === 'true' || image.naturalWidth === 0) return;
      image.dataset.lightboxReady = 'true';
      image.dataset.lightboxBound = 'true';
      figure?.classList.add('lab-figure--zoomable');

      const openFromImage = () => {
        openScreenshotLightbox(image.currentSrc || image.src, image.alt);
      };

      image.addEventListener('click', openFromImage);
      figure?.addEventListener('click', (event) => {
        if (event.target === image) return;
        if (event.target.closest('.lab-figure__caption')) {
          event.preventDefault();
          openFromImage();
        }
      });
    };
    if (image.complete) {
      enableLightbox();
    } else {
      image.addEventListener('load', enableLightbox, { once: true });
    }
  });
}

// ── Participant context (N=0…30) ────────────────────────────────
const PARTICIPANT_STORAGE_KEY = 'dataIntegrationWorkshopParticipantNumber';

function readParticipantNumber() {
  try {
    const stored = sessionStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (stored === null || !/^\d+$/.test(stored)) return null;
    const value = Number(stored);
    return value >= 0 && value <= 30 ? value : null;
  } catch {
    return null;
  }
}

function writeParticipantNumber(value) {
  try {
    sessionStorage.setItem(PARTICIPANT_STORAGE_KEY, String(value));
  } catch {
    // The lab remains usable with the visible N placeholder if storage is blocked.
  }
}

function clearParticipantNumber() {
  try {
    sessionStorage.removeItem(PARTICIPANT_STORAGE_KEY);
  } catch {
    // Clearing the visible selection is enough when storage is unavailable.
  }
}

function updateParticipantPreview(container, number) {
  const preview = container.querySelector('[data-participant-preview]');
  if (!preview) return;
  if (number === null) {
    preview.hidden = true;
    return;
  }
  preview.hidden = false;
  preview.querySelectorAll('[data-template]').forEach((element) => {
    element.textContent = element.dataset.template.replaceAll('{N}', String(number));
  });
}

function updateParticipantDownload(container, number) {
  const block = container.querySelector('[data-participant-download]');
  const link = container.querySelector('[data-participant-download-link]');
  const hint = container.querySelector('[data-participant-download-hint]');
  if (!block || !link) return;

  if (number === null) {
    block.hidden = true;
    return;
  }

  block.hidden = false;
  block.querySelectorAll('[data-template]').forEach((element) => {
    element.textContent = element.dataset.template.replaceAll('{N}', String(number));
  });

  if (number === 0) {
    link.hidden = true;
    if (hint) hint.hidden = false;
    return;
  }

  link.hidden = false;
  if (hint) hint.hidden = true;
  const fileName = `agent-spec-${number}.yaml`;
  link.href = `./assets/downloads/fraud-workshop/${fileName}`;
  link.setAttribute('download', fileName);
}

function applyParticipantTemplates(container, number = readParticipantNumber()) {
  const replacement = number === null ? 'N' : String(number);
  container.querySelectorAll('[data-template]').forEach((element) => {
    element.textContent = element.dataset.template.replaceAll('{N}', replacement);
  });
  container.querySelectorAll('[data-participant-status]').forEach((element) => {
    element.textContent = number === null
      ? 'Selecciona tu número antes de copiar configuraciones.'
      : number === 0
        ? 'Usando N=0 · referencia IBM'
        : `Usando N=${number} · participante ${number}`;
  });
  updateParticipantPreview(container, number);
  updateParticipantDownload(container, number);
  if (number === null) delete document.body.dataset.participantNumber;
  else document.body.dataset.participantNumber = String(number);
}

function initializeParticipantContext(container) {
  const selector = container.querySelector('[data-participant-selector]');
  if (selector) {
    selector.innerHTML = '<option value="">Selecciona tu número</option>'
      + '<option value="0">0 — referencia IBM</option>'
      + Array.from({ length: 30 }, (_, index) => {
        const value = index + 1;
        return `<option value="${value}">${value} — participante ${value}</option>`;
      }).join('');
    const current = readParticipantNumber();
    selector.value = current === null ? '' : String(current);
    selector.addEventListener('change', () => {
      if (!/^\d+$/.test(selector.value)) {
        clearParticipantNumber();
        applyParticipantTemplates(container, null);
        return;
      }
      const value = Number(selector.value);
      if (value < 0 || value > 30) return;
      writeParticipantNumber(value);
      applyParticipantTemplates(container, value);
    });
  }
  applyParticipantTemplates(container);
}

// ── Escape HTML ──────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Execute inline scripts injected via innerHTML ─────────────────
// Browsers don't execute <script> tags set via innerHTML.
// This re-creates each script element so it runs.
function executeInlineScripts(container) {
  container.querySelectorAll('script').forEach((oldScript) => {
    const newScript = document.createElement('script');
    // Copy attributes (type, src, etc.) except type="module" — convert to plain
    Array.from(oldScript.attributes).forEach((attr) => {
      if (attr.name === 'type' && attr.value === 'module') return; // skip module
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

// ── Code block enhancement ────────────────────────────────────────
function enhanceLabContent(container, category) {
  // Style tables
  container.querySelectorAll('table').forEach((table) => {
    if (!table.classList.contains('lab-table')) table.classList.add('lab-table');
    if (!table.parentElement.classList.contains('lab-table-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'lab-table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
  });
  // Style code blocks
  container.querySelectorAll('pre code').forEach((codeEl) => {
    const pre = codeEl.parentElement;
    if (pre.parentElement.classList.contains('code-block')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-button';
    copyBtn.setAttribute('aria-label', 'Copiar código');
    copyBtn.textContent = 'Copiar';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeEl.textContent || '').then(() => {
        copyBtn.textContent = 'Copiado';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 2000);
      });
    });
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(copyBtn);
    wrapper.appendChild(pre);
  });
  container.querySelectorAll('[data-copy-prompt]').forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('title', 'Clic para copiar la pregunta');
    const copyPrompt = () => {
      navigator.clipboard.writeText(card.dataset.copyPrompt || '').then(() => {
        card.classList.add('lab-task-card--copied');
        setTimeout(() => card.classList.remove('lab-task-card--copied'), 1500);
      });
    };
    card.addEventListener('click', copyPrompt);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyPrompt();
      }
    });
  });
}

// ── Step navigation bar (prev / next) ────────────────────────────
function injectStepNav(container, lab, currentStep) {
  const steps = lab.steps;
  const idx = steps.findIndex((s) => s.slug === currentStep.slug);
  const prev = idx > 0 ? steps[idx - 1] : null;
  const next = idx < steps.length - 1 ? steps[idx + 1] : null;

  if (!prev && !next) return;

  const nav = document.createElement('nav');
  nav.className = 'lab-step-nav';
  nav.setAttribute('aria-label', 'Navegación entre pasos');

  nav.innerHTML = `
    <div class="lab-step-nav__inner">
      <div class="lab-step-nav__side lab-step-nav__side--prev">
        ${prev ? `
          <a class="lab-step-nav__btn lab-step-nav__btn--prev" href="${getLabRoute(lab.slug, prev.slug)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20 24L10 16l10-8z"/></svg>
            <span class="lab-step-nav__label">
              <span class="lab-step-nav__direction">Anterior</span>
              <span class="lab-step-nav__name">${escapeHtml(prev.label)}</span>
            </span>
          </a>` : '<span></span>'}
      </div>
      <div class="lab-step-nav__progress" aria-hidden="true">
        ${steps.map((s, i) => `<span class="lab-step-nav__dot${s.slug === currentStep.slug ? ' lab-step-nav__dot--active' : ''}" title="${escapeHtml(s.label)}"></span>`).join('')}
      </div>
      <div class="lab-step-nav__side lab-step-nav__side--next">
        ${next ? `
          <a class="lab-step-nav__btn lab-step-nav__btn--next" href="${getLabRoute(lab.slug, next.slug)}">
            <span class="lab-step-nav__label">
              <span class="lab-step-nav__direction">Siguiente</span>
              <span class="lab-step-nav__name">${escapeHtml(next.label)}</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 8l10 8-10 8z"/></svg>
          </a>` : `
          <a class="lab-step-nav__btn lab-step-nav__btn--finish" href="${getHomeRoute()}">
            <span class="lab-step-nav__label">
              <span class="lab-step-nav__direction">Completado</span>
              <span class="lab-step-nav__name">Volver al inicio</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M14 16.59L11.41 14 10 15.41l4 4 8-8L20.59 10z"/></svg>
          </a>`}
      </div>
    </div>
  `;

  container.appendChild(nav);
}

// ── Lab view renderer ─────────────────────────────────────────────
async function renderLab(labSlug, stepSlug) {
  const found = findLab(labSlug);
  if (!found) {
    window.location.hash = getHomeRoute();
    return;
  }
  const { section, lab } = found;
  const step = lab.steps.find((s) => s.slug === stepSlug) || lab.steps[0];

  // Set category theme
  document.body.dataset.category = section.id;

  // Toggle body class: lab vs home
  document.body.classList.remove('hub-view--home');
  document.body.classList.add('hub-view--lab');

  // Show lab view
  homeView.hidden = true;
  labView.hidden = false;
  teardownScrollSpy();

  // Render subnav
  const subnavLinks = lab.steps.map((s) => ({
    href: getLabRoute(lab.slug, s.slug),
    label: s.label
  }));
  renderSubnav(subnavLinks, getLabRoute(lab.slug, step.slug));
  subnavEl.removeAttribute('hidden');

  // Render lab shell
  labShell.className = `lab-shell lab-shell--${labSlug}`;
  labShell.innerHTML = `
    <div class="lab-reading-layout">
      <div class="prose prose--full">
        <div id="lab-content-area"></div>
      </div>
    </div>
  `;

  const contentArea = labShell.querySelector('#lab-content-area');
  const html = await loadContent(step.file);
  contentArea.innerHTML = html;

  const stepIndex = lab.steps.findIndex((s) => s.slug === step.slug);
  if (stepIndex >= 0 && lab.steps.length > 1) {
    const progress = document.createElement('p');
    progress.className = 'lab-progress-label';
    progress.innerHTML = `Paso <strong>${stepIndex + 1} de ${lab.steps.length}</strong> · ${escapeHtml(step.label)}`;
    contentArea.insertBefore(progress, contentArea.firstChild);
  }

  // Execute any inline <script> tags in the loaded fragment
  executeInlineScripts(contentArea);

  // Ensure banner
  ensureLabBanner(contentArea, section, lab, step);

  // Personalize every resource and command with the participant's N.
  initializeParticipantContext(contentArea);

  // Enhance content
  enhanceLabContent(contentArea, section.id);
  bindImageFallbacks(contentArea);

  // Inject prev/next navigation
  injectStepNav(contentArea, lab, step);

  // Build ToC
  const proseEl = labShell.querySelector('.prose');
  if (proseEl) buildLabToc(proseEl, lab, step);

  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Router ───────────────────────────────────────────────────────
async function handleRoute() {
  const hash = window.location.hash || '#/';
  const route = parseRoute(hash);

  if (route.view === 'redirect') {
    window.location.replace(route.href);
  } else if (route.view === 'page') {
    await renderPage(route.pageSlug);
  } else if (route.view === 'lab') {
    await renderLab(route.labSlug, route.stepSlug || 'overview');
  } else {
    // Home view
    document.body.removeAttribute('data-category');
    document.body.classList.remove('hub-view--lab');
    document.body.classList.add('hub-view--home');
    labView.hidden = true;
    homeView.hidden = false;
    subnavEl.setAttribute('hidden', '');
    subnavEl.style.display = 'none';
    teardownLabToc();
    renderHome();
    initScrollSpy();
    updateNavCurrent();

    const target = getHashTarget();
    if (target) {
      requestAnimationFrame(() => scrollToHomeSection(target));
    } else {
      setNavActive(null);
      scrollToHomeSection(null);
    }
  }
}

// ── Init ─────────────────────────────────────────────────────────
initializeTheme();
themeToggle.addEventListener('click', toggleTheme);
hamburgerBtn.addEventListener('click', () => {
  const isOpen = sideNav.classList.contains('cds--side-nav--expanded');
  if (isOpen) closeSideNav(); else openSideNav();
});
sideNavOverlay.addEventListener('click', closeSideNav);

renderPlatformNav();
handleRoute();

window.addEventListener('hashchange', () => {
  closeSideNav();
  handleRoute();
});
