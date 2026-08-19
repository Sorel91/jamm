const SUPABASE_URL = 'https://bnkpvyswxdflktpbvxbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xkbi-9JZAp5rGD1rwCf0mQ_1MliAIwY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const journeys = {
  residence_permit: { title: 'Renouvellement du titre de séjour', documents: ['passport', 'residence_permit', 'proof_of_address'] },
  passport: { title: 'Renouvellement de passeport', documents: ['passport', 'birth_certificate', 'proof_of_address'] },
  family_visit: { title: 'Visite familiale en France', documents: ['passport', 'proof_of_address', 'family_record'] }
};
const documentLabels = {
  passport: 'Passeport', residence_permit: 'Titre de séjour', birth_certificate: 'Acte de naissance',
  proof_of_address: 'Justificatif de domicile', identity_card: 'Carte d’identité',
  family_record: 'Preuve du lien familial', other: 'Autre document'
};

let currentUser = null;
let currentVault = null;
let documents = [];
let selected = new Set();
let currentJourney = null;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const initials = (email) => email ? email.slice(0, 2).toUpperCase() : 'J';

function modal(content) {
  const node = document.createElement('section');
  node.className = 'jamm-modal';
  node.innerHTML = '<div class="jamm-modal-card">' + content + '</div>';
  node.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(27,45,36,.55);padding:24px;display:grid;place-items:center';
  const card = node.firstElementChild;
  card.style.cssText = 'position:relative;width:min(480px,100%);background:#fbfaf6;border-radius:16px;padding:34px;color:#1e2924;box-shadow:0 20px 70px rgba(0,0,0,.22)';
  document.body.appendChild(node);
  return node;
}
function styleModal(node) {
  node.querySelectorAll('input,select').forEach((input) => input.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #cdd6cd;border-radius:8px;padding:11px;background:#fff;font:14px Arial');
  node.querySelectorAll('label').forEach((label) => label.style.cssText = 'display:block;font-size:13px;font-weight:700;margin:14px 0');
  const close = node.querySelector('.close');
  if (close) close.style.cssText = 'position:absolute;right:16px;top:13px;border:0;background:none;font-size:27px;color:#647069';
}
function showError(node, message) {
  const error = node.querySelector('[data-error]');
  error.textContent = message;
  error.hidden = false;
}

function showAuth() {
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Bienvenue dans Jamm.</h2><p style="color:#647069;line-height:1.45">Créez un compte pour conserver vos documents dans un espace privé.</p><form id="auth-form"><label>Adresse e-mail<input id="auth-email" type="email" autocomplete="email" required></label><label>Mot de passe<input id="auth-password" type="password" autocomplete="current-password" minlength="8" required></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><p data-status hidden style="color:#245843;font-size:13px;line-height:1.4"></p><button class="primary" id="auth-submit" type="submit">Créer mon compte <span>→</span></button></form><button id="switch-auth" style="margin-top:14px;border:0;background:none;color:#245843;text-decoration:underline;cursor:pointer">J’ai déjà un compte</button><p id="auth-note" style="margin-top:18px;color:#78847b;font-size:12px;line-height:1.4">Utilisez au moins 8 caractères. Nous ne stockons jamais votre mot de passe.</p>');
  styleModal(node);
  let loginMode = false;
  const updateMode = () => {
    $('#auth-submit').textContent = loginMode ? 'Se connecter →' : 'Créer mon compte →';
    $('#switch-auth').textContent = loginMode ? 'Créer un compte' : 'J’ai déjà un compte';
    $('#auth-note').textContent = loginMode ? 'Connectez-vous pour retrouver votre coffre privé.' : 'Utilisez au moins 8 caractères. Nous ne stockons jamais votre mot de passe.';
    $('#auth-password').autocomplete = loginMode ? 'current-password' : 'new-password';
  };
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#switch-auth').addEventListener('click', () => { loginMode = !loginMode; updateMode(); });
  node.querySelector('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = node.querySelector('#auth-email').value.trim();
    const password = node.querySelector('#auth-password').value;
    const button = node.querySelector('#auth-submit');
    button.disabled = true;
    if (loginMode) {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { showError(node, error.message); button.disabled = false; return; }
      node.remove();
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
      if (error) { showError(node, error.message); button.disabled = false; return; }
      if (!data.session) {
        const status = node.querySelector('[data-status]');
        status.textContent = 'E-mail de confirmation envoyé. Vérifiez votre boîte de réception et vos spams, puis utilisez « J’ai déjà un compte » pour vous connecter.';
        status.hidden = false;
        loginMode = true;
        updateMode();
        button.disabled = false;
      } else node.remove();
    }
  });
}

async function ensureVault() {
  const { data, error } = await supabaseClient.from('vaults').select('*').eq('owner_id', currentUser.id).limit(1);
  if (error) throw error;
  if (data[0]) return data[0];
  const { data: created, error: createError } = await supabaseClient.from('vaults').insert({ owner_id: currentUser.id, name: 'Mon coffre Jamm' }).select().single();
  if (createError) throw createError;
  return created;
}

