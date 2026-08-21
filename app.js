const SUPABASE_URL = 'https://bnkpvyswxdflktpbvxbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xkbi-9JZAp5rGD1rwCf0mQ_1MliAIwY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const journeys = {
  residence_renewal: { title: 'Renouveler son titre de séjour', short: 'Titre de séjour', kind: 'residence', authorityLabel: 'Département où vous habitez', authorityPlaceholder: 'Ex. 75 — Paris' },
  passport_renewal: { title: 'Renouveler son passeport', short: 'Passeport', kind: 'passport', authorityLabel: 'Pays et ville de la démarche', authorityPlaceholder: 'Ex. France — mairie de Paris, ou consulat du Sénégal à Paris' },
  custom_procedure: { title: 'Faire une autre démarche', short: 'Démarche libre', kind: 'custom', authorityLabel: 'Lieu ou organisme concerné', authorityPlaceholder: 'Ex. Kinshasa, mairie, notaire, banque…' },
  home_purchase: { title: 'Acheter un logement', short: 'Projet immobilier', kind: 'home', authorityLabel: 'Ville où se situe le bien', authorityPlaceholder: 'Ex. Évry-Courcouronnes' },
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
const authRedirectUrl = () => window.location.origin + window.location.pathname;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const initials = (email) => email ? email.slice(0, 2).toUpperCase() : 'J';
const profileName = () => String(currentUser?.user_metadata?.first_name || '').trim();
const profileFullName = () => [currentUser?.user_metadata?.first_name, currentUser?.user_metadata?.last_name].filter(Boolean).join(' ').trim();
const profileInitials = () => {
  const parts = profileFullName().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() : initials(currentUser?.email);
};

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
  error.setAttribute('role', 'alert');
  error.setAttribute('aria-live', 'assertive');
  error.textContent = message;
  error.hidden = false;
}

function showConfirmDialog({ title, message, confirmLabel = 'Confirmer', tone = 'primary' }) {
  return new Promise((resolve) => {
    const node = modal('<div class="jamm-confirm-content"><span class="jamm-confirm-icon" aria-hidden="true">' + (tone === 'danger' ? '!' : '✓') + '</span><p class="eyebrow">CONFIRMATION</p><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(message) + '</p><div class="jamm-confirm-actions"><button class="outline" type="button" data-confirm-cancel>Annuler</button><button class="' + (tone === 'danger' ? 'danger-button' : 'primary') + '" type="button" data-confirm-accept>' + escapeHtml(confirmLabel) + '</button></div></div>');
    node.classList.add('jamm-confirm-dialog');
    node.setAttribute('role', 'presentation');
    const card = node.querySelector('.jamm-modal-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', title);
    const cancel = node.querySelector('[data-confirm-cancel]');
    const accept = node.querySelector('[data-confirm-accept]');
    const close = (answer) => {
      document.removeEventListener('keydown', onKeydown);
      node.remove();
      resolve(answer);
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Tab') {
        const focusable = [cancel, accept];
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index === 0) { event.preventDefault(); accept.focus(); }
        if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); cancel.focus(); }
      }
    };
    cancel.addEventListener('click', () => close(false));
    accept.addEventListener('click', () => close(true));
    node.addEventListener('click', (event) => { if (event.target === node) close(false); });
    document.addEventListener('keydown', onKeydown);
    requestAnimationFrame(() => cancel.focus());
  });
}

function showEmailConfirmation(node, email) {
  const card = node.querySelector('.jamm-modal-card');
  card.innerHTML = '<button class="close" aria-label="Fermer">×</button><div class="email-confirmation"><span class="email-confirmation-icon" aria-hidden="true">✉</span><p class="eyebrow">VÉRIFIEZ VOTRE ADRESSE E-MAIL</p><h2>Un lien vient de vous être envoyé.</h2><p>Pour activer votre coffre, ouvrez l’e-mail envoyé à :</p><strong class="email-confirmation-address">' + escapeHtml(email) + '</strong><ol><li>Ouvrez votre boîte de réception.</li><li>Cliquez sur le lien de confirmation de Jamlio.</li><li>Revenez ici pour vous connecter.</li></ol><p class="email-confirmation-hint">Pensez à vérifier vos courriers indésirables.</p><p data-email-status hidden class="email-confirmation-status" role="status"></p><div class="email-confirmation-actions"><button class="primary" type="button" data-email-confirmed>J’ai confirmé mon adresse <span>→</span></button><button class="link-button" type="button" data-email-resend>Renvoyer l’e-mail</button><button class="link-button" type="button" data-email-change>Utiliser une autre adresse</button></div></div>';
  styleModal(node);
  card.querySelector('.close').addEventListener('click', () => node.remove());
  card.querySelector('[data-email-confirmed]').addEventListener('click', () => { node.remove(); showAuth(true, email); });
  card.querySelector('[data-email-change]').addEventListener('click', () => { node.remove(); showAuth(false); });
  card.querySelector('[data-email-resend]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const status = card.querySelector('[data-email-status]');
    button.disabled = true;
    const { error } = await supabaseClient.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl() } });
    status.textContent = error ? 'Impossible de renvoyer le lien. Réessayez dans un instant.' : 'Un nouvel e-mail vient d’être envoyé à cette adresse.';
    status.hidden = false;
    button.disabled = false;
  });
}

function renderProfilePage() {
  if (!currentUser) return;
  const metadata = currentUser.user_metadata || {};
  const passportCountries = ['France', 'Algérie', 'Maroc', 'Tunisie', 'Sénégal', 'Mali', 'Côte d’Ivoire', 'Cameroun', 'Bénin', 'Gabon', 'Kenya', 'Mauritanie', 'Zimbabwe', 'Burkina Faso', 'République démocratique du Congo', 'République du Congo (Congo-Brazzaville)', 'Guinée', 'Nigeria', 'Éthiopie'];
  const countryOptions = '<option value="">Aucun pays par défaut</option>' + passportCountries.map((country) => '<option value="' + escapeHtml(country) + '"' + (metadata.default_passport_country === country ? ' selected' : '') + '>' + escapeHtml(country) + '</option>').join('');
  $('#profile-view').innerHTML = '<section class="profile-page" aria-labelledby="profile-title">' +
    '<div class="profile-page-heading"><button class="link-button" id="profile-back" type="button">← Retour à mon coffre</button><p class="eyebrow">MON PROFIL</p><h2 id="profile-title">Vos repères, à votre main.</h2><p>Ils aident Jamlio à mieux préparer vos démarches. Ils restent facultatifs et vous pouvez les modifier à tout moment.</p></div>' +
    '<div class="profile-summary"><span class="profile-avatar-large">' + escapeHtml(profileInitials()) + '</span><div><strong>' + escapeHtml(profileFullName() || 'Votre profil') + '</strong><span>' + escapeHtml(currentUser.email || '') + '</span></div></div>' +
    '<form id="profile-form" class="profile-form"><section class="profile-section"><div class="profile-section-heading"><p class="eyebrow">REPÈRES POUR MES DÉMARCHES</p><h3>Les informations utiles</h3><p>Jamlio ne récupère pas d’informations dans vos documents.</p></div>' +
    '<div class="profile-fields"><label>Prénom<input id="profile-first-name" autocomplete="given-name" maxlength="60" value="' + escapeHtml(metadata.first_name || '') + '" placeholder="Ex. Mariam"></label><label>Nom<input id="profile-last-name" autocomplete="family-name" maxlength="80" value="' + escapeHtml(metadata.last_name || '') + '" placeholder="Ex. Diallo"></label><label>Département de résidence par défaut<input id="profile-department" inputmode="numeric" maxlength="3" value="' + escapeHtml(metadata.default_department || '') + '" placeholder="Ex. 91"></label><label>Pays de passeport le plus utilisé<select id="profile-passport-country">' + countryOptions + '</select></label></div></section>' +
    '<section class="profile-section profile-account"><div class="profile-section-heading"><p class="eyebrow">COMPTE ET SÉCURITÉ</p><h3>Connexion</h3></div><div class="profile-account-row"><div><strong>Adresse e-mail</strong><span>' + escapeHtml(currentUser.email || '') + '</span></div><span class="profile-account-note">Modification bientôt disponible</span></div><div class="profile-account-row"><div><strong>Mot de passe</strong><span>Protège l’accès à votre coffre</span></div><span class="profile-account-note">Modification bientôt disponible</span></div></section>' +
    '<p data-error hidden class="profile-error"></p><p data-status hidden class="profile-status" role="status"></p><div class="profile-actions"><button class="primary" type="submit">Enregistrer les modifications <span>→</span></button><button id="profile-signout" class="outline profile-signout" type="button">Se déconnecter</button></div></form></section>';
  $('#profile-back').addEventListener('click', () => showView('vault'));
  $('#profile-signout').addEventListener('click', async () => {
    if (await showConfirmDialog({ title: 'Se déconnecter de Jamlio ?', message: 'Vous pourrez vous reconnecter à tout moment.', confirmLabel: 'Se déconnecter' })) await supabaseClient.auth.signOut();
  });
  $('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#profile-form [type="submit"]');
    const status = $('#profile-form [data-status]');
    button.disabled = true;
    const data = { ...metadata,
      first_name: $('#profile-first-name').value.trim(),
      last_name: $('#profile-last-name').value.trim(),
      default_department: $('#profile-department').value.trim(),
      default_passport_country: $('#profile-passport-country').value
    };
    const { data: response, error } = await supabaseClient.auth.updateUser({ data });
    if (error) { showError($('#profile-form'), 'Impossible d’enregistrer le profil : ' + error.message); button.disabled = false; return; }
    currentUser = response.user || currentUser;
    status.textContent = 'Vos informations ont été enregistrées.';
    status.hidden = false;
    button.disabled = false;
    render();
    renderProfilePage();
  });
}

