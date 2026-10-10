/* Capa de interacción visual V3. No cambia los eventos ni escrituras de Firebase. */
(() => {
  // Abrir el detalle solo cuando se selecciona una entidad; sus botones usan la lógica real existente.
  document.addEventListener('click', (event) => {
    const entity = event.target.closest('#dmView .entity-item[data-entity-id]');
    if (!entity || event.target.closest('button,input,textarea,select')) return;
    const selected = entity.classList.contains('is-inspected');
    entity.parentElement.querySelectorAll('.entity-item.is-inspected').forEach(el => el.classList.remove('is-inspected'));
    if (!selected) entity.classList.add('is-inspected');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.entity-item.is-inspected').forEach(el => el.classList.remove('is-inspected'));
    const entity = event.target.closest('#dmView .entity-item[data-entity-id]');
    if (entity && event.target === entity && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      entity.click();
    }
  });
})();
