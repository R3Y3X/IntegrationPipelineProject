/**
 * wxDI enablement — audience toggle only (platform page, not bootcamp)
 */
export function initWxdiEnablement(root = document) {
  const btnNegocio = root.querySelector('#wxdi-btn-negocio');
  const btnTecnico = root.querySelector('#wxdi-btn-tecnico');
  const panelNegocio = root.querySelector('#wxdi-panel-negocio');
  const panelTecnico = root.querySelector('#wxdi-panel-tecnico');

  const switchProfile = (target) => {
    const isNegocio = target === 'negocio';
    btnNegocio?.classList.toggle('ce-toggle__btn--active', isNegocio);
    btnTecnico?.classList.toggle('ce-toggle__btn--active', !isNegocio);
    panelNegocio?.classList.toggle('ce-profile-panel--hidden', !isNegocio);
    panelTecnico?.classList.toggle('ce-profile-panel--hidden', isNegocio);
  };

  btnNegocio?.addEventListener('click', () => switchProfile('negocio'));
  btnTecnico?.addEventListener('click', () => switchProfile('tecnico'));
}
