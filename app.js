const journeys = {
  residence: {
    title: 'Renouvellement de votre titre de séjour',
    label: 'À PRÉPARER DANS 82 JOURS',
    description: 'Votre titre expire le 9 novembre 2026. Préparez votre dossier maintenant pour éviter le stress.',
    documents: [
      { name: 'Passeport', detail: 'Expire le 14 oct. 2028', status: 'ready', label: 'prêt', icon: '◫' },
      { name: 'Titre de séjour', detail: 'Expire dans 82 jours', status: 'ready', label: 'prêt', icon: '▣' },
      { name: 'Justificatif de domicile', detail: 'Daté de février 2026', status: 'refresh', label: 'à actualiser', icon: '⌂' },
      { name: 'Attestation employeur', detail: 'À demander', status: 'missing', label: 'manquant', icon: '✦' }
    ]
  },
  passport: {
    title: 'Renouvellement de passeport',
    label: 'À ANTICIPER AVANT VOTRE VOYAGE',
    description: 'Réunissez les pièces utiles avant de prendre rendez-vous avec votre consulat.',
    documents: [
      { name: 'Passeport actuel', detail: 'À renouveler', status: 'ready', label: 'prêt', icon: '◫' },
      { name: 'Photo d’identité', detail: 'À prévoir', status: 'missing', label: 'manquant', icon: '◉' },
      { name: 'Justificatif de domicile', detail: 'Daté de février 2026', status: 'refresh', label: 'à actualiser', icon: '⌂' },
      { name: 'Acte de naissance', detail: 'Déjà dans le coffre', status: 'ready', label: 'prêt', icon: '✦' }
    ]
  },
  visit: {
    title: 'Visite familiale en France',
    label: 'À PRÉPARER AVANT LE RENDEZ-VOUS',
    description: 'Organisez avec votre proche les documents de voyage, d’hébergement et de prise en charge.',
    documents: [
      { name: 'Passeport du visiteur', detail: 'À demander au proche', status: 'missing', label: 'manquant', icon: '◫' },
      { name: 'Attestation d’accueil', detail: 'Démarche à la mairie', status: 'missing', label: 'manquant', icon: '⌂' },
      { name: 'Justificatif de domicile', detail: 'Daté de février 2026', status: 'refresh', label: 'à actualiser', icon: '▣' },
      { name: 'Preuve du lien familial', detail: 'Déjà dans le coffre', status: 'ready', label: 'prêt', icon: '✦' }
    ]
  }
};

let journey = journeys.residence;
let selected = new Set(['Passeport', 'Titre de séjour']);
const documentList = document.querySelector('#documents');
const checklist = document.querySelector('#checklist');
const progress = document.querySelector('#progress-value');
const success = document.querySelector('#success');

function render() {
  documentList.innerHTML = journey.documents.map(function(doc) {
    return '<button class="document-card ' + (selected.has(doc.name) ? 'selected' : '') + '" data-name="' + doc.name + '"><span class="doc-icon">' + doc.icon + '</span><span class="document-copy"><strong>' + doc.name + '</strong><small>' + doc.detail + '</small></span><span class="status ' + doc.status + '">' + doc.label + '</span></button>';
  }).join('');
  checklist.innerHTML = journey.documents.map(function(doc) {
    const included = selected.has(doc.name);
    const instruction = included ? 'Inclus dans le dossier' : doc.status === 'refresh' ? 'Ajoutez un document récent' : 'À ajouter avant de continuer';
    return '<label class="check-row ' + (included ? 'done' : '') + '"><input type="checkbox" data-name="' + doc.name + '"' + (included ? ' checked' : '') + '><span class="checkmark">' + (included ? '✓' : '') + '</span><span class="check-copy"><strong>' + doc.name + '</strong><small>' + instruction + '</small></span>' + (included ? '<em>Prêt</em>' : '<button class="add" type="button" data-name="' + doc.name + '">Ajouter</button>') + '</label>';
  }).join('');
  progress.textContent = Math.round(selected.size / journey.documents.length * 100) + '%';
  success.hidden = true;
  documentList.querySelectorAll('[data-name]').forEach(function(button) { button.addEventListener('click', function() { toggle(button.dataset.name); }); });
  checklist.querySelectorAll('input, .add').forEach(function(control) { control.addEventListener('click', function(event) { event.preventDefault(); toggle(control.dataset.name); }); });
}
function toggle(name) { selected.has(name) ? selected.delete(name) : selected.add(name); render(); }
function chooseJourney(key) {
  journey = journeys[key];
  selected = new Set(journey.documents.slice(0, 2).map(function(doc) { return doc.name; }));
  document.querySelector('.alert-copy h2').textContent = journey.title;
  document.querySelector('.alert-copy .amber').textContent = journey.label;
  document.querySelector('.alert-copy > p:not(.eyebrow)').textContent = journey.description;
  document.querySelector('.dossier-header h2').textContent = journey.title;
  document.querySelector('.onboarding').remove();
  render();
}
function showOnboarding() {
  const modal = document.createElement('section');
  modal.className = 'onboarding';
  modal.innerHTML = '<div><p>PREMIÈRE DÉMARCHE</p><h2>Que veux-tu préparer&nbsp;?</h2><span>Commence par une seule démarche. Jamm organisera les documents utiles et les prochaines actions.</span><button data-journey="residence">▣ Renouveler un titre de séjour<small>Documents, échéances et dossier</small></button><button data-journey="passport">◫ Renouveler un passeport<small>Préparer les pièces pour le consulat</small></button><button data-journey="visit">✦ Faire venir un proche<small>Coordonner la visite familiale</small></button><em>Prototype de démonstration — n’ajoutez aucun document personnel.</em></div>';
  modal.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(27,45,36,.48);padding:24px;display:grid;place-items:center';
  modal.firstElementChild.style.cssText = 'width:min(560px,100%);background:#fbfaf6;border-radius:16px;padding:34px;color:#1e2924;box-shadow:0 20px 70px rgba(0,0,0,.22)';
  modal.querySelector('p').style.cssText = 'font:500 11px monospace;letter-spacing:1px;color:#78847b';
  modal.querySelector('h2').style.cssText = 'font:600 31px Georgia,serif;margin:8px 0 10px';
  modal.querySelector('span').style.cssText = 'display:block;color:#647069;line-height:1.45;margin-bottom:20px';
  modal.querySelectorAll('button').forEach(function(button) { button.style.cssText = 'display:block;width:100%;text-align:left;margin:10px 0;padding:15px;border:1px solid #d8dfd6;border-radius:10px;background:white;color:#245843;font-weight:700'; button.querySelector('small'); });
  modal.querySelectorAll('button').forEach(function(button) { button.addEventListener('click', function() { chooseJourney(button.dataset.journey); }); });
  modal.querySelector('em').style.cssText = 'display:block;margin-top:18px;color:#778079;font-size:12px;font-style:normal';
  document.body.appendChild(modal);
}
document.querySelector('#select-all').addEventListener('click', function() { journey.documents.forEach(function(doc) { selected.add(doc.name); }); render(); });
document.querySelector('#prepare').addEventListener('click', function() { success.hidden = false; success.innerHTML = '<strong>Dossier prêt à être organisé.</strong><br>Dans la version connectée, Jamm créera un dossier ZIP et vous donnera le lien officiel correspondant à votre situation.'; success.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
document.querySelector('#invite').addEventListener('click', function() { alert("L'invitation familiale sera disponible dans la prochaine version de Jamm."); });
document.querySelectorAll('[data-scroll]').forEach(function(button) { button.addEventListener('click', function() { document.querySelector('#' + button.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); }); });
render();
showOnboarding();
