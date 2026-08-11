export async function loadContent(file) {
  try {
    const cacheBustUrl = file.includes('?') ? `${file}&_=${Date.now()}` : `${file}?_=${Date.now()}`;
    const response = await fetch(cacheBustUrl);

    if (!response.ok) {
      throw new Error(`Content request failed with ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('No se pudo cargar el contenido del laboratorio:', file, error);
    return `
      <div class="callout" data-tone="danger" role="alert">
        <p class="callout__title">No pudimos cargar este contenido</p>
        <p>Vuelve a intentarlo o regresa al inicio del laboratorio.</p>
      </div>
    `;
  }
}
