export function initConfluentEnablement(root = document) {
  // ── Toggle de audiencia ───────────────────────────────────
      const btnNegocio = document.getElementById('btn-negocio');
      const btnTecnico = document.getElementById('btn-tecnico');
      const panelNegocio = document.getElementById('panel-negocio');
      const panelTecnico = document.getElementById('panel-tecnico');
  
      function switchProfile(target) {
        const isNegocio = target === 'negocio';
        btnNegocio.classList.toggle('ce-toggle__btn--active', isNegocio);
        btnTecnico.classList.toggle('ce-toggle__btn--active', !isNegocio);
        panelNegocio.classList.toggle('ce-profile-panel--hidden', !isNegocio);
        panelTecnico.classList.toggle('ce-profile-panel--hidden', isNegocio);
      }
  
      btnNegocio?.addEventListener('click', () => switchProfile('negocio'));
      btnTecnico?.addEventListener('click', () => switchProfile('tecnico'));

      // ── Schema Registry Simulator ─────────────────────────────
      const MODE_DESCRIPTIONS = {
        BACKWARD: '<strong>BACKWARD:</strong> Actualizá los <em>consumidores</em> primero. Los campos eliminados o nuevos deben tener <code>default</code>.',
        FORWARD:  '<strong>FORWARD:</strong> Actualizá los <em>productores</em> primero. Los nuevos campos deben tener <code>default</code> para que el consumidor viejo pueda ignorarlos.',
        FULL:     '<strong>FULL:</strong> Máxima seguridad. Tanto los campos eliminados como los nuevos deben tener <code>default</code>. Compatibilidad en ambas direcciones.',
        NONE:     '<strong>NONE:</strong> Sin validación. Cualquier cambio es permitido. No recomendado en entornos de producción.'
      };
  
      const RULES_CONTENT = {
        BACKWARD: '<ul><li>Campos eliminados en v2: deben tener <code>default</code> en v1 ✓</li><li>Campos nuevos en v2: deben tener <code>default</code> en v2 ✓</li><li>Tipos cambiados: no permitido ✗</li><li>Campos renombrados: no permitido ✗</li></ul>',
        FORWARD:  '<ul><li>Campos nuevos en v2: deben tener <code>default</code> ✓</li><li>Campos eliminados de v2: deben tener <code>default</code> en v2 ✓</li><li>Tipos cambiados: no permitido ✗</li></ul>',
        FULL:     '<ul><li>Campos nuevos: deben tener <code>default</code> ✓</li><li>Campos eliminados: deben tener <code>default</code> en ambas versiones ✓</li><li>Tipos y nombres: no pueden cambiar ✗</li></ul>',
        NONE:     '<ul><li>Cualquier cambio es permitido</li><li>No hay validación de ruptura de compatibilidad</li><li>Uso solo en desarrollo o entornos no críticos</li></ul>'
      };
  
      const modeSelect = document.getElementById('compat-mode');
      const modeDesc = document.getElementById('mode-desc');
      const rulesContent = document.getElementById('rules-content');
  
      function updateModeUI() {
        const mode = modeSelect?.value || 'BACKWARD';
        if (modeDesc) modeDesc.innerHTML = MODE_DESCRIPTIONS[mode] || '';
        if (rulesContent) rulesContent.innerHTML = RULES_CONTENT[mode] || '';
      }
  
      modeSelect?.addEventListener('change', updateModeUI);
      updateModeUI();
  
      // Validation logic
      function parseSchema(text) {
        try { return JSON.parse(text); } catch { return null; }
      }
  
      function getFields(schema) {
        if (!schema || schema.type !== 'record') return null;
        return schema.fields || [];
      }
  
      function fieldHasDefault(field) {
        return Object.prototype.hasOwnProperty.call(field, 'default');
      }
  
      function fieldTypeIsNullable(field) {
        return Array.isArray(field.type) && field.type.includes('null');
      }
  
      function validateCompatibility(v1, v2, mode) {
        const f1 = getFields(v1);
        const f2 = getFields(v2);
        if (!f1 || !f2) return { ok: false, msg: 'JSON inválido o no es un schema tipo "record" válido.', warn: false };
  
        const names1 = new Map(f1.map((f) => [f.name, f]));
        const names2 = new Map(f2.map((f) => [f.name, f]));
  
        const removed = f1.filter((f) => !names2.has(f.name)); // en v1 pero no en v2
        const added   = f2.filter((f) => !names1.has(f.name)); // en v2 pero no en v1
  
        // Type changes
        const typeChanged = f1.filter((f) => {
          const f2Field = names2.get(f.name);
          if (!f2Field) return false;
          return JSON.stringify(f.type) !== JSON.stringify(f2Field.type);
        });
  
        if (typeChanged.length > 0) {
          return { ok: false, warn: false, msg: `Cambio de tipo detectado en: ${typeChanged.map(f => f.name).join(', ')}. Los cambios de tipo no son compatibles en ningún modo.` };
        }
  
        if (mode === 'NONE') {
          return { ok: true, warn: true, msg: 'Evolución permitida (modo NONE). Sin validación de compatibilidad. No recomendado en producción.' };
        }
  
        if (mode === 'BACKWARD' || mode === 'FULL') {
          // Campos eliminados de v2 deben tener default en v1
          const badRemoved = removed.filter((f) => !fieldHasDefault(f));
          if (badRemoved.length > 0) {
            return { ok: false, warn: false, msg: `BACKWARD violation: campos eliminados sin default en v1: ${badRemoved.map(f => f.name).join(', ')}. El consumidor nuevo no puede leer datos antiguos.` };
          }
          // Campos nuevos en v2 deben tener default
          const badAdded = added.filter((f) => !fieldHasDefault(f) && !fieldTypeIsNullable(f));
          if (badAdded.length > 0) {
            return { ok: false, warn: false, msg: `BACKWARD violation: campos nuevos en v2 sin default: ${badAdded.map(f => f.name).join(', ')}. Agregá "default": null o un valor por defecto.` };
          }
        }
  
        if (mode === 'FORWARD' || mode === 'FULL') {
          // Campos nuevos en v2 deben tener default para que el consumidor viejo los ignore
          const badAdded = added.filter((f) => !fieldHasDefault(f) && !fieldTypeIsNullable(f));
          if (badAdded.length > 0) {
            return { ok: false, warn: false, msg: `FORWARD violation: campos nuevos en v2 sin default: ${badAdded.map(f => f.name).join(', ')}. El consumidor anterior no puede ignorar campos desconocidos sin default.` };
          }
        }
  
        const changes = [];
        if (removed.length) changes.push(`${removed.length} campo(s) eliminado(s): ${removed.map(f => f.name).join(', ')}`);
        if (added.length) changes.push(`${added.length} campo(s) nuevo(s): ${added.map(f => f.name).join(', ')}`);
        const summary = changes.length ? changes.join(' · ') : 'Sin cambios estructurales.';
  
        return { ok: true, warn: false, msg: `Evolución compatible en modo ${mode}. ${summary}` };
      }
  
      document.getElementById('validate-btn')?.addEventListener('click', () => {
        const v1Text = document.getElementById('schema-v1')?.value || '';
        const v2Text = document.getElementById('schema-v2')?.value || '';
        const mode = modeSelect?.value || 'BACKWARD';
  
        const v1 = parseSchema(v1Text);
        const v2 = parseSchema(v2Text);
  
        if (!v1 || !v2) {
          showResult(false, false, 'JSON inválido', 'Verificá que ambos esquemas sean JSON válido con tipo "record".');
          return;
        }
  
        const result = validateCompatibility(v1, v2, mode);
        showResult(result.ok, result.warn, result.ok ? (result.warn ? '⚠ Permitido con advertencia' : '✓ Evolución compatible') : '✗ Incompatible', result.msg);
      });
  
      function showResult(ok, warn, title, detail) {
        const el = document.getElementById('schema-result');
        const icon = document.getElementById('result-icon');
        const titleEl = document.getElementById('result-title');
        const detailEl = document.getElementById('result-detail');
        if (!el) return;
  
        el.className = 'ce-schema-sim__result';
        el.classList.add(ok ? (warn ? 'ce-schema-sim__result--warn' : 'ce-schema-sim__result--ok') : 'ce-schema-sim__result--error');
        if (icon) icon.textContent = ok ? (warn ? '⚠' : '✓') : '✗';
        if (titleEl) titleEl.textContent = title;
        if (detailEl) detailEl.textContent = detail;
        el.hidden = false;
      }
}