function showProfile() {
  if (!currentUser) { showAuth(); return; }
  showView('profile');
}
function showAuth(initialLogin = false, prefilledEmail = '') {
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Bienvenue dans Jamlio.</h2><p style="color:#647069;line-height:1.45">Créez un compte pour conserver vos documents dans un espace privé.</p><form id="auth-form"><label>Adresse e-mail<input id="auth-email" type="email" autocomplete="email" value="' + escapeHtml(prefilledEmail) + '" required></label><label>Mot de passe<input id="auth-password" type="password" autocomplete="current-password" minlength="12" required></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><p data-status hidden style="color:#245843;font-size:13px;line-height:1.4"></p><button class="primary" id="auth-submit" type="submit">Créer mon compte <span>→</span></button></form><button id="switch-auth" style="margin-top:14px;border:0;background:none;color:#245843;text-decoration:underline;cursor:pointer">J’ai déjà un compte</button><p id="auth-note" style="margin-top:18px;color:#78847b;font-size:12px;line-height:1.4">Utilisez au moins 12 caractères. Nous ne stockons jamais votre mot de passe.</p>');
  styleModal(node);
  let loginMode = initialLogin;
  const updateMode = () => {
    $('#auth-submit').textContent = loginMode ? 'Se connecter →' : 'Créer mon compte →';
    $('#switch-auth').textContent = loginMode ? 'Créer un compte' : 'J’ai déjà un compte';
    $('#auth-note').textContent = loginMode ? 'Connectez-vous pour retrouver votre coffre privé.' : 'Utilisez au moins 12 caractères. Nous ne stockons jamais votre mot de passe.';
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
      activeView = 'vault';
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { showError(node, error.message); button.disabled = false; return; }
      node.remove();
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } });
      if (error) { showError(node, error.message); button.disabled = false; return; }
      if (!data.session) {
        showEmailConfirmation(node, email);
      } else node.remove();
    }
  });
}

