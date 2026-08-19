const documents = [
  { name: 'Passeport', detail: 'Expire le 14 oct. 2028', status: 'ready', label: 'prêt', icon: '◫' },
  { name: 'Titre de séjour', detail: 'Expire dans 82 jours', status: 'ready', label: 'prêt', icon: '▣' },
  { name: 'Justificatif de domicile', detail: 'Daté de février 2026', status: 'refresh', label: 'à actualiser', icon: '⌂' },
  { name: 'Attestation employeur', detail: 'À demander', status: 'missing', label: 'manquant', icon: '✦' }
];

const selected = new Set(['Passeport', 'Titre de séjour']);
const documentList = document.querySelector('#documents');
const checklist = document.querySelector('#checklist');
const progress = document.querySelector('#progress-value');
const success = document.querySelector('#success');

function actionFor(doc) {
  if (selected.has(doc.name)) return 'Inclus dans le dossier';
  return doc.status === 'refresh' ? 'Ajoutez un document récent' : 'À ajouter avant de continuer';
}

function render() {
  documentList.innerHTML = documents.map(doc => `
    <button class="document-card ${selected.has(doc.name) ? 'selected' : ''}" data-name="${doc.name}">
      <span class="doc-icon">${doc.icon}</span>
      <span class="document-copy"><strong>${doc.name}</strong><small>${doc.detail}</small></span>
      <span class="status ${doc.status}">${doc.label}</span>
    </button>`).join('');

  checklist.innerHTML = documents.map(doc => `
    <label class="check-row ${selected.has(doc.name) ? 'done' : ''}">
      <input type="checkbox" data-name="${doc.name}" ${selected.has(doc.name) ? 'checked' : ''}>
      <span class="checkmark">${selected.has(doc.name) ? '✓' : ''}</span>
      <span class="check-copy"><strong>${doc.name}</strong><small>${actionFor(doc)}</small></span>
      ${selected.has(doc.name) ? '<em>Prêt</em>' : `<button class="add" type="button" data-name="${doc.name}">Ajouter</button>`}
    </label>`).join('');

  progress.textContent = `${Math.round(selected.size / documents.length * 100)}%`;
  success.hidden = true;

  documentList.querySelectorAll('[data-name]').forEach(button => button.addEventListener('click', () => toggle(button.dataset.name)));
  checklist.querySelectorAll('input, .add').forEach(control => control.addEventListener('click', event => {
    event.preventDefault();
    toggle(control.dataset.name);
  }));
}

function toggle(name) {
  selected.has(name) ? selected.delete(name) : selected.add(name);
  render();
}

document.querySelector('#select-all').addEventListener('click', () => {
  documents.forEach(doc => selected.add(doc.name));
  render();
});

document.querySelector('#prepare').addEventListener('click', () => {
  success.hidden = false;
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.querySelector('#invite').addEventListener('click', () => {
  alert("L'invitation familiale sera disponible dans la prochaine version de Jamm.");
});

document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => {
  document.querySelector(`#${button.dataset.scroll}`).scrollIntoView({ behavior: 'smooth' });
}));

render();
