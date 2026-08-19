const SUPABASE_URL = 'https://bnkpvyswxdflktpbvxbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xkbi-9JZAp5rGD1rwCf0mQ_1MliAIwY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const journeys = {
  residence_renewal: { title: 'Renouveler son titre de séjour', short: 'Titre de séjour', kind: 'residence', authorityLabel: 'Département où vous habitez', authorityPlaceholder: 'Ex. 75 — Paris' },
  passport_renewal: { title: 'Renouveler son passeport', short: 'Passeport', kind: 'passport', authorityLabel: 'Pays et ville de la démarche', authorityPlaceholder: 'Ex. France — mairie de Paris, ou consulat du Sénégal à Paris' },
  custom_procedure: { title: 'Faire une autre démarche', short: 'Démarche libre', kind: 'custom', authorityLabel: 'Lieu ou organisme concerné', authorityPlaceholder: 'Ex. Kinshasa, mairie, notaire, banque…' },
  renewal_employee: { title: 'Renouvellement du titre — salarié', legacy: true },
  renewal_family: { title: 'Renouvellement du titre — vie privée et familiale', legacy: true },
  renewal_student: { title: 'Renouvellement du titre — étudiant', legacy: true },
  renewal_visitor: { title: 'Renouvellement du titre — visiteur', legacy: true },
  residence_permit: { title: 'Renouvellement du titre de séjour', legacy: true },
  passport: { title: 'Renouvellement de passeport', legacy: true },
  family_visit: { title: 'Visite familiale en France', legacy: true }
};
const documentLabels = {
  passport: 'Passeport', residence_permit: 'Titre de séjour', birth_certificate: 'Acte de naissance', marriage_certificate: 'Acte de mariage',
  proof_of_address: 'Justificatif de domicile', identity_card: 'Carte d’identité',
  family_record: 'Preuve du lien familial', other: 'Autre document'
};

let currentUser = null;
let currentVault = null;
let documents = [];
let selected = new Set();
let currentJourney = null;
let journeysList = [];
let journeyProfiles = {};
let officialCatalog = [];
let activeView = 'vault';
let vaultFilter = 'all';
let dossierCollapsed = false;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const initials = (email) => email ? email.slice(0, 2).toUpperCase() : 'J';

