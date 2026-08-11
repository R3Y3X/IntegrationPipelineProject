export function parseRoute(hash) {
  const cleanHash = hash.replace(/^#?\/?/, '');

  if (!cleanHash) {
    return { view: 'home' };
  }

  const parts = cleanHash.split('/').filter(Boolean);

  // Páginas independientes: #/page/slug
  if (parts.length >= 2 && parts[0] === 'page') {
    if (parts[1] === 'confluent-intro') {
      return { view: 'redirect', href: '#/page/confluent' };
    }
    return {
      view: 'page',
      pageSlug: parts[1]
    };
  }

  if (parts.length >= 2 && parts[0] === 'lab') {
    if (parts[2] === 'streamsets') {
      return { view: 'redirect', href: `#/lab/${parts[1]}/data-integration` };
    }
    return {
      view: 'lab',
      labSlug: parts[1],
      stepSlug: parts[2] || 'overview'
    };
  }

  return { view: 'home' };
}

export function getHomeRoute() {
  return '#/';
}

export function getLabRoute(labSlug, stepSlug = 'overview') {
  return `#/lab/${labSlug}/${stepSlug}`;
}
