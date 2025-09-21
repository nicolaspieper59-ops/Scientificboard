window.onload = () => {
  const panel = document.getElementById('panel');
  const container = document.createElement('div');
  container.className = 'module';

  fetch('modules/cockpit-universel.html')
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;
      panel.appendChild(container);
      import('./modules/cockpit-universel.js')
        .then(m => m.activate(container))
        .catch(err => container.innerHTML = "<p>⚠️ Erreur module JS</p>");
    })
    .catch(err => {
      container.innerHTML = "<p>⚠️ Module HTML introuvable</p>";
      panel.appendChild(container);
    });
};