async function ensureVault() {
  const { data, error } = await supabaseClient.from('vaults').select('*').eq('owner_id', currentUser.id).limit(1);
  if (error) throw error;
  if (data[0]) return data[0];
  const { data: created, error: createError } = await supabaseClient.from('vaults').insert({ owner_id: currentUser.id, name: 'Mon coffre Jamlio' }).select().single();
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
  selected = new Set(documents.filter((doc) => !doc.archived_at && !doc.deleted_at).map((doc) => doc.id));
  journeysList = trips || [];
  journeyProfiles = {};
  if (journeysList.length) {
    const { data: profiles, error: profilesError } = await supabaseClient.from('journey_profiles').select('*').eq('owner_id', currentUser.id).in('journey_id', journeysList.map((journey) => journey.id));
    if (profilesError) throw profilesError;
    journeyProfiles = Object.fromEntries((profiles || []).map((profile) => [profile.journey_id, profile]));
  }
  const expiredTrashedJourneys = journeysList.filter((journey) => journey.deleted_at && Date.now() - new Date(journey.deleted_at).getTime() >= 90 * 24 * 60 * 60 * 1000);
  let purgedJourneyCount = 0;
  for (const journey of expiredTrashedJourneys) {
    const { error } = await supabaseClient.from('journeys').delete().eq('id', journey.id).eq('owner_id', currentUser.id);
    if (!error) purgedJourneyCount += 1;
  }
  if (purgedJourneyCount) return loadData();
  const preservedJourney = currentJourney && journeysList.find((journey) => journey.id === currentJourney.id && !journey.deleted_at);
  currentJourney = preservedJourney || null;
  selected = new Set(documents.filter((doc) => !doc.archived_at && !doc.deleted_at).map((doc) => doc.id));
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
  const isProfile = view === 'profile';
  const isTrash = view === 'trash';
  $('#vault-view').hidden = !isVault;
  $('#journeys-view').hidden = view !== 'journeys';
  $('#profile-view').hidden = !isProfile;
  $('#trash-view').hidden = !isTrash;
  $('.app-welcome').hidden = isProfile || isTrash;
  $('#add-document').hidden = !isVault;
  document.querySelectorAll('.app-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  $('#trash-button').classList.toggle('active', isTrash);
  const today = $('#today');
  if (today) today.textContent = isVault ? 'VOTRE ESPACE PRIVÉ' : 'VOS DÉMARCHES';
  $('#app-subtitle').textContent = isVault
    ? 'Votre mémoire administrative, organisée et prête.'
    : 'Des dossiers temporaires qui s’appuient sur votre coffre.';
  if (isProfile) renderProfilePage();
  if (isTrash) renderTrashPage();
}

function journeyTitle(journey) {
  const profile = journey && journeyProfiles[journey.id];
  const baseTitle = journey && journeys[journey.code] ? journeys[journey.code].title : 'Démarche';
  if (profile?.situation_answers?.custom_title) return profile.situation_answers.custom_title;
  if (profile?.permit_category && ['home_purchase', 'residence_renewal', 'passport_renewal'].includes(journey?.code)) return baseTitle + ' — ' + profile.permit_category;
  return baseTitle;
}

function normalizedRequirements(items) {
  return Array.isArray(items) ? items.map((item) => typeof item === 'string' ? { label: item, document_type: null } : item).filter((item) => item?.label) : [];
}

function render() {
  const name = profileName();
  $('#greeting').textContent = name ? 'Bonjour, ' + name + '.' : 'Bonjour.';
  $('#profile-button').textContent = currentUser ? profileInitials() : '—';
  $('#person-one').textContent = currentUser ? profileInitials().slice(0, 1) : 'J';
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  const dossierTitle = $('#dossier-title');
  if (dossierTitle) dossierTitle.textContent = journey ? journeyTitle(currentJourney) : 'Choisissez votre démarche';
  renderDocuments();
  renderJourneys();
  renderTrashPage();
  renderChecklist();
  updateDossierCollapse();
}

function updateDossierCollapse() {
  const dossier = $('#demarche');
  const toggle = $('#collapse-dossier');
  dossier.hidden = !currentJourney;
  dossier.classList.remove('is-collapsed');
  dossierCollapsed = false;
  if (toggle) toggle.hidden = true;
}

function documentMatchesRequirement(doc, requirement, links = {}) {
  if (doc.id === links[requirement.label]) return true;
  const requiredType = requirement.document_type || requirement.category;
  if (requiredType) {
    if (doc.document_type === requiredType) return true;
    const fileName = String(doc.display_name || '').toLocaleLowerCase('fr-FR');
    const nameMatchers = {
      passport: /passeport/i,
      identity_card: /(?:cnie|carte[ _-]?d['’ ]?identit[ée])/i
    };
    return Boolean(nameMatchers[requiredType] && nameMatchers[requiredType].test(fileName));
  }
  const normalise = (value) => String(value || '').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const wanted = normalise(requirement.label);
  const fileName = normalise(doc.display_name);
  if (!wanted || !fileName) return false;
  const typeHints = [
    { type: 'passport', pattern: /passeport/ },
    { type: 'identity_card', pattern: /(?:cnie|carte d identite|carte identite)/ },
    { type: 'birth_certificate', pattern: /acte de naissance|extrait de naissance/ },
    { type: 'marriage_certificate', pattern: /acte de mariage|certificat de mariage/ },
    { type: 'proof_of_address', pattern: /justificatif de domicile|preuve de domicile/ },
    { type: 'residence_permit', pattern: /titre de sejour|carte de sejour/ }
  ];
  const hint = typeHints.find((item) => item.pattern.test(wanted));
  if (hint && doc.document_type === hint.type) return true;
  const ignored = new Set(['copie', 'document', 'piece', 'justificatif', 'attestation', 'du', 'de', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'a']);
  const tokens = wanted.split(' ').filter((token) => token.length > 2 && !ignored.has(token));
  const fileTokens = new Set(fileName.split(' '));
  const matched = tokens.filter((token) => fileTokens.has(token));
  return tokens.length === 1 ? matched.length === 1 : (tokens.length > 1 && matched.length >= 2);
}

async function openChecklistDocument(id) {
  const documentToOpen = documents.find((doc) => doc.id === id && !doc.archived_at);
  if (!documentToOpen) return;
  const preview = window.open('about:blank', '_blank');
  if (preview) preview.opener = null;
  const { data, error } = await supabaseClient.storage.from('jamm-documents').createSignedUrl(documentToOpen.storage_path, 60);
  if (error || !data?.signedUrl) {
    if (preview) preview.close();
    alert('Impossible d’ouvrir ce document. Vérifiez votre connexion et réessayez.');
    return;
  }
  if (preview) preview.location.replace(data.signedUrl);
  else window.location.assign(data.signedUrl);
}

async function downloadChecklistDocument(id) {
  const documentToDownload = documents.find((doc) => doc.id === id && !doc.archived_at);
  if (!documentToDownload) return;
  const { data, error } = await supabaseClient.storage.from('jamm-documents').download(documentToDownload.storage_path);
  if (error || !data) {
    alert('Impossible de télécharger ce document. Vérifiez votre connexion et réessayez.');
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(data);
  link.download = documentToDownload.display_name || 'document-jamm';
  link.click();
  URL.revokeObjectURL(link.href);
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
    if (doc.deleted_at) return false;
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
  const attentionCount = documents.filter((doc) => !doc.deleted_at && !doc.archived_at && ['expired', 'expiring'].includes(lifecycleFor(doc).key)).length;
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
    return '<article class="document-card lifecycle-' + lifecycle.key + '"><span class="doc-icon">◫</span><span class="document-copy"><strong>' + escapeHtml(doc.display_name) + '</strong><small>' + detail + '</small></span><span class="status ' + lifecycle.key + '">' + lifecycle.label + '</span><div class="vault-document-actions"><button class="open-vault-document" data-id="' + doc.id + '" type="button">Ouvrir</button><details class="vault-more"><summary>Plus</summary><div class="vault-more-menu"><button class="download-vault-document" data-id="' + doc.id + '" type="button">Télécharger</button><button class="edit-vault-document" data-id="' + doc.id + '" type="button">Modifier</button>' + action + '</div></details></div><button class="delete-document" data-id="' + doc.id + '" type="button" aria-label="Supprimer ' + escapeHtml(doc.display_name) + '">×</button></article>';
  }).join('');
  container.querySelectorAll('.archive-document').forEach((button) => button.addEventListener('click', () => archiveDocument(button.dataset.id)));
  container.querySelectorAll('.restore-document').forEach((button) => button.addEventListener('click', () => restoreDocument(button.dataset.id)));
  container.querySelectorAll('.open-vault-document').forEach((button) => button.addEventListener('click', () => openChecklistDocument(button.dataset.id)));
  container.querySelectorAll('.download-vault-document').forEach((button) => button.addEventListener('click', () => downloadChecklistDocument(button.dataset.id)));
  container.querySelectorAll('.edit-vault-document').forEach((button) => button.addEventListener('click', () => showDocumentEditor(button.dataset.id)));
  container.querySelectorAll('.delete-document').forEach((button) => button.addEventListener('click', () => deleteDocument(button.dataset.id)));
}

function showDocumentEditor(id) {
  const doc = documents.find((item) => item.id === id);
  if (!doc) return;
  const options = Object.entries(documentLabels).map(([value, label]) => '<option value="' + value + '"' + (value === doc.document_type ? ' selected' : '') + '>' + label + '</option>').join('');
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">COFFRE PRIVÉ</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Mettre à jour le document</h2><p style="color:#647069;line-height:1.45">Vous modifiez uniquement les informations de ce document. Le fichier d’origine reste inchangé.</p><form id="document-edit-form"><label>Nom du document<input id="edit-document-name" maxlength="180" required value="' + escapeHtml(doc.display_name) + '"></label><label>Type de document<select id="edit-document-type">' + options + '</select></label><label>Titulaire du document<input id="edit-document-holder" value="' + escapeHtml(doc.holder_name || '') + '" placeholder="Ex. Mariam Diallo"></label><label>Pays émetteur<input id="edit-document-country" value="' + escapeHtml(doc.issuer_country || '') + '" placeholder="Ex. France"></label><label>Date d’expiration<input id="edit-document-expiry" type="date" value="' + (doc.expires_at || '') + '"></label><p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Enregistrer les modifications <span>→</span></button></form>');
  styleModal(node);
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#document-edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = node.querySelector('[type="submit"]');
    button.disabled = true;
    const payload = {
      display_name: node.querySelector('#edit-document-name').value.trim(),
      document_type: node.querySelector('#edit-document-type').value,
      holder_name: node.querySelector('#edit-document-holder').value.trim() || null,
      issuer_country: node.querySelector('#edit-document-country').value.trim() || null,
      expires_at: node.querySelector('#edit-document-expiry').value || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from('documents').update(payload).eq('id', doc.id).eq('owner_id', currentUser.id);
    if (error) { showError(node, 'Impossible de mettre à jour ce document : ' + error.message); button.disabled = false; return; }
    node.remove();
    await loadData();
  });
}

async function archiveDocument(id) {
  const target = documents.find((doc) => doc.id === id);
  if (!target || !(await showConfirmDialog({ title: 'Archiver ce document ?', message: 'Il ne sera plus proposé dans vos démarches, mais restera conservé dans votre coffre.', confirmLabel: 'Archiver' }))) return;
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
  const requirements = personal.length ? normalizedRequirements(personal) : (Array.isArray(catalogEntry?.requirements) ? catalogEntry.requirements : []);
  if (!requirements.length) return null;
  const links = profile.situation_answers?.requirement_links || {};
  const ready = requirements.filter((requirement) => Boolean(linkedDocumentForRequirement(requirement, links))).length;
  return { ready, total: requirements.length };
}

function journeyStatusLabel(journey) {
  const profile = journeyProfiles[journey.id];
  if (journey.status === 'completed') return 'Terminée';
  if (!profile) return 'Situation à préciser';
  if (profile.source_status === 'verified') return 'Liste vérifiée';
  return 'Source à vérifier';
}

function trashDaysLeft(deletedAt) {
  const expiry = new Date(new Date(deletedAt).getTime() + 90 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function renderTrashPage() {
  const view = $('#trash-view');
  const trashedDocuments = documents.filter((doc) => doc.deleted_at);
  const trashedJourneys = journeysList.filter((journey) => journey.deleted_at);
  if (!view) return;
  const documentRows = trashedDocuments.length ? trashedDocuments.map((doc) => {
    const days = trashDaysLeft(doc.deleted_at);
    return '<article class="trash-page-item"><span class="trash-page-icon">◫</span><div><small>DOCUMENT</small><strong>' + escapeHtml(doc.display_name) + '</strong><em>' + (days ? days + ' jours avant suppression définitive' : 'Suppression définitive en cours') + '</em></div><div class="trash-page-actions"><button class="outline" data-trash-restore-document="' + doc.id + '" type="button">Restaurer</button><button class="link-button danger" data-trash-delete-document="' + doc.id + '" type="button">Supprimer définitivement</button></div></article>';
  }).join('') : '<p class="trash-empty">Aucun document dans la corbeille.</p>';
  const journeyRows = trashedJourneys.length ? trashedJourneys.map((journey) => {
    const days = trashDaysLeft(journey.deleted_at);
    return '<article class="trash-page-item"><span class="trash-page-icon">→</span><div><small>DÉMARCHE</small><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + (days ? days + ' jours avant suppression définitive' : 'Suppression définitive en cours') + '</em></div><div class="trash-page-actions"><button class="outline" data-trash-restore-journey="' + journey.id + '" type="button">Restaurer</button><button class="link-button danger" data-trash-delete-journey="' + journey.id + '" type="button">Supprimer définitivement</button></div></article>';
  }).join('') : '<p class="trash-empty">Aucune démarche dans la corbeille.</p>';
  view.innerHTML = '<section class="trash-page"><div class="trash-page-heading"><p class="eyebrow">CORBEILLE</p><h2>Éléments supprimés</h2><p>Les éléments restent récupérables pendant 90 jours. Vous pouvez aussi les supprimer définitivement.</p></div><section class="trash-page-section"><div class="trash-page-section-heading"><h3>Documents</h3><span>' + trashedDocuments.length + '</span></div>' + documentRows + '</section><section class="trash-page-section"><div class="trash-page-section-heading"><h3>Démarches</h3><span>' + trashedJourneys.length + '</span></div>' + journeyRows + '</section></section>';
  view.querySelectorAll('[data-trash-restore-document]').forEach((button) => button.addEventListener('click', () => restoreTrashedDocument(button.dataset.trashRestoreDocument)));
  view.querySelectorAll('[data-trash-delete-document]').forEach((button) => button.addEventListener('click', () => permanentlyDeleteTrashedDocument(button.dataset.trashDeleteDocument)));
  view.querySelectorAll('[data-trash-restore-journey]').forEach((button) => button.addEventListener('click', () => restoreTrashedJourney(button.dataset.trashRestoreJourney)));
  view.querySelectorAll('[data-trash-delete-journey]').forEach((button) => button.addEventListener('click', () => permanentlyDeleteJourney(button.dataset.trashDeleteJourney)));
}

async function restoreTrashedDocument(id) {
  const documentToRestore = documents.find((doc) => doc.id === id && doc.deleted_at);
  if (!documentToRestore) return;
  const { error } = await supabaseClient.from('documents').update({ deleted_at: null }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de restaurer ce document : ' + error.message); return; }
  await loadData();
  showView('trash');
}

async function permanentlyDeleteTrashedDocument(id) {
  const documentToDelete = documents.find((doc) => doc.id === id && doc.deleted_at);
  if (!documentToDelete || !(await showConfirmDialog({ title: 'Supprimer définitivement ce document ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer définitivement', tone: 'danger' }))) return;
  const { error } = await supabaseClient.from('documents').delete().eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de supprimer ce document : ' + error.message); return; }
  if (documentToDelete.storage_path) {
    const { error: storageError } = await supabaseClient.storage.from('jamm-documents').remove([documentToDelete.storage_path]);
    if (storageError) console.warn('Le document a été supprimé de la base, mais pas encore du stockage.', storageError.message);
  }
  await loadData();
  showView('trash');
}

function renderJourneys() {
  const board = $('#journey-list');
  const dossier = $('#demarche');
  const activeJourneys = journeysList.filter((journey) => !journey.deleted_at && journey.status === 'active');
  const completedJourneys = journeysList.filter((journey) => !journey.deleted_at && journey.status === 'completed');
  const trashedJourneys = journeysList.filter((journey) => journey.deleted_at);
  const activeCodes = new Set(activeJourneys.map((journey) => journey.code));
  const activeCard = (journey) => {
    const profile = journeyProfiles[journey.id];
    const progress = journeyProgress(journey);
    const hasDetailedTitle = Boolean(profile?.permit_category && ['home_purchase', 'residence_renewal', 'passport_renewal'].includes(journey.code));
    const situation = hasDetailedTitle ? '' : (profile?.permit_category ? escapeHtml(profile.permit_category) + ' · ' : 'Situation à préciser · ');
    const progressText = progress ? progress.ready + '/' + progress.total + ' pièces prêtes' : journeyStatusLabel(journey);
    const expanded = currentJourney?.id === journey.id;
    return '<article class="resume-item' + (expanded ? ' is-open' : '') + '"><button class="resume-journey" data-resume-id="' + journey.id + '" type="button" aria-expanded="' + expanded + '"><span class="resume-icon">' + (expanded ? '⌃' : '→') + '</span><span class="resume-copy"><small>À REPRENDRE</small><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + situation + progressText + '</em></span><span class="resume-action">' + (expanded ? 'Réduire' : 'Reprendre') + ' <b>' + (expanded ? '⌃' : '→') + '</b></span></button>' + (expanded ? '<div class="inline-dossier-slot" data-dossier-slot="' + journey.id + '"></div>' : '') + '</article>';
  };
  const completedCard = (journey) => {
    const profile = journeyProfiles[journey.id];
    const expanded = currentJourney?.id === journey.id;
    const detailedTitle = Boolean(profile?.permit_category && ['home_purchase', 'residence_renewal', 'passport_renewal'].includes(journey.code));
    const situation = detailedTitle ? '' : (profile?.permit_category ? escapeHtml(profile.permit_category) + ' · ' : 'Dossier archivé · ');
    const completedAt = journey.updated_at ? new Date(journey.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return '<article class="completed-item' + (expanded ? ' is-open' : '') + '"><button class="completed-journey" data-completed-id="' + journey.id + '" type="button" aria-expanded="' + expanded + '"><span class="completed-icon">✓</span><span class="completed-copy"><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + situation + (completedAt ? 'Terminé le ' + completedAt : 'Terminé') + '</em></span><span class="completed-action">' + (expanded ? 'Réduire' : 'Consulter') + ' <b>' + (expanded ? '⌃' : '→') + '</b></span></button><button class="journey-trash-button" data-trash-journey="' + journey.id + '" type="button">Supprimer</button>' + (expanded ? '<div class="inline-dossier-slot completed-dossier-slot" data-dossier-slot="' + journey.id + '"></div>' : '') + '</article>';
  };
  const trashCard = (journey) => {
    const expiry = new Date(new Date(journey.deleted_at).getTime() + 90 * 24 * 60 * 60 * 1000);
    const days = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return '<article class="journey-trash-item"><div><small>CORBEILLE</small><strong>' + escapeHtml(journeyTitle(journey)) + '</strong><em>' + (days ? days + ' jours avant suppression définitive' : 'Suppression définitive en cours') + '</em></div><div class="journey-trash-actions"><button class="outline" data-restore-journey="' + journey.id + '" type="button">Restaurer</button><button class="link-button danger" data-delete-journey="' + journey.id + '" type="button">Supprimer définitivement</button></div></article>';
  };
  const suggestions = Object.entries(journeys)
    .filter(([, definition]) => !definition.legacy)
    .map(([code, definition]) => '<button class="start-journey" data-start-journey="' + code + '" type="button"><span class="start-journey-icon">' + (definition.kind === 'residence' ? '▣' : definition.kind === 'passport' ? '◫' : '+') + '</span><span><strong>' + escapeHtml(definition.title) + '</strong><em>' + (definition.kind === 'residence' ? 'Choisir votre situation' : definition.kind === 'passport' ? 'Choisir le pays du passeport' : 'Créer votre liste de pièces') + '</em></span><b>→</b></button>').join('');
  const resumeSection = activeJourneys.length
    ? '<section class="journey-group resume-group"><div class="journey-section-heading"><p class="journey-group-title">À REPRENDRE</p><span>' + activeJourneys.length + ' dossier' + (activeJourneys.length > 1 ? 's' : '') + ' en cours</span></div><div class="resume-list">' + activeJourneys.map(activeCard).join('') + '</div></section>'
    : '<section class="journey-group resume-group empty-resume"><div class="journey-section-heading"><p class="journey-group-title">À REPRENDRE</p></div><p>Vous n’avez pas de dossier en cours.</p></section>';
  const completedSection = completedJourneys.length
    ? '<section class="completed-journeys"><div class="completed-heading"><div><p class="journey-group-title">VOS DÉMARCHES TERMINÉES</p><p>Vos dossiers restent consultables, sans encombrer les démarches en cours.</p></div><span class="completed-count">' + completedJourneys.length + '</span></div><div class="completed-list">' + completedJourneys.map(completedCard).join('') + '</div></section>'
    : '';
  board.innerHTML = resumeSection +
    '<section class="journey-group journey-new"><div class="journey-section-heading"><p class="journey-group-title">COMMENCER UNE DÉMARCHE</p><span>Préparez un nouveau dossier</span></div><div class="start-journey-grid">' + suggestions + '</div></section>' +
    completedSection;
  const slot = currentJourney && board.querySelector('[data-dossier-slot="' + currentJourney.id + '"]');
  if (slot && dossier) slot.appendChild(dossier);
  else if (dossier) board.insertAdjacentElement('afterend', dossier);
  const toggleJourney = (id) => {
    const selectedJourney = journeysList.find((journey) => journey.id === id) || null;
    if (currentJourney?.id === selectedJourney?.id) {
      currentJourney = null;
      dossierCollapsed = false;
      render();
      return;
    }
    currentJourney = selectedJourney;
    dossierCollapsed = false;
    render();
    requestAnimationFrame(() => $('#demarche')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  board.querySelectorAll('[data-resume-id]').forEach((button) => button.addEventListener('click', () => toggleJourney(button.dataset.resumeId)));
  board.querySelectorAll('[data-completed-id]').forEach((button) => button.addEventListener('click', () => toggleJourney(button.dataset.completedId)));
  board.querySelectorAll('[data-trash-journey]').forEach((button) => button.addEventListener('click', () => trashJourney(button.dataset.trashJourney)));
  board.querySelectorAll('[data-restore-journey]').forEach((button) => button.addEventListener('click', () => restoreTrashedJourney(button.dataset.restoreJourney)));
  board.querySelectorAll('[data-delete-journey]').forEach((button) => button.addEventListener('click', () => permanentlyDeleteJourney(button.dataset.deleteJourney)));
  board.querySelectorAll('[data-start-journey]').forEach((button) => button.addEventListener('click', () => chooseJourney(button.dataset.startJourney, true)));
}
function linkedDocumentForRequirement(requirement, links = {}) {
  const linkedId = links[requirement.label];
  if (linkedId) return documents.find((doc) => doc.id === linkedId && !doc.archived_at && !doc.deleted_at) || null;
  const compatible = documents.filter((doc) => !doc.archived_at && !doc.deleted_at && documentMatchesRequirement(doc, requirement, {}));
  return compatible.length === 1 ? compatible[0] : null;
}

function compatibleDocumentsForRequirement(requirement) {
  return documents.filter((doc) => !doc.archived_at && !doc.deleted_at && documentMatchesRequirement(doc, requirement, {}));
}

function renderChecklist() {
  const journey = currentJourney ? journeys[currentJourney.code] : null;
  const checklist = $('#checklist');
  const dossierContext = $('#dossier-context');
  if (dossierContext) dossierContext.innerHTML = '';
  if (!journey) {
    checklist.innerHTML = '<div class="journey-empty"><span>→</span><div><strong>Choisissez une démarche au-dessus.</strong><p>Jamlio vous demandera ensuite votre situation, puis préparera le dossier.</p></div></div>';
    $('#progress-value').textContent = '0%';
    $('#complete-journey').hidden = true;
    $('#reopen-journey').hidden = true;
    return;
  }
  const profile = journeyProfiles[currentJourney.id];
  const prepareButton = $('#prepare');
  prepareButton.disabled = false;
  prepareButton.innerHTML = currentJourney.status === 'completed' ? 'Télécharger le dossier <span>→</span>' : 'Télécharger le dossier de préparation <span>→</span>';
  $('#complete-journey').hidden = currentJourney.status !== 'active';
  $('#reopen-journey').hidden = currentJourney.status !== 'completed';
  if (!profile) {
    if (dossierContext) dossierContext.innerHTML = '<strong>Précisez votre situation</strong><span>Jamlio préparera ensuite la liste des pièces.</span>';
    $('#progress-value').textContent = '—';
    checklist.innerHTML = '<div class="journey-empty"><span>!</span><div><strong>Précisez votre situation.</strong><p>Jamlio ne propose pas de liste générique : nous avons besoin de comprendre votre démarche.</p><button class="outline" id="qualify-current-journey" type="button">Préciser ma situation</button></div></div>';
    checklist.querySelector('#qualify-current-journey').addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
    return;
  }
  const catalogEntry = officialCatalog.find((entry) => entry.id === profile.situation_answers?.catalog_entry_id);
  const personalRequirements = Array.isArray(profile.situation_answers?.required_documents) ? profile.situation_answers.required_documents : [];
  const officialRequirements = Array.isArray(catalogEntry?.requirements) ? catalogEntry.requirements : [];
  const isPersonal = personalRequirements.length > 0;
  const requirements = isPersonal ? normalizedRequirements(personalRequirements) : officialRequirements;
  const links = profile.situation_answers?.requirement_links || {};
  if (requirements.length) {
    const linked = (requirement) => linkedDocumentForRequirement(requirement, links);
    const ready = requirements.filter(linked).length;
    $('#progress-value').textContent = Math.round((ready / requirements.length) * 100) + '%';
    const sourceLink = !isPersonal && catalogEntry?.requirements_source_url ? '<a href="' + escapeHtml(catalogEntry.requirements_source_url) + '" target="_blank" rel="noopener">Voir la source des pièces ↗</a>' : '';
    const isNationalBase = !isPersonal && catalogEntry?.coverage_scope === 'national';
    const isHomePurchase = currentJourney.code === 'home_purchase';
    const heading = isPersonal
      ? (isHomePurchase ? '<strong>Votre checklist — ' + escapeHtml(profile.permit_category || 'Projet immobilier') + '</strong><span>Liste à compléter avec votre banque, votre notaire et les documents du bien.</span><button class="link-button" id="edit-qualification" type="button">Modifier</button>' : '<strong>Votre liste personnelle</strong><span>Les pièces que vous avez indiquées.</span><button class="link-button" id="edit-qualification" type="button">Modifier</button>')
      : '<strong>' + (isNationalBase ? 'Checklist nationale' : 'Checklist officielle') + '</strong><span>Source vérifiée. ' + sourceLink + '</span><button class="link-button" id="edit-qualification" type="button">Changer de situation</button>';
    if (dossierContext) dossierContext.innerHTML = heading;
    checklist.innerHTML = requirements.map((requirement) => {
      const doc = linked(requirement);
      const compatible = compatibleDocumentsForRequirement(requirement);
      const type = requirement.document_type || requirement.category || 'other';
      const pickerData = ' data-requirement="' + escapeHtml(requirement.label) + '" data-document-type="' + escapeHtml(type) + '"';
      const attachedName = doc ? '<small>' + escapeHtml(doc.display_name) + '</small>' : '';
      return '<div class="check-row ' + (doc ? 'done' : 'missing-piece') + '"><span class="checkmark">' + (doc ? '✓' : '!') + '</span><span class="check-copy"><strong>' + escapeHtml(requirement.label) + '</strong>' + attachedName + '</span>' + (doc ? '<span class="ready-actions"><button class="link-button open-checklist-document" data-document-id="' + doc.id + '" type="button">Ouvrir</button><button class="link-button change-requirement" ' + pickerData + ' type="button">Changer</button></span>' : '<span class="requirement-actions"><button class="outline add-requirement" ' + pickerData + ' type="button">Ajouter une pièce</button></span>') + '</div>';
    }).join('');
    const edit = dossierContext?.querySelector('#edit-qualification');
    if (edit) edit.addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
    checklist.querySelectorAll('.change-requirement').forEach((button) => button.addEventListener('click', () => showRequirementPicker(button.dataset.requirement, button.dataset.documentType)));
    checklist.querySelectorAll('.add-requirement').forEach((button) => button.addEventListener('click', () => showRequirementAddOptions(button.dataset.requirement, button.dataset.documentType)));
    checklist.querySelectorAll('.open-checklist-document').forEach((button) => button.addEventListener('click', () => openChecklistDocument(button.dataset.documentId)));

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
  const statusCopy = isCatalogRouteWithoutChecklist ? 'Le catalogue Essonne est prêt ; cette situation n’a pas encore de checklist détaillée dans Jamlio. Vous pouvez changer de situation, ou revenir plus tard après son intégration.' : (isVerified ? 'Jamlio a rattaché ce dossier à la publication compétente. Les pièces détaillées seront ajoutées après revue de cette source.' : 'Jamlio attend la publication officielle correspondant à votre situation avant de lister des pièces.');
  checklist.innerHTML = '<div class="journey-empty"><span>⌁</span><div><strong>' + statusTitle + '</strong><p><b>Situation :</b> ' + escapeHtml(profile.permit_category) + ' · <b>Lieu :</b> ' + escapeHtml(profile.department) + '.</p><p>' + statusCopy + ' Dernier contrôle : ' + checked + '.</p><p>' + sourceLine + '</p><button class="outline" id="edit-qualification" type="button">' + (isCatalogRouteWithoutChecklist ? 'Choisir un autre parcours' : 'Modifier ma situation') + '</button></div></div>';
  checklist.querySelector('#edit-qualification').addEventListener('click', () => showQualification(currentJourney.code, currentJourney));
}

function showRequirementAddOptions(requirement, documentType = 'other') {
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">AJOUTER UNE PIÈCE</p><h2 style="font:600 29px Georgia,serif;margin:8px 0 10px">Comment voulez-vous l’ajouter ?</h2><p style="color:#647069;line-height:1.45">Pour « ' + escapeHtml(requirement) + ' ».</p><div class="requirement-add-options"><button class="journey-card" id="choose-vault-document" type="button"><span class="journey-card-icon">◫</span><span><strong>Choisir depuis mon coffre</strong><em>Utiliser un document déjà enregistré</em></span><b>→</b></button><button class="journey-card" id="upload-new-document" type="button"><span class="journey-card-icon">+</span><span><strong>Ajouter un nouveau document</strong><em>L’importer puis le rattacher à cette pièce</em></span><b>→</b></button></div>');
  styleModal(node);
  const options = node.querySelector('.requirement-add-options');
  if (options) options.style.cssText = 'display:grid;gap:10px;margin-top:20px';
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#choose-vault-document').addEventListener('click', () => { node.remove(); showRequirementPicker(requirement, documentType); });
  node.querySelector('#upload-new-document').addEventListener('click', () => { node.remove(); showUpload(documentType || 'other'); });
}

function showRequirementPicker(requirement, documentType = 'other') {
  const allAvailable = documents.filter((doc) => !doc.archived_at && !doc.deleted_at);
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE COFFRE</p><h2 style="font:600 29px Georgia,serif;margin:8px 0 10px">Choisir dans mon coffre</h2><p style="color:#647069;line-height:1.45">Sélectionnez le document à utiliser pour « ' + escapeHtml(requirement) + ' ».</p><div id="requirement-documents">' + (allAvailable.length ? allAvailable.map((doc) => '<button class="journey-card" data-document-id="' + doc.id + '" type="button"><span class="journey-card-icon">◫</span><span><strong>' + escapeHtml(doc.display_name) + '</strong><em>' + escapeHtml(documentLabels[doc.document_type] || 'Document') + '</em></span><b>→</b></button>').join('') : '<p>Votre coffre ne contient pas encore de document. Ajoutez-en un, puis revenez le rattacher.</p>') + '</div>');
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

async function chooseJourney(code, startNew = false) {
  if (!currentUser) { showAuth(); return; }
  showView('journeys');
  const existing = journeysList.find((journey) => journey.code === code && journey.status === 'active');
  if (existing && !startNew) { currentJourney = existing; render(); $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  showQualification(code);
}

function showNewJourneyChooser() {
  if (!currentUser) { showAuth(); return; }
  const available = Object.entries(journeys).filter(([, definition]) => !definition.legacy);
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">NOUVELLE DÉMARCHE</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Que voulez-vous préparer ?</h2><p style="color:#647069;line-height:1.45">Vous pouvez créer une nouvelle démarche, même si vous en avez déjà une du même type.</p><div class="new-journey-chooser">' + available.map(([code, definition]) => '<button class="journey-card" data-new-journey="' + code + '" type="button"><span class="journey-card-icon">' + (definition.kind === 'residence' ? '▣' : definition.kind === 'passport' ? '◫' : '+') + '</span><span><strong>' + escapeHtml(definition.title) + '</strong><em>' + (definition.kind === 'residence' ? 'Titre de séjour' : definition.kind === 'passport' ? 'Passeport' : definition.kind === 'home' ? 'Projet immobilier' : 'Liste personnelle') + '</em></span><b>→</b></button>').join('') + '</div>'); 
  styleModal(node);
  const chooser = node.querySelector('.new-journey-chooser');
  if (chooser) chooser.style.cssText = 'display:grid;gap:9px;margin-top:20px';
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelectorAll('[data-new-journey]').forEach((button) => button.addEventListener('click', () => {
    node.remove();
    chooseJourney(button.dataset.newJourney, true);
  }));
}

function showQualification(code, existingJourney = null, customResidence = false) {
  const definition = journeys[code];
  const profile = existingJourney ? journeyProfiles[existingJourney.id] : null;
  const isCustomResidence = definition.kind === 'residence' && (customResidence || Boolean(profile?.situation_answers?.is_custom_residence));
  const isCustom = definition.kind === 'custom' || isCustomResidence;
  const isPassport = definition.kind === 'passport';
  const isHome = definition.kind === 'home';
  const homePurchaseSteps = [
    { title: 'Préparer mon financement', requirements: [{ label: 'Pièce d’identité en cours de validité', document_type: 'identity_card' }, { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' }, { label: 'Trois derniers justificatifs de revenus', document_type: 'other' }, { label: 'Avis d’imposition le plus récent', document_type: 'other' }, { label: 'Trois derniers relevés de compte', document_type: 'other' }, { label: 'Justificatif d’apport personnel', document_type: 'other' }] },
    { title: 'J’ai trouvé un bien', requirements: [{ label: 'Annonce ou fiche du bien', document_type: 'other' }, { label: 'Dossier de diagnostics du bien', document_type: 'other' }, { label: 'Plans et informations utiles sur le logement', document_type: 'other' }, { label: 'Documents de copropriété, si appartement', document_type: 'other' }] },
    { title: 'Signer le compromis ou la promesse', requirements: [{ label: 'Offre d’achat ou avant-contrat signé', document_type: 'other' }, { label: 'Annexes et diagnostics remis avec le contrat', document_type: 'other' }, { label: 'Dossier de demande de prêt', document_type: 'other' }, { label: 'Justificatif du dépôt de garantie, si versé', document_type: 'other' }] },
    { title: 'Finaliser l’achat', requirements: [{ label: 'Offre de prêt acceptée', document_type: 'other' }, { label: 'Assurance emprunteur', document_type: 'other' }, { label: 'Appel de fonds ou décompte du notaire', document_type: 'other' }, { label: 'Attestation de propriété puis acte authentique', document_type: 'other' }] }
  ];
  const residenceDepartments = [
    ['01','Ain'],['02','Aisne'],['03','Allier'],['04','Alpes-de-Haute-Provence'],['05','Hautes-Alpes'],['06','Alpes-Maritimes'],['07','Ardèche'],['08','Ardennes'],['09','Ariège'],['10','Aube'],['11','Aude'],['12','Aveyron'],['13','Bouches-du-Rhône'],['14','Calvados'],['15','Cantal'],['16','Charente'],['17','Charente-Maritime'],['18','Cher'],['19','Corrèze'],['2A','Corse-du-Sud'],['2B','Haute-Corse'],['21','Côte-d’Or'],['22','Côtes-d’Armor'],['23','Creuse'],['24','Dordogne'],['25','Doubs'],['26','Drôme'],['27','Eure'],['28','Eure-et-Loir'],['29','Finistère'],['30','Gard'],['31','Haute-Garonne'],['32','Gers'],['33','Gironde'],['34','Hérault'],['35','Ille-et-Vilaine'],['36','Indre'],['37','Indre-et-Loire'],['38','Isère'],['39','Jura'],['40','Landes'],['41','Loir-et-Cher'],['42','Loire'],['43','Haute-Loire'],['44','Loire-Atlantique'],['45','Loiret'],['46','Lot'],['47','Lot-et-Garonne'],['48','Lozère'],['49','Maine-et-Loire'],['50','Manche'],['51','Marne'],['52','Haute-Marne'],['53','Mayenne'],['54','Meurthe-et-Moselle'],['55','Meuse'],['56','Morbihan'],['57','Moselle'],['58','Nièvre'],['59','Nord'],['60','Oise'],['61','Orne'],['62','Pas-de-Calais'],['63','Puy-de-Dôme'],['64','Pyrénées-Atlantiques'],['65','Hautes-Pyrénées'],['66','Pyrénées-Orientales'],['67','Bas-Rhin'],['68','Haut-Rhin'],['69','Rhône'],['70','Haute-Saône'],['71','Saône-et-Loire'],['72','Sarthe'],['73','Savoie'],['74','Haute-Savoie'],['75','Paris'],['76','Seine-Maritime'],['77','Seine-et-Marne'],['78','Yvelines'],['79','Deux-Sèvres'],['80','Somme'],['81','Tarn'],['82','Tarn-et-Garonne'],['83','Var'],['84','Vaucluse'],['85','Vendée'],['86','Vienne'],['87','Haute-Vienne'],['88','Vosges'],['89','Yonne'],['90','Territoire de Belfort'],['91','Essonne'],['92','Hauts-de-Seine'],['93','Seine-Saint-Denis'],['94','Val-de-Marne'],['95','Val-d’Oise'],['971','Guadeloupe'],['972','Martinique'],['973','Guyane'],['974','La Réunion'],['976','Mayotte']
  ];
  const localResidenceEntries = officialCatalog.filter((entry) => entry.authority_code !== 'national' && entry.theme === 'residence_renewal' && entry.coverage_scope === 'local');
  const nationalResidenceEntries = officialCatalog.filter((entry) => entry.authority_code === 'national' && entry.theme === 'residence_renewal' && entry.coverage_scope === 'national');
  const commonResidenceProcedureCodes = ['national_employee', 'national_student', 'national_family', 'national_visitor'];
  const commonResidenceEntries = commonResidenceProcedureCodes.map((procedureCode) => nationalResidenceEntries.find((entry) => entry.procedure_code === procedureCode)).filter(Boolean);
  const passportCountries = ['France', 'Algérie', 'Maroc', 'Tunisie', 'Sénégal', 'Mali', 'Côte d’Ivoire', 'Cameroun', 'Bénin', 'Gabon', 'Kenya', 'Mauritanie', 'Zimbabwe', 'Burkina Faso', 'République démocratique du Congo', 'République du Congo (Congo-Brazzaville)', 'Guinée', 'Nigeria', 'Éthiopie', 'Autre pays'];
  const passportEntries = officialCatalog.filter((entry) => entry.theme === 'passport_renewal');
  const officialOption = (entry) => '<button class="journey-option" data-category="' + escapeHtml(entry.title) + '" data-catalog-id="' + entry.id + '" type="button"><strong>' + escapeHtml(entry.title) + '</strong></button>';
  const catalogueNote = '<p id="selected-route-confirmation" hidden style="margin:10px 0 0;color:#1f664f;font-size:13px;font-weight:700"></p>';
  const passportField = '<label>Pays du passeport<select id="journey-passport-country" required><option value="">Choisir un pays</option>' + passportCountries.map((country) => '<option value="' + escapeHtml(country) + '">' + escapeHtml(country) + '</option>').join('') + '</select></label><div id="passport-situation" hidden aria-live="polite"></div><input id="journey-category" type="hidden" required><input id="journey-catalog-id" type="hidden">';
  const residenceField = '<section class="residence-family-step"><strong style="display:block;font:700 14px Arial;margin:12px 0 8px">Situation la plus proche de votre titre actuel</strong><p style="margin:0 0 10px;color:#647069;font-size:13px;line-height:1.45">Ces parcours nationaux fréquents servent à préparer votre dossier. La checklist affichera toujours sa source officielle.</p><div class="journey-option-picker">' + commonResidenceEntries.map((entry) => officialOption(entry, 'Service-Public.fr')).join('') + '<button class="journey-option" id="custom-residence-route" type="button"><strong>Autre situation de titre de séjour</strong><small style="font-weight:600;opacity:.78">Créez votre propre liste de pièces si votre situation n’apparaît pas ici.</small></button></div></section><input id="journey-category" type="hidden" required><input id="journey-catalog-id" type="hidden">' + catalogueNote;
  const homeField = '<label>Type de bien<select id="home-property-type"><option value="apartment">Appartement</option><option value="house">Maison</option><option value="new_build">Logement neuf (VEFA)</option></select></label><label>Achetez-vous seul ou à plusieurs ?<select id="home-purchase-mode"><option value="solo">J’achète seul</option><option value="joint">J’achète à deux ou plus</option></select></label><label>Où en êtes-vous dans votre achat ?<input id="journey-category" type="hidden" required><input id="journey-catalog-id" type="hidden"><div class="journey-option-picker">' + homePurchaseSteps.map((step) => '<button class="journey-option" data-category="' + escapeHtml(step.title) + '" type="button"><strong>' + escapeHtml(step.title) + '</strong><small style="font-weight:600;opacity:.78">Préparer les documents de cette étape</small></button>').join('') + '</div><p id="selected-route-confirmation" hidden style="margin:10px 0 0;color:#1f664f;font-size:13px;font-weight:700"></p></label>';
  const situationField = isPassport ? passportField : (isHome ? homeField : residenceField);
  const authorityLabel = isPassport ? 'Ville ou consulat où vous ferez la démarche' : definition.authorityLabel;
  const authorityPlaceholder = isPassport ? 'Ex. Consulat du Sénégal à Paris' : definition.authorityPlaceholder;
  const defaultDepartment = String(currentUser?.user_metadata?.default_department || '').trim();
  const authorityField = definition.kind === 'residence'
    ? '<label>Département où vous habitez<select id="journey-department" required><option value="">Choisir votre département</option>' + residenceDepartments.map(([code, name]) => '<option value="' + code + '"' + ((profile ? profile.department : defaultDepartment) === code ? ' selected' : '') + '>' + code + ' — ' + escapeHtml(name) + '</option>').join('') + '</select></label>'
    : '<label>' + authorityLabel + '<input id="journey-department" required placeholder="' + authorityPlaceholder + '" value="' + escapeHtml(profile ? profile.department : (isPassport ? '' : defaultDepartment)) + '"></label>';
  const noteField = '<label>Élément important pour votre cas<textarea id="journey-note" rows="3" placeholder="Ex. changement d’employeur, achat en indivision, enfant concerné…"></textarea></label>';
  const customDetails = '<section id="custom-step-details"><p class="custom-step-label">ÉTAPE 1 SUR 2 · DÉCRIRE</p>' + authorityField + '<label>Nom de votre démarche<input id="journey-custom-title" required placeholder="Ex. Acheter un terrain au pays"></label>' + noteField + '<p id="custom-step-error" hidden style="color:#aa3425;font-size:13px"></p><button class="primary" id="custom-next-step" type="button">Continuer vers les documents <span>→</span></button></section>';
  const customDocuments = '<section id="custom-step-documents" hidden><p class="custom-step-label">ÉTAPE 2 SUR 2 · DOCUMENTS</p><div class="custom-requirements-field"><strong>Quels documents sont nécessaires ?</strong><p>Ajoutez une pièce par ligne. Jamlio cherchera ensuite les correspondances dans votre coffre.</p><div id="custom-requirements-list"></div><button class="outline" id="add-custom-requirement" type="button">+ Ajouter une pièce</button></div><button class="link-button" id="custom-back-step" type="button">← Modifier la démarche</button></section>';
  const intro = isCustom ? (isCustomResidence ? 'Indiquez votre situation et ajoutez les pièces que vous devez fournir. Jamlio cherchera ensuite ce qui est déjà présent dans votre coffre.' : 'Commencez par décrire votre besoin. Vous constituerez ensuite votre liste de pièces personnalisée.') : (isHome ? 'Jamlio vous aide à organiser les documents selon votre étape. Cette liste est une aide à compléter avec votre banque, votre notaire et les documents du bien.' : (definition.kind === 'residence' ? 'Choisissez la situation qui correspond le mieux à votre titre actuel. Chaque checklist standard reste reliée à sa source officielle.' : 'Choisissez d’abord le pays, puis la situation exacte de votre passeport.'));
  const formFields = isCustom ? customDetails + customDocuments : (isPassport ? situationField + authorityField : (definition.kind === 'residence' ? situationField + authorityField : authorityField + situationField));
  const modalTitle = isCustomResidence ? 'Autre situation de titre de séjour' : definition.title;
  const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">PRÉPARER MA DÉMARCHE</p><h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">' + modalTitle + '</h2><p style="color:#647069;line-height:1.45">' + intro + '</p><form id="qualification-form">' + formFields + (isCustom || isHome ? '' : '<label>Date d’expiration (si connue)<input id="journey-expiry" type="date" value="' + (profile && profile.expiry_date ? profile.expiry_date : '') + '"></label>') + (isCustom ? '' : noteField) + '<div class="qualification-submit-bar"><p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Enregistrer et préparer <span>→</span></button></div></form>');
  styleModal(node);
  node.querySelectorAll('textarea').forEach((field) => field.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #cdd6cd;border-radius:8px;padding:11px;background:#fff;font:14px Arial;resize:vertical');
  const customRequirementsList = node.querySelector('#custom-requirements-list');
  const addCustomRequirement = (value = '') => {
    if (!customRequirementsList) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px';
    row.innerHTML = '<input class="custom-requirement-input" aria-label="Document nécessaire" placeholder="Ex. Copie du passeport" value="' + escapeHtml(value) + '"><button type="button" aria-label="Retirer cette pièce" style="border:0;background:transparent;color:#8a6357;font-size:20px;cursor:pointer;padding:4px 7px">×</button>';
    const input = row.querySelector('input');
    input.style.cssText = 'display:block;box-sizing:border-box;flex:1;min-width:0;border:1px solid #cdd6cd;border-radius:8px;padding:11px;background:#fff;font:14px Arial';
    row.querySelector('button').addEventListener('click', () => {
      if (customRequirementsList.querySelectorAll('.custom-requirement-input').length === 1) { input.value = ''; input.focus(); return; }
      row.remove();
    });
    customRequirementsList.appendChild(row);
  };
  if (customRequirementsList) {
    const existingRequirements = profile?.situation_answers?.required_documents;
    (Array.isArray(existingRequirements) && existingRequirements.length ? existingRequirements : ['']).forEach(addCustomRequirement);
    const addButton = node.querySelector('#add-custom-requirement');
    addButton.style.cssText = 'margin-top:10px;border:1px solid #cdd6cd;border-radius:8px;background:#fff;color:#315d4c;padding:8px 10px;font:700 12px Arial;cursor:pointer';
    addButton.addEventListener('click', () => { addCustomRequirement(); customRequirementsList.lastElementChild?.querySelector('input')?.focus(); });
  }
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
  if (submitBar) {
    submitBar.style.cssText = 'position:sticky;bottom:-34px;margin:18px -34px -34px;padding:14px 34px 20px;background:#fbfaf6;border-top:1px solid #e0e5df;z-index:2';
    if (isCustom) submitBar.hidden = true;
  }
  if (isCustom) {
    const detailsStep = node.querySelector('#custom-step-details');
    const documentsStep = node.querySelector('#custom-step-documents');
    const showCustomStep = (step) => {
      detailsStep.hidden = step !== 1;
      documentsStep.hidden = step !== 2;
      submitBar.hidden = step !== 2;
      if (step === 2) documentsStep.querySelector('.custom-requirement-input')?.focus();
    };
    node.querySelector('#custom-next-step').addEventListener('click', () => {
      const title = node.querySelector('#journey-custom-title').value.trim();
      const authority = node.querySelector('#journey-department').value.trim();
      const error = node.querySelector('#custom-step-error');
      if (!title || !authority) {
        error.textContent = 'Indiquez le nom de la démarche et le lieu ou organisme concerné.';
        error.hidden = false;
        (!title ? node.querySelector('#journey-custom-title') : node.querySelector('#journey-department')).focus();
        return;
      }
      error.hidden = true;
      showCustomStep(2);
    });
    node.querySelector('#custom-back-step').addEventListener('click', () => showCustomStep(1));
  }
  const catalogueNoteNode = node.querySelector('.catalogue-note');
  if (catalogueNoteNode) catalogueNoteNode.style.cssText = 'margin:10px 0 0;color:#69766e;font-size:12px;line-height:1.4';
  wireRouteButtons();
  const countrySelect = node.querySelector('#journey-passport-country');
  const situation = node.querySelector('#passport-situation');
  const customResidenceRoute = node.querySelector('#custom-residence-route');
  if (customResidenceRoute) {
    customResidenceRoute.style.cssText = 'display:grid;gap:4px;border:1px dashed #7fa58e;border-radius:12px;padding:9px 12px;background:#f4faf4;color:#315d4c;font:600 13px Arial;cursor:pointer;text-align:left';
    customResidenceRoute.addEventListener('click', () => { node.remove(); showQualification('residence_renewal', null, true); });
  }
  const showPassportSituations = (country) => {
    if (!situation) return;
    if (category) category.value = '';
    if (catalogId) catalogId.value = '';
    const confirmation = node.querySelector('#selected-route-confirmation');
    if (confirmation) confirmation.hidden = true;
    const countryPrefixes = {
      'France': 'passeport français',
      'Sénégal': 'passeport sénégalais',
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
      'Gabon': 'passeport gabonais',
      'Kenya': 'passeport kényan',
      'Zimbabwe': 'passeport zimbabwéen',
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
    const appointmentWarning = country === 'Sénégal'
      ? '<div role="status" style="border:1px solid #e1b15b;background:#fff3d9;color:#6c4812;border-radius:10px;padding:11px 12px;font:13px/1.45 Arial"><strong>⚠️ Rendez-vous temporairement suspendus</strong><br>Vous pouvez préparer votre dossier ci-dessous, mais la plateforme officielle du Consulat général du Sénégal à Paris n’accepte pas actuellement de nouveaux créneaux. Consultez ses canaux officiels pour la réouverture.</div>'
      : '';
    situation.innerHTML = appointmentWarning + '<strong style="font:700 14px Arial">Quelle est votre situation ?</strong><div class="journey-option-picker">' + matches.map((entry) => officialOption(entry, 'Autorité consulaire compétente')).join('') + '</div><p class="catalogue-note" style="margin:0;color:#69766e;font-size:12px;line-height:1.4">Checklist vérifiée le 19 août 2026 auprès de l’autorité consulaire indiquée.</p>';
    const localPicker = situation.querySelector('.journey-option-picker');
    if (localPicker) localPicker.style.cssText = 'display:grid;grid-template-columns:1fr;gap:6px';
    wireRouteButtons(situation);
  };
  if (countrySelect) countrySelect.addEventListener('change', () => {
    if (countrySelect.value) showPassportSituations(countrySelect.value);
    else if (situation) { situation.hidden = true; situation.innerHTML = ''; }
  });
  if (!profile && isPassport && countrySelect) {
    const preferredCountry = String(currentUser?.user_metadata?.default_passport_country || '');
    if (passportCountries.includes(preferredCountry)) {
      countrySelect.value = preferredCountry;
      showPassportSituations(preferredCountry);
    }
  }
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
    } else if (definition.kind === 'residence' && !isCustomResidence && category) {
      category.value = profile.permit_category || '';
      const selectedOption = Array.from(node.querySelectorAll('[data-category]')).find((button) => button.dataset.category === profile.permit_category);
      if (selectedOption) selectedOption.click();
    } else if (category) {
      category.value = profile.permit_category;
      const selectedOption = Array.from(node.querySelectorAll('[data-category]')).find((button) => button.dataset.category === profile.permit_category);
      if (selectedOption) selectedOption.click();
    }
    if (isHome) {
      const homeType = node.querySelector('#home-property-type');
      const homeMode = node.querySelector('#home-purchase-mode');
      if (homeType && profile.situation_answers?.home_property_type) homeType.value = profile.situation_answers.home_property_type;
      if (homeMode && profile.situation_answers?.home_purchase_mode) homeMode.value = profile.situation_answers.home_purchase_mode;
    }
    if (node.querySelector('#journey-custom-title')) node.querySelector('#journey-custom-title').value = profile.situation_answers?.custom_title || '';

    if (profile.situation_answers?.note) node.querySelector('#journey-note').value = profile.situation_answers.note;
  }
  node.querySelector('.close').addEventListener('click', () => node.remove());
  node.querySelector('#qualification-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
    const authority = node.querySelector('#journey-department').value.trim();
    if (!isCustom && !category.value) { showError(node, isPassport ? 'Choisissez d’abord le pays puis votre situation.' : 'Choisissez une option pour continuer.'); submit.disabled = false; return; }
    const customRequirements = isCustom ? Array.from(node.querySelectorAll('.custom-requirement-input')).map((input) => input.value.trim()).filter(Boolean) : [];
    if (isCustom && !customRequirements.length) { showError(node, 'Ajoutez au moins un document nécessaire pour créer cette démarche.'); submit.disabled = false; return; }
    let journey = existingJourney;
    if (!journey) {
      const { data, error } = await supabaseClient.from('journeys').insert({ owner_id: currentUser.id, vault_id: currentVault.id, code }).select().single();
      if (error) { showError(node, error.message); submit.disabled = false; return; }
      journey = data;
    }
    const customTitle = node.querySelector('#journey-custom-title')?.value.trim();
    const propertyType = node.querySelector('#home-property-type')?.value || '';
    const purchaseMode = node.querySelector('#home-purchase-mode')?.value || '';
    const homeBaseRequirements = homePurchaseSteps.find((step) => step.title === category?.value)?.requirements || [];
    const propertyRequirements = propertyType === 'apartment' ? [{ label: 'Règlement de copropriété et derniers procès-verbaux d’assemblée générale', document_type: 'other' }] : (propertyType === 'house' ? [{ label: 'Informations sur le terrain, les limites et les éventuelles servitudes', document_type: 'other' }] : (propertyType === 'new_build' ? [{ label: 'Contrat de réservation et garantie financière du programme', document_type: 'other' }] : []));
    const coBuyerRequirements = purchaseMode === 'joint' ? [{ label: 'Pièce d’identité du ou des co-acquéreurs', document_type: 'identity_card' }, { label: 'Justificatifs de revenus du ou des co-acquéreurs', document_type: 'other' }] : [];
    const requirements = isHome ? [...homeBaseRequirements, ...propertyRequirements, ...coBuyerRequirements] : (isCustom ? customRequirements : []);
    const previousAnswers = profile?.situation_answers || {};
    const selectedEntry = officialCatalog.find((entry) => entry.id === catalogId?.value);
    const payload = { journey_id: journey.id, owner_id: currentUser.id, department: authority, permit_category: customTitle || category?.value || '', expiry_date: node.querySelector('#journey-expiry')?.value || null, situation_answers: { ...previousAnswers, note: node.querySelector('#journey-note').value.trim(), route: code, catalog_entry_id: selectedEntry?.id || null, custom_title: customTitle || undefined, required_documents: requirements, home_property_type: isHome ? propertyType : previousAnswers.home_property_type, home_purchase_mode: isHome ? purchaseMode : previousAnswers.home_purchase_mode, requirement_links: previousAnswers.requirement_links || {}, is_custom_residence: isCustomResidence || Boolean(previousAnswers.is_custom_residence) }, source_status: selectedEntry ? selectedEntry.source_status : 'to_verify', official_source_url: selectedEntry?.source_url || null, source_checked_at: selectedEntry?.source_checked_at || null, updated_at: new Date().toISOString() };
    const { error } = await supabaseClient.from('journey_profiles').upsert(payload, { onConflict: 'journey_id' });
    if (error) { showError(node, error.message); submit.disabled = false; return; }
    node.remove(); currentJourney = journey; await loadData(); showView('journeys');
    $('#success').hidden = false;
    $('#success').textContent = isHome ? 'Votre étape d’achat est enregistrée. Jamlio organise vos pièces, à compléter avec votre banque et votre notaire.' : 'Votre démarche est enregistrée. Le parcours officiel et sa source sont maintenant rattachés à ce dossier.';
    $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showError(node, 'Impossible d’enregistrer cette démarche. Réessayez dans un instant.');
      submit.disabled = false;
    }
  });
}
async function completeJourney() {
  if (!currentJourney || currentJourney.status !== 'active') return;
  if (!(await showConfirmDialog({ title: 'Marquer cette démarche comme terminée ?', message: 'Le dossier restera consultable dans vos démarches terminées.', confirmLabel: 'Marquer comme terminée' }))) return;
  const { error } = await supabaseClient.from('journeys').update({ status: 'completed' }).eq('id', currentJourney.id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de terminer cette démarche : ' + error.message); return; }
  await loadData();
}

async function reopenJourney() {
  if (!currentJourney || currentJourney.status !== 'completed') return;
  if (!(await showConfirmDialog({ title: 'Rouvrir ce dossier ?', message: 'Il reviendra dans « À reprendre ». Vos documents et votre checklist seront conservés.', confirmLabel: 'Rouvrir le dossier' }))) return;
  const { data, error } = await supabaseClient
    .from('journeys')
    .update({ status: 'active' })
    .eq('id', currentJourney.id)
    .eq('owner_id', currentUser.id)
    .select('id, status')
    .single();
  if (error || data?.status !== 'active') {
    alert('Impossible de rouvrir ce dossier. Vérifiez votre connexion et réessayez.');
    return;
  }
  await loadData();
  showView('journeys');
  $('#success').hidden = false;
  $('#success').textContent = 'Dossier rouvert : vous pouvez reprendre sa checklist.';
  requestAnimationFrame(() => $('#demarche')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

async function trashJourney(id) {
  const journey = journeysList.find((item) => item.id === id);
  if (!journey) return;
  const retentionEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!(await showConfirmDialog({ title: 'Supprimer cette démarche ?', message: 'Elle sera placée dans la corbeille jusqu’au ' + retentionEnd + '. Vos documents du coffre ne seront pas supprimés.', confirmLabel: 'Supprimer', tone: 'danger' }))) return;
  const { error } = await supabaseClient.from('journeys').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de placer cette démarche dans la corbeille : ' + error.message); return; }
  if (currentJourney?.id === id) currentJourney = null;
  await loadData();
  showView('journeys');
}

async function restoreTrashedJourney(id) {
  const journey = journeysList.find((item) => item.id === id);
  if (!journey) return;
  const { error } = await supabaseClient.from('journeys').update({ deleted_at: null }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de restaurer cette démarche : ' + error.message); return; }
  await loadData();
  showView('trash');
  $('#success').hidden = false;
  $('#success').textContent = 'Démarche restaurée.';
}

async function permanentlyDeleteJourney(id) {
  const journey = journeysList.find((item) => item.id === id);
  if (!journey || !(await showConfirmDialog({ title: 'Supprimer définitivement cette démarche ?', message: 'Cette action est irréversible. Les documents de votre coffre seront conservés.', confirmLabel: 'Supprimer définitivement', tone: 'danger' }))) return;
  const { error } = await supabaseClient.from('journeys').delete().eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de supprimer cette démarche : ' + error.message); return; }
  await loadData();
  showView('trash');
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
  if (!documentToDelete) return;
  const retentionEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!(await showConfirmDialog({ title: 'Supprimer ce document ?', message: 'Il sera placé dans votre corbeille jusqu’au ' + retentionEnd + '. Vous pourrez le restaurer ou le supprimer définitivement à tout moment.', confirmLabel: 'Supprimer', tone: 'danger' }))) return;
  const { error } = await supabaseClient.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('owner_id', currentUser.id);
  if (error) { alert('Impossible de placer ce document dans la corbeille : ' + error.message); return; }
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
    ? normalizedRequirements(personalRequirements)
    : (catalogEntry?.requirements || []);
  if (!requirementItems.length) {
    $('#success').hidden = false;
    $('#success').textContent = 'La checklist de cette démarche n’est pas encore vérifiée par la source officielle compétente : aucun dossier n’a été téléchargé.';
    button.disabled = false;
    button.innerHTML = currentJourney?.status === 'completed' ? 'Télécharger le dossier <span>→</span>' : 'Télécharger le dossier de préparation <span>→</span>';
    return;
  }
  const links = profile.situation_answers?.requirement_links || {};
  const documentFor = (requirement) => linkedDocumentForRequirement(requirement, links);
  const relevantDocuments = requirementItems.map(documentFor).filter(Boolean);
  const lines = ['JAMM — ' + journeyTitle(currentJourney), '', isPersonal ? 'Liste de préparation personnelle' : 'Checklist officielle de préparation', '------------------------------'];
  requirementItems.forEach((requirement) => lines.push((documentFor(requirement) ? '[x] ' : '[ ] ') + requirement.label));
  lines.push('', isPersonal ? 'Cette liste a été indiquée par vous. Jamlio rassemble les documents rattachés, sans en vérifier l’exhaustivité.' : 'Checklist issue de la source officielle indiquée dans Jamlio. Vérifiez toujours les éventuelles pièces conditionnelles avant le dépôt.');

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
    button.innerHTML = currentJourney?.status === 'completed' ? 'Télécharger le dossier <span>→</span>' : 'Télécharger le dossier de préparation <span>→</span>';
  }
}

function wireUi() {
  ['marketing-signup', 'hero-signup', 'bottom-signup'].forEach((id) => $('#' + id).addEventListener('click', () => showAuth()));
  ['marketing-login', 'hero-login'].forEach((id) => $('#' + id).addEventListener('click', () => showAuth(true)));
  document.querySelectorAll('.app-tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
  $('#add-document').addEventListener('click', () => currentUser ? showUpload() : showAuth());
  $('#prepare').addEventListener('click', downloadChecklist);
  document.querySelectorAll('[data-vault-filter]').forEach((button) => button.addEventListener('click', () => { vaultFilter = button.dataset.vaultFilter; renderDocuments(); }));
  $('#invite').addEventListener('click', () => alert('Le partage familial sécurisé arrive dans une prochaine version.'));
  $('#new-journey').addEventListener('click', showNewJourneyChooser);
  $('#complete-journey').addEventListener('click', completeJourney);
  $('#reopen-journey').addEventListener('click', reopenJourney);
  $('#profile-button').addEventListener('click', () => showProfile());
  $('#trash-button').addEventListener('click', () => showView('trash'));
  document.querySelectorAll('[data-scroll]').forEach((button) => button.addEventListener('click', () => $('#' + button.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
}

async function boot() {
  wireUi();
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  if (currentUser) activeView = 'vault';
  applyAppState();
  if (currentUser) {
    try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
  }
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser && event === 'SIGNED_IN') activeView = 'vault';
    applyAppState();
    if (currentUser) {
      try { await loadData(); } catch (error) { alert('Impossible de charger votre coffre : ' + error.message); }
    } else { currentVault = null; documents = []; currentJourney = null; selected = new Set(); }
  });
}
boot();