async function loadData() {
  currentVault = await ensureVault();
  const [{ data: docs, error: docsError }, { data: trips, error: tripsError }] = await Promise.all([
    supabaseClient.from('documents').select('*').eq('owner_id', currentUser.id).order('created_at', { ascending: false }),
    supabaseClient.from('journeys').select('*').eq('owner_id', currentUser.id).eq('status', 'active').limit(1)
  ]);
  if (docsError) throw docsError;
  if (tripsError) throw tripsError;
  documents = docs || [];
  currentJourney = trips && trips[0] ? trips[0] : null;
  selected = new Set(documents.map((doc) => doc.id));
  render();
}

function render() {
  $('#greeting').textContent = 'Bonjour.';
  $('#profile-button').textContent = currentUser ? initials(currentUser.email) : '—';
  $('#person-one').textContent = currentUser ? initials(currentUser.email).slice(0, 1) : 'J';
  $('#documents-ready').textContent = documents.length;
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  $('#journey-title').textContent = journey ? journey.title : 'Préparer un dossier';
  $('#dossier-title').textContent = journey ? journey.title : 'Choisissez votre démarche';
  $('#journey-description').textContent = journey ? 'Jamm compare les pièces présentes avec cette préparation.' : 'Commencez par choisir une démarche.';
  renderDocuments();
  renderChecklist();
}

function renderDocuments() {
  const container = $('#documents');
  if (!documents.length) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:28px;border:1px dashed #cbd5cd;border-radius:12px;color:#647069">Votre coffre est vide. Ajoutez votre premier document ; il restera privé.</div>';
    return;
  }
  container.innerHTML = documents.map((doc) => {
    const expiry = doc.expires_at ? new Date(doc.expires_at + 'T12:00:00').toLocaleDateString('fr-FR') : 'Sans date d’expiration';
    return '<article class="document-card ' + (selected.has(doc.id) ? 'selected' : '') + '" data-id="' + doc.id + '"><span class="doc-icon">◫</span><span class="document-copy"><strong>' + escapeHtml(doc.display_name) + '</strong><small>' + escapeHtml(documentLabels[doc.document_type] || 'Document') + ' · ' + expiry + '</small></span><button class="add delete-document" data-id="' + doc.id + '" type="button">Supprimer</button></article>';
  }).join('');
  container.querySelectorAll('.delete-document').forEach((button) => button.addEventListener('click', () => deleteDocument(button.dataset.id)));
}

function renderChecklist() {
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  const checklist = $('#checklist');
  if (!journey) {
    checklist.innerHTML = Object.entries(journeys).map(([code, item]) => '<button class="check-row choose-journey" data-code="' + code + '" type="button"><span class="checkmark">→</span><span class="check-copy"><strong>' + item.title + '</strong><small>Choisir cette démarche</small></span></button>').join('');
    checklist.querySelectorAll('.choose-journey').forEach((button) => button.addEventListener('click', () => chooseJourney(button.dataset.code)));
    $('#progress-value').textContent = '0%';
    return;
  }
  const requirements = journey.documents;
  const ready = requirements.filter((type) => documents.some((doc) => doc.document_type === type)).length;
  $('#progress-value').textContent = Math.round((ready / requirements.length) * 100) + '%';
  checklist.innerHTML = requirements.map((type) => {
    const found = documents.find((doc) => doc.document_type === type);
    return '<div class="check-row ' + (found ? 'done' : '') + '"><span class="checkmark">' + (found ? '✓' : '') + '</span><span class="check-copy"><strong>' + documentLabels[type] + '</strong><small>' + (found ? 'Présent dans le coffre' : 'À ajouter avant de continuer') + '</small></span>' + (found ? '<em>Prêt</em>' : '<button class="add" data-type="' + type + '" type="button">Ajouter</button>') + '</div>';
  }).join('');
  checklist.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => showUpload(button.dataset.type)));
}

async function chooseJourney(code) {
  if (!currentUser) { showAuth(); return; }
  const { data, error } = await supabaseClient.from('journeys').insert({ owner_id: currentUser.id, vault_id: currentVault.id, code }).select().single();
  if (error) { alert('Impossible de créer cette démarche : ' + error.message); return; }
  currentJourney = data;
  render();
}