function modal(content) {
  const node = document.createElement('section');
  node.className = 'jamm-modal';
  node.innerHTML = '<div class="jamm-modal-card">' + content + '</div>';
  node.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(27,45,36,.55);padding:24px;display:grid;place-items:center';
  const card = node.firstElementChild;
  card.style.cssText = 'position:relative;width:min(480px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;background:#fbfaf6;border-radius:16px;padding:34px;color:#1e2924;box-shadow:0 20px 70px rgba(0,0,0,.22)';
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

function showAuth(initialLogin = false) {
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Bienvenue dans Jamm.</h2><p style="color:#647069;line-height:1.45">Créez un compte pour conserver vos documents dans un espace privé.</p><form id="auth-form"><label>Adresse e-mail<input id="auth-email" type="email" autocomplete="email" required></label><label>Mot de passe<input id="auth-password" type="password" autocomplete="current-password" minlength="8" required></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><p data-status hidden style="color:#245843;font-size:13px;line-height:1.4"></p><button class="primary" id="auth-submit" type="submit">Créer mon compte <span>→</span></button></form><button id="switch-auth" style="margin-top:14px;border:0;background:none;color:#245843;text-decoration:underline;cursor:pointer">J’ai déjà un compte</button><p id="auth-note" style="margin-top:18px;color:#78847b;font-size:12px;line-height:1.4">Utilisez au moins 8 caractères. Nous ne stockons jamais votre mot de passe.</p>');
  styleModal(node);
  let loginMode = initialLogin;
  const updateMode = () => {
    $('#auth-submit').textContent = loginMode ? 'Se connecter →' : 'Créer mon compte →';
    $('#switch-auth').textContent = loginMode ? 'Créer un compte' : 'J’ai déjà un compte';
    $('#auth-note').textContent = loginMode ? 'Connectez-vous pour retrouver votre coffre privé.' : 'Utilisez au moins 8 caractères. Nous ne stockons jamais votre mot de passe.';
    $('#auth-password').autocomplete = loginMode ? 'current-password' : 'new-password';
  };
  updateMode();
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
  const [{ data: docs, error: docsError }, { data: trips, error: tripsError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabaseClient.from('documents').select('*').eq('owner_id', currentUser.id).order('created_at', { ascending: false }),
    supabaseClient.from('journeys').select('*').eq('owner_id', currentUser.id).order('created_at', { ascending: false }),
    supabaseClient.from('official_catalog_entries').select('*').eq('source_status', 'verified').order('title')
  ]);
  if (docsError) throw docsError;
  if (tripsError) throw tripsError;
  if (catalogError) throw catalogError;
  documents = docs || [];
  officialCatalog = catalog || [];
  selected = new Set(documents.filter((doc) => !doc.archived_at).map((doc) => doc.id));
  journeysList = trips || [];
  journeyProfiles = {};
  if (journeysList.length) {
    const { data: profiles, error: profilesError } = await supabaseClient.from('journey_profiles').select('*').eq('owner_id', currentUser.id).in('journey_id', journeysList.map((journey) => journey.id));
    if (profilesError) throw profilesError;
    journeyProfiles = Object.fromEntries((profiles || []).map((profile) => [profile.journey_id, profile]));
  }
  const preservedJourney = currentJourney && journeysList.find((journey) => journey.id === currentJourney.id);
  currentJourney = preservedJourney || null;
  selected = new Set(documents.filter((doc) => !doc.archived_at).map((doc) => doc.id));
  render();
}

function applyAppState() {
  const signedIn = Boolean(currentUser);
  $('#marketing').hidden = signedIn;
  $('#app-shell').hidden = !signedIn;
  if (signedIn) showView(activeView);
}

function showView(view) {
  activeView = view;
  const isVault = view === 'vault';
  $('#vault-view').hidden = !isVault;
  $('#journeys-view').hidden = isVault;
  $('#add-document').hidden = !isVault;
  document.querySelectorAll('.app-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  $('#today').textContent = isVault ? 'VOTRE ESPACE PRIVÉ' : 'VOS DÉMARCHES';
  $('#app-subtitle').textContent = isVault
    ? 'Votre mémoire administrative, organisée et prête.'
    : 'Des dossiers temporaires qui s’appuient sur votre coffre.';
}

function journeyTitle(journey) {
  const profile = journey && journeyProfiles[journey.id];
  return profile?.situation_answers?.custom_title || (journey && journeys[journey.code] ? journeys[journey.code].title : 'Démarche');
}

function render() {
  $('#greeting').textContent = 'Bonjour.';
  $('#profile-button').textContent = currentUser ? initials(currentUser.email) : '—';
  $('#person-one').textContent = currentUser ? initials(currentUser.email).slice(0, 1) : 'J';
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  $('#dossier-title').textContent = journey ? journeyTitle(currentJourney) : 'Choisissez votre démarche';
  renderDocuments();
  renderJourneys();
  renderChecklist();
  updateDossierCollapse();
}

function updateDossierCollapse() {
  const dossier = $('#demarche');
  const toggle = $('#collapse-dossier');
  const canCollapse = Boolean(currentJourney);
  dossier.hidden = !canCollapse;
  if (!canCollapse) {
    dossier.classList.remove('is-collapsed');
    toggle.hidden = true;
    return;
  }
  dossier.classList.toggle('is-collapsed', dossierCollapsed);
  toggle.hidden = false;
  toggle.setAttribute('aria-expanded', String(!dossierCollapsed));
  toggle.textContent = dossierCollapsed ? 'Afficher la checklist' : 'Réduire la checklist';
}

function documentMatchesRequirement(doc, requirement, links = {}) {
  if (doc.id === links[requirement.label]) return true;
  const requiredType = requirement.document_type || requirement.category;
  if (!requiredType) return false;
  if (doc.document_type === requiredType) return true;
  const fileName = String(doc.display_name || '').toLocaleLowerCase('fr-FR');
  const nameMatchers = {
    passport: /passeport/i,
    identity_card: /(?:cnie|carte[ _-]?d['’ ]?identit[ée])/i
  };
  return Boolean(nameMatchers[requiredType] && nameMatchers[requiredType].test(fileName));
}

function categoryFor(documentType) {
  if (['passport', 'identity_card'].includes(documentType)) return 'identity';
  if (documentType === 'residence_permit') return 'residency';
  if (documentType === 'proof_of_address') return 'home';
  if (['birth_certificate', 'family_record'].includes(documentType)) return 'family';
  return 'other';
}

function lifecycleFor(doc) {
  if (doc.archived_at) return { key: 'archived', label: 'Archivé' };
  if (!doc.expires_at) return { key: 'current', label: 'Sans échéance' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(doc.expires_at + 'T12:00:00');
  const days = Math.ceil((expiry - today) / 86400000);
  if (days < 0) return { key: 'expired', label: 'Expiré' };
  if (days <= 90) return { key: 'expiring', label: 'À actualiser' };
  return { key: 'current', label: 'Valide' };
}

function filterDocuments() {
  return documents.filter((doc) => {
    const state = lifecycleFor(doc);
    if (vaultFilter === 'archive') return state.key === 'archived';
    if (vaultFilter === 'attention') return !doc.archived_at && ['expired', 'expiring'].includes(state.key);
    if (vaultFilter === 'all') return !doc.archived_at;
    return !doc.archived_at && categoryFor(doc.document_type) === vaultFilter;
  });
}

function renderDocuments() {
  const container = $('#documents');
  const visibleDocuments = filterDocuments();
  const attentionCount = documents.filter((doc) => !doc.archived_at && ['expired', 'expiring'].includes(lifecycleFor(doc).key)).length;
  $('#attention-count').textContent = attentionCount ? attentionCount + ' document' + (attentionCount > 1 ? 's' : '') + ' à revoir' : 'Tout est à jour';
  document.querySelectorAll('[data-vault-filter]').forEach((button) => button.classList.toggle('active', button.dataset.vaultFilter === vaultFilter));
  const titles = { all: ['Tout votre coffre', 'Les documents restent ici, même lorsqu’ils sont utilisés dans une démarche.'], identity: ['Identité & voyage', 'Les documents qui vous accompagnent d’un pays à l’autre.'], residency: ['Séjour', 'Vos titres, autorisations et droits de séjour.'], home: ['Logement', 'Justificatifs de domicile et documents liés à votre adresse.'], family: ['Famille', 'État civil, liens familiaux et pièces partagées.'], attention: ['À surveiller', 'Des documents arrivent à expiration ou doivent être actualisés.'], archive: ['Archives', 'Des documents conservés pour mémoire, hors de vos démarches actives.'] };
  $('#vault-context').innerHTML = '<strong>' + titles[vaultFilter][0] + '</strong><span>' + titles[vaultFilter][1] + '</span>';

  if (!visibleDocuments.length) {
    const emptyMessage = vaultFilter === 'all' ? 'Ajoutez un premier document pour commencer à préparer vos démarches.' : 'Aucun document dans cette vue pour le moment.';
    container.innerHTML = '<div class="empty-vault"><span>✦</span><div><strong>' + (vaultFilter === 'all' ? 'Votre coffre est prêt.' : 'Rien à afficher ici.') + '</strong><p>' + emptyMessage + '</p></div>' + (vaultFilter === 'all' ? '<button class="outline" id="empty-add-document" type="button">Ajouter un document</button>' : '<button class="link-button" id="show-all-documents" type="button">Voir tout le coffre</button>') + '</div>';
    const addButton = container.querySelector('#empty-add-document');
    if (addButton) addButton.addEventListener('click', () => currentUser ? showUpload() : showAuth());
    const allButton = container.querySelector('#show-all-documents');
    if (allButton) allButton.addEventListener('click', () => { vaultFilter = 'all'; renderDocuments(); });
    return;
  }

  container.innerHTML = visibleDocuments.map((doc) => {
    const lifecycle = lifecycleFor(doc);
    const expiry = doc.expires_at ? new Date(doc.expires_at + 'T12:00:00').toLocaleDateString('fr-FR') : 'Sans date d’expiration';
    const detail = doc.holder_name ? escapeHtml(doc.holder_name) + ' · ' + expiry : escapeHtml(documentLabels[doc.document_type] || 'Document') + ' · ' + expiry;
    const action = lifecycle.key === 'archived'
      ? '<button class="add restore-document" data-id="' + doc.id + '" type="button">Restaurer</button>'
      : '<button class="add archive-document" data-id="' + doc.id + '" type="button">Archiver</button>';
    return '<article class="document-card lifecycle-' + lifecycle.key + '"><span class="doc-icon">◫</span><span class="document-copy"><strong>' + escapeHtml(doc.display_name) + '</strong><small>' + detail + '</small></span><span class="status ' + lifecycle.key + '">' + lifecycle.label + '</span>' + action + '<button class="delete-document" data-id="' + doc.id + '" type="button" aria-label="Supprimer ' + escapeHtml(doc.display_name) + '">×</button></article>';
  }).join('');
  container.querySelectorAll('.archive-document').forEach((button) => button.addEventListener('click', () => archiveDocument(button.dataset.id)));
  container.querySelectorAll('.restore-document').forEach((button) => button.addEventListener('click', () => restoreDocument(button.dataset.id)));
  container.querySelectorAll('.delete-document').forEach((button) => button.addEventListener('click', () => deleteDocument(button.dataset.id)));
}

async function archiveDocument(id) {
  const target = documents.find((doc) => doc.id === id);
  if (!target || !confirm('Archiver ce document ? Il ne sera plus proposé dans vos démarches, mais restera conservé dans votre coffre.')) return;
  const { error } = await supabaseClient.from('documents').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible d’archiver ce document : ' + error.message); return; }
  await loadData();
}

async function restoreDocument(id) {
  const { error } = await supabaseClient.from('documents').update({ archived_at: null }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de restaurer ce document : ' + error.message); return; }
  vaultFilter = 'all';
  await loadData();
}

function journeyProgress(journey) {
  const profile = journeyProfiles[journey.id];
  if (!profile) return null;
  const catalogEntry = officialCatalog.find((entry) => entry.id === profile.situation_answers?.catalog_entry_id);
  const personal = Array.isArray(profile.situation_answers?.required_documents) ? profile.situation_answers.required_documents : [];
  const requirements = personal.length ? personal.map((label) => ({ label, document_type: null })) : (Array.isArray(catalogEntry?.requirements) ? catalogEntry.requirements : []);
  if (!requirements.length) return null;
  const links = profile.situation_answers?.requirement_links || {};
  const ready = requirements.filter((requirement) => documents.some((doc) => !doc.archived_at && documentMatchesRequirement(doc, requirement, links))).length;
  return { ready, total: requirements.length };
}

function journeyStatusLabel(journey) {
  const profile = journeyProfiles[journey.id];
  if (journey.status === 'completed') return 'Terminée';
  if (!profile) return 'Situation à préciser';
  if (profile.source_status === 'verified') return 'Liste vérifiée';
  return 'Source à vérifier';
}

function renderJourneys() {
  const board = $('#journey-list');
  const activeJourneys = journeysList.filter((journey) => journey.status === 'active');
  const completedJourneys = journeysList.filter((journey) => journey.status === 'completed');
  const activeCodes = new Set(activeJourneys.map((journey) => journey.code));
  const activeCard = (journey) => {
    const profile = journeyProfiles[journey.id];
    const progress = journeyProgress(journey);
    const situation = profile?.permit_category ? escapeHtml(profile.permit_category) : 'Situation à préciser';
    const progressText = progress ? progress.ready + '/' + progress.total + ' pièces prêtes' : journeyStatusLabel(journey);
    return '<button class="resume-journey" data-resume-id="' + journey.id + '" type="button"><span class="resume-icon">→</span><span class="resume-copy"><small>À REPRENDRE</small><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + situation + ' · ' + progressText + '</em></span><span class="resume-action">Reprendre <b>→</b></span></button>';
  };
  const completedCard = (journey) => '<button class="journey-card completed-card" data-resume-id="' + journey.id + '" type="button"><span class="journey-card-icon">✓</span><span><small>TERMINÉE</small><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + journeyStatusLabel(journey) + '</em></span><b>→</b></button>';
  const suggestions = Object.entries(journeys)
    .filter(([code, definition]) => !definition.legacy && !activeCodes.has(code))
    .map(([code, definition]) => '<button class="start-journey" data-start-journey="' + code + '" type="button"><span class="start-journey-icon">' + (definition.kind === 'residence' ? '▣' : definition.kind === 'passport' ? '◫' : '+') + '</span><span><strong>' + escapeHtml(definition.title) + '</strong><em>' + (definition.kind === 'residence' ? 'Choisir votre situation' : definition.kind === 'passport' ? 'Choisir le pays du passeport' : 'Créer votre liste de pièces') + '</em></span><b>→</b></button>').join('');
  const dossier = $('#demarche');
  board.innerHTML =
    '<section class="journey-group journey-new"><p class="journey-group-title">COMMENCER</p><div class="start-journey-grid">' + suggestions + '</div></section>' +
    (activeJourneys.length ? '<section class="journey-group resume-group"><p class="journey-group-title">À REPRENDRE</p><div class="resume-list">' + activeJourneys.map(activeCard).join('') + '</div></section>' : '<section class="journey-group resume-group empty-resume"><p class="journey-group-title">À REPRENDRE</p><p>Vous n’avez pas encore de dossier en cours.</p></section>') +
    (completedJourneys.length ? '<details class="completed-journeys"><summary>DÉMARCHES TERMINÉES <span>' + completedJourneys.length + '</span></summary><div class="journey-group-grid">' + completedJourneys.map(completedCard).join('') + '</div></details>' : '');
  const resumeGroup = board.querySelector('.resume-group');
  if (currentJourney && resumeGroup) resumeGroup.appendChild(dossier);
  else board.insertAdjacentElement('afterend', dossier);
  board.querySelectorAll('[data-resume-id]').forEach((button) => button.addEventListener('click', () => {
    currentJourney = journeysList.find((journey) => journey.id === button.dataset.resumeId) || null;
    dossierCollapsed = false;
    render();
    $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  board.querySelectorAll('[data-start-journey]').forEach((button) => button.addEventListener('click', () => chooseJourney(button.dataset.startJourney)));
}
function renderChecklist() {
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  const checklist = $('#checklist');
  if (!journey) {
    checklist.innerHTML = '<div class="journey-empty"><span>→</span><div><strong>Choisissez une démarche au-dessus.</strong><p>Jamm vous demandera ensuite votre situation, puis préparera le dossier.</p></div></div>';
    $('#progress-value').textContent = '0%';
    $('#complete-journey').hidden = true;
    return;
  }
  const profile = journeyProfiles[currentJourney.id];
  const prepareButton = $('#prepare');
  prepareButton.disabled = false;
  prepareButton.innerHTML = 'Préparer et télécharger le dossier <span>→</span>';
  $('#complete-journey').hidden = currentJourney.status !== 'active';
  if (!profile) {
    $('#progress-value').textContent = '—';
    checklist.innerHTML = '<div class="journey-empty"><span>!</span><div><strong>Précisez votre situation.</strong><p>Jamm ne propose pas de liste générique : nous avons besoin de comprendre votre démarche.</p><button class="outline" id="qualify-current-journey" type="button">Préciser ma situation</button></div></div>';
    checklist.querySelector('#qualify-current-journey').addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
    return;
  }
  const catalogEntry = officialCatalog.find((entry) => entry.id === profile.situation_answers?.catalog_entry_id);
  const personalRequirements = Array.isArray(profile.situation_answers?.required_documents) ? profile.situation_answers.required_documents : [];
  const officialRequirements = Array.isArray(catalogEntry?.requirements) ? catalogEntry.requirements : [];
  const isPersonal = personalRequirements.length > 0;
  const requirements = isPersonal ? personalRequirements.map((label) => ({ label, document_type: null })) : officialRequirements;
  const links = profile.situation_answers?.requirement_links || {};
  if (requirements.length) {
    const linked = (requirement) => documents.find((doc) => !doc.archived_at && documentMatchesRequirement(doc, requirement, links));
    const ready = requirements.filter(linked).length;
    $('#progress-value').textContent = Math.round((ready / requirements.length) * 100) + '%';
    const sourceLink = !isPersonal && catalogEntry?.requirements_source_url ? '<a href="' + escapeHtml(catalogEntry.requirements_source_url) + '" target="_blank" rel="noopener">Voir la source des pièces ↗</a>' : '';
    const logistics = !isPersonal && catalogEntry?.theme === 'passport_renewal' && catalogEntry?.notes
      ? '<span><b>Modalité :</b> ' + escapeHtml(catalogEntry.notes) + '</span>'
      : '';
    const heading = isPersonal
      ? '<strong>Votre liste personnelle</strong><span>Ajoutée par vous — Jamm organise les pièces sans en valider le contenu.</span><button class="link-button" id="edit-qualification" type="button">Modifier la liste</button>'
      : '<strong>Checklist officielle — ' + escapeHtml(catalogEntry?.title || journey.title) + '</strong><span>Pièces vérifiées à partir de la source officielle.</span>' + logistics + '<span>' + sourceLink + '</span><button class="link-button" id="edit-qualification" type="button">Changer de situation</button>';
    checklist.innerHTML = '<div class="custom-list-note">' + heading + '</div>' + requirements.map((requirement) => {
      const doc = linked(requirement);
      return '<div class="check-row ' + (doc ? 'done' : '') + '"><span class="checkmark">' + (doc ? '✓' : '') + '</span><span class="check-copy"><strong>' + escapeHtml(requirement.label) + '</strong><small>' + (doc ? escapeHtml(doc.display_name) + ' est rattaché à cette pièce' : 'À rattacher depuis votre coffre ou à ajouter') + '</small></span>' + (doc ? '<em>Prêt</em>' : '<span class="requirement-actions"><button class="add link-requirement" data-requirement="' + escapeHtml(requirement.label) + '" type="button">Choisir</button><button class="link-button upload-requirement" data-requirement="' + escapeHtml(requirement.label) + '" type="button">Ajouter</button></span>') + '</div>';
    }).join('');
    const edit = checklist.querySelector('#edit-qualification');
    if (edit) edit.addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
    checklist.querySelectorAll('.link-requirement').forEach((button) => button.addEventListener('click', () => showRequirementPicker(button.dataset.requirement)));
    checklist.querySelectorAll('.upload-requirement').forEach((button) => button.addEventListener('click', () => showUpload('other')));
    return;
  }
  const isVerified = profile.source_status === 'verified';
  const isCatalogRouteWithoutChecklist = isVerified && Boolean(catalogEntry);
  $('#progress-value').textContent = isCatalogRouteWithoutChecklist ? 'En attente' : (isVerified ? 'Source OK' : 'À vérifier');
  if (isCatalogRouteWithoutChecklist) {
    prepareButton.disabled = true;
    prepareButton.textContent = 'Checklist en cours d’intégration';
  }
  const sourceLine = profile.official_source_url ? '<a href="' + escapeHtml(profile.official_source_url) + '" target="_blank" rel="noopener">Ouvrir la source officielle ↗</a>' : 'La source officielle de l’organisme compétent reste à associer.';
  const checked = profile.source_checked_at ? new Date(profile.source_checked_at).toLocaleDateString('fr-FR') : 'pas encore contrôlée';
  const statusTitle = isCatalogRouteWithoutChecklist ? 'Ce parcours est bien identifié, mais sa checklist arrive ensuite.' : (isVerified ? 'Parcours officiel identifié.' : 'Checklist en cours de vérification.');
  const statusCopy = isCatalogRouteWithoutChecklist ? 'Le catalogue Essonne est prêt ; cette situation n’a pas encore de checklist détaillée dans Jamm. Vous pouvez changer de situation, ou revenir plus tard après son intégration.' : (isVerified ? 'Jamm a rattaché ce dossier à la publication compétente. Les pièces détaillées seront ajoutées après revue de cette source.' : 'Jamm attend la publication officielle correspondant à votre situation avant de lister des pièces.');
  checklist.innerHTML = '<div class="journey-empty"><span>⌁</span><div><strong>' + statusTitle + '</strong><p><b>Situation :</b> ' + escapeHtml(profile.permit_category) + ' · <b>Lieu :</b> ' + escapeHtml(profile.department) + '.</p><p>' + statusCopy + ' Dernier contrôle : ' + checked + '.</p><p>' + sourceLine + '</p><button class="outline" id="edit-qualification" type="button">' + (isCatalogRouteWithoutChecklist ? 'Choisir un autre parcours' : 'Modifier ma situation') + '</button></div></div>';
  checklist.querySelector('#edit-qualification').addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
}

function showRequirementPicker(requirement) {
  const available = documents.filter((doc) => !doc.archived_at);
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE COFFRE</p><h2 style="font:600 29px Georgia,serif;margin:8px 0 10px">Rattacher une pièce</h2><p style="color:#647069;line-height:1.45">Choisissez le document qui correspond à « ' + escapeHtml(requirement) + ' ».</p><div id="requirement-documents">' + (available.length ? available.map((doc) => '<button class="journey-card" data-document-id="' + doc.id + '" type="button"><span class="journey-card-icon">◫</span><span><strong>' + escapeHtml(doc.display_name) + '</strong><em>' + escapeHtml(documentLabels[doc.document_type] || 'Document') + '</em></span><b>→</b></button>').join('') : '<p>Votre coffre est vide. Ajoutez d’abord ce document, puis revenez le rattacher.</p>') + '</div>');
  styleModal(node);
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelectorAll('[data-document-id]').forEach((button) => button.addEventListener('click', async () => {
    const profile = journeyProfiles[currentJourney.id];
    const answers = { ...(profile.situation_answers || {}), requirement_links: { ...(profile.situation_answers?.requirement_links || {}), [requirement]: button.dataset.documentId } };
    const { error } = await supabaseClient.from('journey_profiles').update({ situation_answers: answers, updated_at: new Date().toISOString() }).eq('journey_id', currentJourney.id).eq('owner_id', currentUser.id);
    if (error) { showError(node, error.message); return; }
    node.remove(); await loadData(); showView('journeys');
  }));
}

async function chooseJourney(code) {
  if (!currentUser) { showAuth(); return; }
  showView('journeys');
  const existing = journeysList.find((journey) => journey.code === code && journey.status === 'active');
  if (existing) { currentJourney = existing; render(); $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  showQualification(code);
}

function showQualification(code, existingJourney = null) {
  const definition = journeys[code];
  const profile = existingJourney ? journeyProfiles[existingJourney.id] : null;
  const isCustom = definition.kind === 'custom';
  const isPassport = definition.kind === 'passport';
  const essonneEntries = officialCatalog.filter((entry) => entry.authority_code === '91' && entry.theme === 'residence_renewal');
  const passportCountries = ['France', 'Algérie', 'Maroc', 'Tunisie', 'Sénégal', 'Mali', 'Côte d’Ivoire', 'Cameroun', 'Bénin', 'Mauritanie', 'Burkina Faso', 'République démocratique du Congo', 'République du Congo (Congo-Brazzaville)', 'Guinée', 'Nigeria', 'Éthiopie', 'Autre pays'];
  const passportEntries = officialCatalog.filter((entry) => entry.theme === 'passport_renewal');
  const officialOption = (entry, fallbackSource) => '<button class="journey-option" data-category="' + escapeHtml(entry.title) + '" data-catalog-id="' + entry.id + '" type="button"><strong>' + escapeHtml(entry.title) + '</strong><small style="font-weight:600;opacity:.78">Source : ' + escapeHtml(entry.source_label || fallbackSource) + ' ↗</small>' + (entry.theme === 'passport_renewal' && entry.notes ? '<small style="line-height:1.35;opacity:.82">' + escapeHtml(entry.notes) + '</small>' : '') + '</button>';
  const residenceOptions = essonneEntries.map((entry) => officialOption(entry, 'Préfecture de l’Essonne')).join('');
  const catalogueNote = definition.kind === 'residence' ? '<p class="catalogue-note">Catalogue pilote Essonne · sources contrôlées le 19 août 2026. Les intitulés ci-dessous proviennent du site de la préfecture.</p><p id="selected-route-confirmation" hidden style="margin:10px 0 0;color:#1f664f;font-size:13px;font-weight:700"></p>' : '<p id="selected-route-confirmation" hidden style="margin:10px 0 0;color:#1f664f;font-size:13px;font-weight:700"></p>';
  const passportField = '<label>Pays du passeport<select id="journey-passport-country" required><option value="">Choisir un pays</option>' + passportCountries.map((country) => '<option value="' + escapeHtml(country) + '">' + escapeHtml(country) + '</option>').join('') + '</select></label><div id="passport-situation" hidden aria-live="polite"></div><input id="journey-category" type="hidden" required><input id="journey-catalog-id" type="hidden">';
  const residenceField = '<label>Choisissez un parcours officiel de la Préfecture de l’Essonne<input id="journey-category" type="hidden" required><input id="journey-catalog-id" type="hidden"><div class="journey-option-picker">' + residenceOptions + '</div>' + catalogueNote + '</label>';
  const situationField = isCustom
    ? '<label>Nom de votre démarche<input id="journey-custom-title" required placeholder="Ex. Acheter un terrain au pays"></label><label>Liste des documents nécessaires<textarea id="journey-requirements" rows="6" required placeholder="Une pièce par ligne&#10;Ex. Copie du passeport&#10;Procuration légalisée&#10;Attestation bancaire"></textarea></label>'
    : (isPassport ? passportField : residenceField);
  const authorityLabel = isPassport ? 'Ville ou consulat où vous ferez la démarche' : definition.authorityLabel;
  const authorityPlaceholder = isPassport ? 'Ex. Consulat du Sénégal à Paris' : definition.authorityPlaceholder;
  const authorityField = '<label>' + authorityLabel + '<input id="journey-department" required placeholder="' + authorityPlaceholder + '" value="' + escapeHtml(profile ? profile.department : '') + '"></label>';
  const intro = isCustom ? 'Vous connaissez les pièces demandées ? Ajoutez-les : Jamm vous aidera à rassembler les fichiers de votre coffre.' : (definition.kind === 'residence' ? 'Ce premier catalogue couvre les personnes domiciliées en Essonne (91). Le lien officiel sera conservé dans votre dossier.' : 'Choisissez d’abord le pays, puis la situation exacte de votre passeport.');
  const formFields = isPassport ? situationField + authorityField : authorityField + situationField;
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">PRÉPARER MA DÉMARCHE</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">' + definition.title + '</h2><p style="color:#647069;line-height:1.45">' + intro + '</p><form id="qualification-form">' + formFields + (isCustom ? '' : '<label>Date d’expiration (si connue)<input id="journey-expiry" type="date" value="' + (profile && profile.expiry_date ? profile.expiry_date : '') + '"></label>') + '<label>Élément important pour votre cas<textarea id="journey-note" rows="3" placeholder="Ex. changement d’employeur, achat en indivision, enfant concerné…"></textarea></label><div class="qualification-submit-bar"><p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Enregistrer et préparer <span>→</span></button></div></form>');
  styleModal(node);
  node.querySelectorAll('textarea').forEach((field) => field.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #cdd6cd;border-radius:8px;padding:11px;background:#fff;font:14px Arial;resize:vertical');
  const category = node.querySelector('#journey-category');
  const catalogId = node.querySelector('#journey-catalog-id');
  const submit = node.querySelector('[type="submit"]');
  const selectRoute = (button) => {
    if (category) category.value = button.dataset.category;
    if (catalogId) catalogId.value = button.dataset.catalogId || '';
    node.querySelectorAll('[data-category]').forEach((item) => { item.style.background = '#fff'; item.style.borderColor = '#cdd6cd'; item.style.color = '#315d4c'; });
    button.style.background = '#1f664f'; button.style.borderColor = '#1f664f'; button.style.color = '#fff';
    const confirmation = node.querySelector('#selected-route-confirmation');
    if (confirmation) { confirmation.textContent = 'Parcours sélectionné : ' + button.dataset.category; confirmation.hidden = false; }
    if (submit) submit.innerHTML = 'Continuer avec ce parcours <span>→</span>';
  };
  const wireRouteButtons = (container = node) => {
    container.querySelectorAll('[data-category]').forEach((button) => {
      button.style.cssText = 'display:grid;gap:4px;border:1px solid #cdd6cd;border-radius:12px;padding:9px 12px;background:#fff;color:#315d4c;font:600 13px Arial;cursor:pointer;text-align:left';
      button.addEventListener('click', () => selectRoute(button));
    });
  };
  const picker = node.querySelector('.journey-option-picker');
  if (picker) picker.style.cssText = 'display:grid;grid-template-columns:1fr;gap:6px;margin-top:9px';
  const submitBar = node.querySelector('.qualification-submit-bar');
  if (submitBar) submitBar.style.cssText = 'position:sticky;bottom:-34px;margin:18px -34px -34px;padding:14px 34px 20px;background:#fbfaf6;border-top:1px solid #e0e5df;z-index:2';
  const catalogueNoteNode = node.querySelector('.catalogue-note');
  if (catalogueNoteNode) catalogueNoteNode.style.cssText = 'margin:10px 0 0;color:#69766e;font-size:12px;line-height:1.4';
  wireRouteButtons();
  const countrySelect = node.querySelector('#journey-passport-country');
  const situation = node.querySelector('#passport-situation');
  const showPassportSituations = (country) => {
    if (!situation) return;
    if (category) category.value = '';
    if (catalogId) catalogId.value = '';
    const confirmation = node.querySelector('#selected-route-confirmation');
    if (confirmation) confirmation.hidden = true;
    const countryPrefixes = {
      'Sénégal': 'passeport sénégalais',
      'France': 'passeport français',
      'Algérie': 'passeport algérien',
      'Maroc': 'passeport marocain',
      'Tunisie': 'passeport tunisien',
      'Mali': 'passeport malien',
      'Côte d’Ivoire': 'passeport ivoirien',
      'Cameroun': 'passeport camerounais',
      'République démocratique du Congo': 'passeport congolais',
      'Guinée': 'passeport guinéen',
      'Nigeria': 'passeport nigérian',
      'Éthiopie': 'passeport éthiopien',
      'Bénin': 'passeport béninois',
      'Mauritanie': 'passeport mauritanien',
      'Burkina Faso': 'passeport burkinabè',
      'République du Congo (Congo-Brazzaville)': 'passeport congolais (congo)'
    };
    const prefix = countryPrefixes[country] || country.toLocaleLowerCase('fr-FR');
    const matches = passportEntries.filter((entry) => entry.title.toLocaleLowerCase('fr-FR').startsWith(prefix + ' :'));
    situation.hidden = false;
    situation.style.cssText = 'display:grid;gap:8px;margin:14px 0 4px';
    if (!matches.length) {
      situation.innerHTML = '<p class="catalogue-note" style="margin:0;color:#69766e;font-size:13px;line-height:1.45">La checklist officielle pour ce pays arrive prochainement. Pour l’instant, utilisez « Faire une autre démarche » si vous avez déjà la liste des pièces.</p>';
      return;
    }
    situation.innerHTML = '<strong style="font:700 14px Arial">Quelle est votre situation ?</strong><div class="journey-option-picker">' + matches.map((entry) => officialOption(entry, 'Autorité consulaire compétente')).join('') + '</div><p class="catalogue-note" style="margin:0;color:#69766e;font-size:12px;line-height:1.4">Checklist vérifiée le 19 août 2026 auprès de l’autorité consulaire indiquée.</p>';
    const localPicker = situation.querySelector('.journey-option-picker');
    if (localPicker) localPicker.style.cssText = 'display:grid;grid-template-columns:1fr;gap:6px';
    wireRouteButtons(situation);
  };
  if (countrySelect) countrySelect.addEventListener('change', () => {
    if (countrySelect.value) showPassportSituations(countrySelect.value);
    else if (situation) { situation.hidden = true; situation.innerHTML = ''; }
  });
  if (profile) {
    if (isPassport && countrySelect) {
      const existingTitle = profile.permit_category || '';
      const existingCountry = passportCountries.find((country) => existingTitle.toLocaleLowerCase('fr-FR').startsWith(country.toLocaleLowerCase('fr-FR')));
      if (existingCountry) {
        countrySelect.value = existingCountry;
        showPassportSituations(existingCountry);
        const selectedOption = Array.from(node.querySelectorAll('[data-category]')).find((button) => button.dataset.category === existingTitle);
        if (selectedOption) selectedOption.click();
      }
    } else if (category) {
      category.value = profile.permit_category;
      const selectedOption = Array.from(node.querySelectorAll('[data-category]')).find((button) => button.dataset.category === profile.permit_category);
      if (selectedOption) selectedOption.click();
    }
    if (node.querySelector('#journey-custom-title')) node.querySelector('#journey-custom-title').value = profile.situation_answers?.custom_title || '';
    if (node.querySelector('#journey-requirements')) node.querySelector('#journey-requirements').value = (profile.situation_answers?.required_documents || []).join('\\n');
    if (profile.situation_answers?.note) node.querySelector('#journey-note').value = profile.situation_answers.note;
  }
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#qualification-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    const authority = node.querySelector('#journey-department').value.trim();
    if (!isCustom && !category.value) { showError(node, isPassport ? 'Choisissez d’abord le pays puis votre situation.' : 'Choisissez une option pour continuer.'); submit.disabled = false; return; }
    if (definition.kind === 'residence' && !/(^|\\D)91(\\D|$)|essonne/i.test(authority)) { showError(node, 'Le catalogue pilote couvre actuellement uniquement les démarches auprès de la Préfecture de l’Essonne (91).'); submit.disabled = false; return; }
    let journey = existingJourney;
    if (!journey) {
      const { data, error } = await supabaseClient.from('journeys').insert({ owner_id: currentUser.id, vault_id: currentVault.id, code }).select().single();
      if (error) { showError(node, error.message); submit.disabled = false; return; }
      journey = data;
    }
    const customTitle = node.querySelector('#journey-custom-title')?.value.trim();
    const requirements = node.querySelector('#journey-requirements')?.value.split('\\n').map((item) => item.trim()).filter(Boolean) || [];
    const previousAnswers = profile?.situation_answers || {};
    const selectedEntry = officialCatalog.find((entry) => entry.id === catalogId?.value);
    const payload = { journey_id: journey.id, owner_id: currentUser.id, department: authority, permit_category: customTitle || category.value, expiry_date: node.querySelector('#journey-expiry')?.value || null, situation_answers: { ...previousAnswers, note: node.querySelector('#journey-note').value.trim(), route: code, catalog_entry_id: selectedEntry?.id || null, custom_title: customTitle || undefined, required_documents: requirements, requirement_links: previousAnswers.requirement_links || {} }, source_status: selectedEntry ? selectedEntry.source_status : 'to_verify', official_source_url: selectedEntry?.source_url || null, source_checked_at: selectedEntry?.source_checked_at || null, updated_at: new Date().toISOString() };
    const { error } = await supabaseClient.from('journey_profiles').upsert(payload, { onConflict: 'journey_id' });
    if (error) { showError(node, error.message); submit.disabled = false; return; }
    node.remove(); currentJourney = journey; await loadData(); showView('journeys');
    $('#success').hidden = false;
    $('#success').textContent = 'Votre démarche est enregistrée. Le parcours officiel et sa source sont maintenant rattachés à ce dossier.';
    $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
async function completeJourney() {
  if (!currentJourney || currentJourney.status !== 'active') return;
  if (!confirm('Marquer cette démarche comme terminée ? Le dossier restera consultable dans vos démarches terminées.')) return;
  const { error } = await supabaseClient.from('journeys').update({ status: 'completed' }).eq('id', currentJourney.id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de terminer cette démarche : ' + error.message); return; }
  await loadData();
}

function showUpload(preselectedType) {
  const options = Object.entries(documentLabels).map(([value, label]) => '<option value="' + value + '"' + (value === preselectedType ? ' selected' : '') + '>' + label + '</option>').join('');
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Ajouter un document</h2><p style="color:#647069;line-height:1.45">Le fichier est conservé dans votre coffre privé. Vérifiez qu’il s’agit bien de votre document.</p><form id="upload-form"><label>Fichier<input id="upload-file" type="file" required accept=".pdf,image/jpeg,image/png"></label><label>Type de document<select id="upload-type">' + options + '</select></label><label>Titulaire du document (facultatif)<input id="upload-holder" placeholder="Ex. Mariam Diallo"></label><label>Pays émetteur (facultatif)<input id="upload-country" placeholder="Ex. France"></label><label>Date d’expiration (facultatif)<input id="upload-expiry" type="date"></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Ajouter au coffre <span>→</span></button></form>');
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
      holder_name: node.querySelector('#upload-holder').value.trim() || null, issuer_country: node.querySelector('#upload-country').value.trim() || null, expires_at: node.querySelector('#upload-expiry').value || null
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
  const profile = journeyProfiles[currentJourney.id];
  const catalogEntry = officialCatalog.find((entry) => entry.id === profile?.situation_answers?.catalog_entry_id);
  const personalRequirements = profile?.situation_answers?.required_documents || [];
  const isPersonal = personalRequirements.length > 0;
  const requirementItems = isPersonal
    ? personalRequirements.map((label) => ({ label, document_type: null }))
    : (catalogEntry?.requirements || []);
  if (!requirementItems.length) {
    $('#success').hidden = false;
    $('#success').textContent = 'La checklist de cette démarche n’est pas encore vérifiée par la source officielle compétente : aucun dossier n’a été téléchargé.';
    button.disabled = false;
    button.innerHTML = 'Préparer et télécharger le dossier <span>→</span>';
    return;
  }
  const links = profile.situation_answers?.requirement_links || {};
  const documentFor = (requirement) => documents.find((doc) => !doc.archived_at && documentMatchesRequirement(doc, requirement, links));
  const relevantDocuments = requirementItems.map(documentFor).filter(Boolean);
  const lines = ['JAMM — ' + journeyTitle(currentJourney), '', isPersonal ? 'Liste de préparation personnelle' : 'Checklist officielle de préparation', '------------------------------'];
  requirementItems.forEach((requirement) => lines.push((documentFor(requirement) ? '[x] ' : '[ ] ') + requirement.label));
  lines.push('', isPersonal ? 'Cette liste a été indiquée par vous. Jamm rassemble les documents rattachés, sans en vérifier l’exhaustivité.' : 'Checklist issue de la source officielle indiquée dans Jamm. Vérifiez toujours les éventuelles pièces conditionnelles avant le dépôt.');

  try {
    const zip = new JSZip();
    zip.file('checklist-jamm.txt', lines.join('\n'));
    const errors = [];
    for (const doc of relevantDocuments) {
      const { data, error } = await supabaseClient.storage.from('jamm-documents').download(doc.storage_path);
      if (error) { errors.push(doc.display_name); continue; }
      zip.file('documents/' + doc.display_name.replace(/[^a-zA-Z0-9._-]/g, '_'), data);
    }
    if (errors.length) zip.file('lire-moi.txt', 'Les fichiers suivants n’ont pas pu être ajoutés : ' + errors.join(', ') + '.');
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(archive);
    link.download = 'jamm-dossier-' + currentJourney.code + '.zip';
    link.click();
    URL.revokeObjectURL(link.href);
    $('#success').hidden = false;
    $('#success').textContent = isPersonal ? 'Votre dossier personnel a été préparé sur cet appareil.' : 'Votre dossier de préparation a été téléchargé sur cet appareil.';
  } catch (error) {
    $('#success').hidden = false;
    $('#success').textContent = 'Impossible de préparer le dossier. Vérifiez votre connexion et réessayez.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Préparer et télécharger le dossier <span>→</span>';
  }
}

function wireUi() {
  ['marketing-signup', 'hero-signup', 'bottom-signup'].forEach((id) => $('#' + id).addEventListener('click', () => showAuth()));
  ['marketing-login', 'hero-login'].forEach((id) => $('#' + id).addEventListener('click', () => showAuth(true)));
  document.querySelectorAll('.app-tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
  $('#add-document').addEventListener('click', () => currentUser ? showUpload() : showAuth());
  $('#prepare').addEventListener('click', downloadChecklist);
  $('#select-all').addEventListener('click', () => { selected = new Set(documents.filter((doc) => !doc.archived_at).map((doc) => doc.id)); renderDocuments(); });
  document.querySelectorAll('[data-vault-filter]').forEach((button) => button.addEventListener('click', () => { vaultFilter = button.dataset.vaultFilter; renderDocuments(); }));
  $('#invite').addEventListener('click', () => alert('Le partage familial sécurisé arrive dans une prochaine version.'));
  $('#new-journey').addEventListener('click', () => { $('#journey-list').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#complete-journey').addEventListener('click', completeJourney);
  $('#collapse-dossier').addEventListener('click', () => { dossierCollapsed = !dossierCollapsed; updateDossierCollapse(); });
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
  applyAppState();
  if (currentUser) {
    try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
  }
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    applyAppState();
    if (currentUser) {
      try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
    } else { currentVault = null; documents = []; currentJourney = null; selected = new Set(); }
  });
}
boot();