function showUpload(preselectedType) {
  const options = Object.entries(documentLabels).map(([value, label]) => '<option value="' + value + '"' + (value === preselectedType ? ' selected' : '') + '>' + label + '</option>').join('');
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Ajouter un document</h2><p style="color:#647069;line-height:1.45">Le fichier est conservé dans votre coffre privé. Vérifiez qu’il s’agit bien de votre document.</p><form id="upload-form"><label>Fichier<input id="upload-file" type="file" required accept=".pdf,image/jpeg,image/png"></label><label>Type de document<select id="upload-type">' + options + '</select></label><label>Date d’expiration (facultatif)<input id="upload-expiry" type="date"></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Ajouter au coffre <span>→</span></button></form>');
  styleModal(node);
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = node.querySelector('#upload-file').files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError(node, 'Ce fichier dépasse la limite de 10 Mo.'); return; }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = currentUser.id + '/' + id + '/' + safeName;
    const submit = node.querySelector('[type="submit"]');
    submit.disabled = true;
    const { error: uploadError } = await supabaseClient.storage.from('jamm-documents').upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { showError(node, uploadError.message); submit.disabled = false; return; }
    const { error: insertError } = await supabaseClient.from('documents').insert({
      id, vault_id: currentVault.id, owner_id: currentUser.id, document_type: node.querySelector('#upload-type').value,
      display_name: file.name, storage_path: storagePath, content_type: file.type, byte_size: file.size,
      expires_at: node.querySelector('#upload-expiry').value || null
    });
    if (insertError) {
      await supabaseClient.storage.from('jamm-documents').remove([storagePath]);
      showError(node, insertError.message);
      submit.disabled = false;
      return;
    }
    node.remove();
    await loadData();
  });
}

async function deleteDocument(id) {
  const documentToDelete = documents.find((doc) => doc.id === id);
  if (!documentToDelete || !confirm('Supprimer ce document du coffre ? Cette action est définitive.')) return;
  const { error: storageError } = await supabaseClient.storage.from('jamm-documents').remove([documentToDelete.storage_path]);
  if (storageError) { alert('Impossible de supprimer le fichier : ' + storageError.message); return; }
  const { error } = await supabaseClient.from('documents').delete().eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Le fichier a été supprimé, mais ses informations doivent encore être retirées : ' + error.message); return; }
  await loadData();
}

async function downloadChecklist() {
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  if (!journey) { $('#demarche').scrollIntoView({ behavior: 'smooth' }); return; }

  const button = $('#prepare');
  button.disabled = true;
  button.textContent = 'Préparation du dossier…';
  const relevantDocuments = documents.filter((doc) => journey.documents.includes(doc.document_type));
  const lines = ['JAMM — ' + journey.title, '', 'Checklist de préparation', '-------------------------'];
  journey.documents.forEach((type) => lines.push((relevantDocuments.some((doc) => doc.document_type === type) ? '[x] ' : '[ ] ') + documentLabels[type]));
  lines.push('', 'Ce dossier rassemble les pièces présentes dans votre coffre. Vérifiez toujours les exigences à jour auprès du site administratif officiel correspondant à votre situation.');

  try {
    const zip = new JSZip();
    zip.file('checklist-jamm.txt', lines.join('\n'));
    const errors = [];

    for (const doc of relevantDocuments) {
      const { data, error } = await supabaseClient.storage.from('jamm-documents').download(doc.storage_path);
      if (error) {
        errors.push(doc.display_name);
        continue;
      }
      const safeName = doc.display_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      zip.file('documents/' + safeName, data);
    }

    if (errors.length) zip.file('lire-moi.txt', 'Les fichiers suivants n’ont pas pu être ajoutés : ' + errors.join(', ') + '. Vous pouvez les télécharger depuis votre coffre.');
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(archive);
    link.download = 'jamm-dossier-' + currentJourney.code + '.zip';
    link.click();
    URL.revokeObjectURL(link.href);
    $('#success').hidden = false;
    $('#success').textContent = relevantDocuments.length ? 'Votre dossier ZIP a été préparé sur cet appareil.' : 'Checklist téléchargée : ajoutez les documents manquants pour créer un dossier complet.';
  } catch (error) {
    $('#success').hidden = false;
    $('#success').textContent = 'Impossible de préparer le dossier. Vérifiez votre connexion et réessayez.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Préparer et télécharger le dossier <span>→</span>';
  }
}

function wireUi() {
  $('#add-document').addEventListener('click', () => currentUser ? showUpload() : showAuth());
  $('#prepare').addEventListener('click', downloadChecklist);
  $('#select-all').addEventListener('click', () => { selected = new Set(documents.map((doc) => doc.id)); renderDocuments(); });
  $('#invite').addEventListener('click', () => alert('Le partage familial sécurisé arrive dans une prochaine version.'));
  $('#profile-button').addEventListener('click', async () => {
    if (!currentUser) { showAuth(); return; }
    if (confirm('Se déconnecter de Jamm ?')) await supabaseClient.auth.signOut();
  });
  document.querySelectorAll('[data-scroll]').forEach((button) => button.addEventListener('click', () => $('#' + button.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
}

async function boot() {
  wireUi();
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  if (currentUser) {
    try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
  } else render();
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) {
      try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
    } else { currentVault = null; documents = []; currentJourney = null; selected = new Set(); render(); }
  });
}
boot();
