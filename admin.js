const SUPABASE_URL = 'https://bnkpvyswxdflktpbvxbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xkbi-9JZAp5rGD1rwCf0mQ_1MliAIwY';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const app = document.querySelector('#app');
let user = null;
let role = null;
let catalog = [];
let audit = [];
let metrics = {};
let view = 'overview';
let supportUsers = [];
let selectedSupportUser = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const today = () => new Date().toISOString().slice(0, 10);
const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const isoDate = (value) => value ? new Date(value + 'T12:00:00.000Z').toISOString() : null;
const shortDate = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : 'Non renseignée';
const longDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Non renseignée';
const requirementCount = (entry) => Array.isArray(entry.requirements) ? entry.requirements.length : 0;
const number = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

function sourceIsDue(entry) {
  if (entry.source_status === 'to_review') return true;
  return Boolean(entry.review_due_at) && new Date(entry.review_due_at).getTime() <= Date.now();
}

function statusTag(status) {
  const labels = { verified: 'Vérifié', to_review: 'À contrôler', retired: 'Retiré' };
  return '<span class="tag ' + escapeHtml(status) + '">' + (labels[status] || escapeHtml(status)) + '</span>';
}

function login() {
  app.innerHTML = '<section class="login-panel"><p class="eyebrow">JAMLIO · ACCÈS RÉSERVÉ</p><h1>Console d’administration</h1><p>Gérez les sources et les checklists, sans jamais accéder aux documents privés des utilisateurs.</p><form id="login-form"><label>Adresse e-mail<input id="email" type="email" autocomplete="email" required></label><label>Mot de passe<input id="password" type="password" autocomplete="current-password" required></label><p class="form-error hidden" id="login-error"></p><button class="button primary wide" type="submit">Se connecter <span>→</span></button></form></section>';
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = event.submitter || form.querySelector('button[type="submit"]');
    const message = document.querySelector('#login-error');
    button.disabled = true;
    message.classList.add('hidden');

    try {
      const { error } = await client.auth.signInWithPassword({
        email: document.querySelector('#email').value.trim(),
        password: document.querySelector('#password').value
      });
      if (error) {
        message.textContent = 'Adresse e-mail ou mot de passe incorrect.';
        message.classList.remove('hidden');
        button.disabled = false;
        return;
      }

      // Supabase has now stored the session. Reloading runs the normal admin check
      // and immediately opens the console for authorised accounts.
      location.reload();
    } catch (error) {
      message.textContent = 'La connexion n’a pas pu être effectuée. Vérifiez votre réseau puis réessayez.';
      message.classList.remove('hidden');
      button.disabled = false;
    }
  });
}

function denied() {
  app.innerHTML = '<section class="login-panel"><p class="eyebrow">ACCÈS REFUSÉ</p><h1>Cette console est réservée.</h1><p>Votre compte est bien connecté, mais il ne dispose pas d’un rôle d’administration Jamlio.</p><a class="button secondary" href="./">Retourner au site</a></section>';
}

async function loadData() {
  const [catalogResult, auditResult, metricsResult] = await Promise.all([
    client.from('official_catalog_entries').select('*').order('updated_at', { ascending: false }),
    client.from('catalog_audit_events').select('*').order('occurred_at', { ascending: false }).limit(80),
    client.rpc('jamlio_admin_metrics')
  ]);
  if (catalogResult.error) throw catalogResult.error;
  if (auditResult.error) throw auditResult.error;
  if (metricsResult.error) throw metricsResult.error;
  catalog = catalogResult.data || [];
  audit = auditResult.data || [];
  metrics = Array.isArray(metricsResult.data) ? (metricsResult.data[0] || {}) : (metricsResult.data || {});
}

function navigation(content) {
  const links = [
    ['overview', 'Vue d’ensemble'],
    ['catalog', 'Catalogue'],
    ['review', 'À vérifier'],
    ['support', 'Support bêta'],
    ['audit', 'Journal']
  ];
  app.innerHTML = '<div class="console"><aside class="sidebar"><a class="console-brand" href="./"><span>j</span>amlio <small>Administration</small></a><p class="eyebrow">PILOTAGE</p><nav>' + links.map(([id, label]) => '<button class="nav-button ' + (view === id ? 'active' : '') + '" data-view="' + id + '">' + label + '</button>').join('') + '</nav><div class="sidebar-note"><strong>Confidentialité</strong><p>Les indicateurs sont agrégés. Aucun nom, fichier ni contenu privé n’est accessible ici.</p></div><p class="role">Rôle : ' + escapeHtml(role) + '</p></aside><section class="main-panel" id="content">' + content + '</section></div>';
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    view = button.dataset.view;
    render();
  }));
}

function statsCards() {
  return '<div class="stats-grid">' +
    '<article class="stat-card"><span>Utilisateurs avec un coffre</span><strong>' + number(metrics.vault_count) + '</strong><small>indicateur agrégé</small></article>' +
    '<article class="stat-card"><span>Documents actifs</span><strong>' + number(metrics.document_count) + '</strong><small>hors corbeille</small></article>' +
    '<article class="stat-card"><span>Démarches en cours</span><strong>' + number(metrics.active_journey_count) + '</strong><small>à reprendre ou à préparer</small></article>' +
    '<article class="stat-card"><span>Démarches terminées</span><strong>' + number(metrics.completed_journey_count) + '</strong><small>hors corbeille</small></article>' +
    '</div>';
}

function sourceRow(entry, compact = false) {
  const requirements = requirementCount(entry);
  return '<article class="source-row ' + (compact ? 'compact' : '') + '">' +
    '<div class="source-copy"><div class="source-heading">' + statusTag(entry.source_status) + '<strong>' + escapeHtml(entry.title) + '</strong></div>' +
    '<p>' + escapeHtml(entry.authority_code) + ' · ' + escapeHtml(entry.theme) + ' · ' + requirements + ' pièce' + (requirements > 1 ? 's' : '') + '</p>' +
    '<small>Contrôlée le ' + shortDate(entry.source_checked_at) + (entry.review_due_at ? ' · revue prévue le ' + shortDate(entry.review_due_at) : ' · date de revue à définir') + '</small></div>' +
    '<div class="row-actions"><a class="text-link" href="' + escapeHtml(entry.source_url) + '" target="_blank" rel="noopener">Source ↗</a><button class="button secondary" data-edit="' + entry.id + '">Modifier</button></div>' +
    '</article>';
}

function bindEditors(scope = document) {
  scope.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editor(catalog.find((entry) => entry.id === button.dataset.edit))));
}

function overview() {
  const due = catalog.filter(sourceIsDue).sort((a, b) => String(a.review_due_at || '').localeCompare(String(b.review_due_at || ''))).slice(0, 5);
  const recent = audit.slice(0, 6);
  navigation('<header class="page-heading"><div><p class="eyebrow">VUE D’ENSEMBLE</p><h1>Le site, d’un coup d’œil.</h1><p>Suivez la couverture du catalogue et les contrôles à effectuer. Les données d’usage restent agrégées.</p></div><button class="button primary" id="new-entry">+ Ajouter une source</button></header>' +
    statsCards() +
    '<div class="dashboard-grid"><section class="inset-card"><div class="section-heading"><div><p class="eyebrow">PRIORITÉ</p><h2>Sources à vérifier</h2><p class="muted">' + number(metrics.sources_without_review_date) + ' source(s) vérifiée(s) sans date de prochaine revue : à planifier, pas à vérifier.</p></div><button class="text-button" data-go="review">Voir tout</button></div>' +
      (due.length ? due.map((entry) => sourceRow(entry, true)).join('') : '<div class="empty"><strong>Tout est à jour.</strong><p>Aucune source n’attend de contrôle.</p></div>') +
    '</section><section class="inset-card"><div class="section-heading"><div><p class="eyebrow">TRAÇABILITÉ</p><h2>Dernières modifications</h2></div><button class="text-button" data-go="audit">Voir le journal</button></div>' +
      (recent.length ? recent.map((event) => '<div class="audit-line"><strong>' + ({ created: 'Création', updated: 'Mise à jour', deleted: 'Suppression' }[event.action] || event.action) + '</strong><span>' + escapeHtml(event.entry_title || 'Fiche retirée') + '</span><small>' + longDate(event.occurred_at) + '</small></div>').join('') : '<div class="empty"><strong>Pas encore d’activité.</strong></div>') +
    '</section></div><section class="privacy-banner"><strong>Le bon niveau d’accès.</strong><p>Le backoffice pilote les parcours et la qualité des sources. Les documents, les noms et le contenu des dossiers restent privés par conception.</p><span>' + number(metrics.trashed_document_count) + ' document(s) et ' + number(metrics.trashed_journey_count) + ' dossier(s) en corbeille — uniquement en total.</span></section>');
  document.querySelector('#new-entry').addEventListener('click', () => editor());
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => {
    view = button.dataset.go;
    render();
  }));
  bindEditors(app);
}

function catalogView() {
  const themes = [...new Set(catalog.map((entry) => entry.theme).filter(Boolean))].sort();
  navigation('<header class="page-heading"><div><p class="eyebrow">CATALOGUE</p><h1>Sources et checklists</h1><p>Une fiche est publiée dans le parcours uniquement lorsqu’elle est contrôlée.</p></div><button class="button primary" id="new-entry">+ Nouvelle fiche</button></header><div class="catalog-stats"><span>' + number(catalog.length) + ' fiches</span><span>' + number(catalog.filter((entry) => entry.source_status === 'verified').length) + ' vérifiées</span><span>' + number(catalog.filter(sourceIsDue).length) + ' à contrôler</span></div><div class="filters"><label class="search-label">Rechercher<input id="search" type="search" placeholder="Pays, thème, démarche, source…"></label><label>Statut<select id="status-filter"><option value="">Tous les statuts</option><option value="verified">Vérifiées</option><option value="to_review">À contrôler</option><option value="retired">Retirées</option></select></label><label>Thème<select id="theme-filter"><option value="">Tous les thèmes</option>' + themes.map((theme) => '<option value="' + escapeHtml(theme) + '">' + escapeHtml(theme) + '</option>').join('') + '</select></label></div><div id="catalog-list" class="source-list"></div>');
  const draw = () => {
    const query = document.querySelector('#search').value.toLowerCase().trim();
    const status = document.querySelector('#status-filter').value;
    const theme = document.querySelector('#theme-filter').value;
    const results = catalog.filter((entry) => {
      const haystack = [entry.title, entry.authority_code, entry.source_label, entry.theme, entry.procedure_code].join(' ').toLowerCase();
      return (!query || haystack.includes(query)) && (!status || entry.source_status === status) && (!theme || entry.theme === theme);
    });
    const list = document.querySelector('#catalog-list');
    list.innerHTML = results.length ? results.map((entry) => sourceRow(entry)).join('') : '<div class="empty"><strong>Aucune fiche trouvée.</strong><p>Changez les filtres ou ajoutez une source.</p></div>';
    bindEditors(list);
  };
  ['#search', '#status-filter', '#theme-filter'].forEach((selector) => document.querySelector(selector).addEventListener(selector === '#search' ? 'input' : 'change', draw));
  document.querySelector('#new-entry').addEventListener('click', () => editor());
  draw();
}

function reviewView() {
  const queue = catalog.filter(sourceIsDue).sort((a, b) => String(a.review_due_at || '').localeCompare(String(b.review_due_at || '')));
  navigation('<header class="page-heading"><div><p class="eyebrow">QUALITÉ DES SOURCES</p><h1>À vérifier</h1><p>Une source est ici lorsqu’elle est signalée « à contrôler » ou que sa date de revue est dépassée.</p></div><button class="button secondary" id="show-catalog">Voir le catalogue</button></header><section class="review-intro"><strong>' + number(queue.length) + ' source' + (queue.length > 1 ? 's' : '') + ' nécessitent une action.</strong><p>Après vérification sur le site officiel, actualisez la date de contrôle et la prochaine revue avant de passer la fiche à « Vérifié ».</p><p class="muted">' + number(metrics.sources_without_review_date) + ' source(s) vérifiée(s) n’ont pas encore de prochaine date de revue : c’est une planification à compléter, pas une alerte sur leur fiabilité.</p></section><div class="source-list">' + (queue.length ? queue.map((entry) => sourceRow(entry)).join('') : '<div class="empty"><strong>Tout est à jour.</strong><p>Le catalogue ne comporte aucune source à revoir.</p></div>') + '</div>');
  document.querySelector('#show-catalog').addEventListener('click', () => { view = 'catalog'; render(); });
  bindEditors(app);
}


function supportUserRow(account) {
  const confirmed = account.email_confirmed_at ? 'Adresse vérifiée' : 'Adresse non vérifiée';
  const documentLabel = number(account.document_count) + ' document' + (Number(account.document_count) > 1 ? 's' : '');
  const journeyLabel = number(account.journey_count) + ' démarche' + (Number(account.journey_count) > 1 ? 's' : '');
  const activeLabel = number(account.active_journey_count) + ' en cours';
  return '<article class="support-user-row"><div><strong>' + escapeHtml(account.email) + '</strong><p>' + confirmed + ' · ' + documentLabel + ' · ' + journeyLabel + ' au total, dont ' + activeLabel + '</p><small>Dernière connexion : ' + longDate(account.last_sign_in_at) + '</small></div><button class="button secondary" data-support-user="' + account.user_id + '">Ouvrir le dossier</button></article>';
}

function supportView() {
  navigation('<header class="page-heading"><div><p class="eyebrow">SUPPORT BÊTA</p><h1>Assister un bêta-testeur</h1><p>Accès étendu et strictement en lecture seule pendant la bêta. Toute consultation de compte ou de document est journalisée.</p></div></header><section class="support-notice"><strong>Accès sensible.</strong><p>Utilisez cet espace seulement pour résoudre une demande utilisateur. Ne téléchargez aucun fichier sans nécessité. Cet accès sera remplacé par un partage temporaire et consenti avant le lancement public.</p></section><section class="support-search"><label>Rechercher par adresse e-mail<input id="support-search-input" type="search" placeholder="ex. prenom@exemple.fr"></label><button class="button primary" id="support-search-button">Rechercher</button></section><section id="support-results" class="support-results"></section><section id="support-detail"></section>');
  const input = document.querySelector('#support-search-input');
  const results = document.querySelector('#support-results');
  const detail = document.querySelector('#support-detail');

  const drawUsers = () => {
    results.innerHTML = supportUsers.length
      ? '<p class="support-count">' + number(supportUsers.length) + ' compte(s) trouvé(s)</p><div class="support-user-list">' + supportUsers.map(supportUserRow).join('') + '</div>'
      : '<div class="empty"><strong>Aucun compte trouvé.</strong><p>Essayez une adresse e-mail complète ou partielle.</p></div>';
    results.querySelectorAll('[data-support-user]').forEach((button) => button.addEventListener('click', () => openSupportUser(button.dataset.supportUser)));
  };

  const search = async () => {
    const button = document.querySelector('#support-search-button');
    button.disabled = true;
    results.innerHTML = '<div class="empty"><strong>Recherche en cours…</strong></div>';
    const { data, error } = await client.rpc('jamlio_beta_support_users', { search_term: input.value.trim() || null });
    button.disabled = false;
    if (error) {
      results.innerHTML = '<div class="empty"><strong>Impossible de rechercher les comptes.</strong><p>' + escapeHtml(error.message) + '</p></div>';
      return;
    }
    supportUsers = data || [];
    drawUsers();
  };

  const openSupportUser = async (userId) => {
    detail.innerHTML = '<div class="empty"><strong>Ouverture du dossier…</strong></div>';
    const { data, error } = await client.rpc('jamlio_beta_support_detail', { target_user_id: userId });
    if (error) {
      detail.innerHTML = '<div class="empty"><strong>Impossible d’ouvrir ce dossier.</strong><p>' + escapeHtml(error.message) + '</p></div>';
      return;
    }
    selectedSupportUser = data;
    const { data: auditData } = await client.rpc('jamlio_beta_support_audit', { target_user_id: userId });
    renderSupportDetail(data, auditData || []);
  };

  const renderSupportDetail = (data, auditRows) => {
    const account = data.account || {};
    const documents = Array.isArray(data.documents) ? data.documents : [];
    const journeys = Array.isArray(data.journeys) ? data.journeys : [];
    detail.innerHTML = '<section class="support-detail"><div class="section-heading"><div><p class="eyebrow">COMPTE SÉLECTIONNÉ</p><h2>' + escapeHtml(account.email || '') + '</h2></div><span class="tag ' + (account.email_confirmed_at ? 'verified' : 'to_review') + '">' + (account.email_confirmed_at ? 'E-mail vérifié' : 'E-mail non vérifié') + '</span></div><div class="support-account-meta"><span>Créé le <strong>' + longDate(account.created_at) + '</strong></span><span>Dernière connexion <strong>' + longDate(account.last_sign_in_at) + '</strong></span></div><div class="support-columns"><section><h3>Documents (' + number(documents.length) + ')</h3>' + (documents.length ? '<div class="support-docs">' + documents.map((doc) => '<article class="support-document"><div><strong>' + escapeHtml(doc.display_name) + '</strong><p>' + escapeHtml(doc.document_type) + (doc.expires_at ? ' · expire le ' + shortDate(doc.expires_at) : '') + (doc.deleted_at ? ' · dans la corbeille' : '') + '</p><small>' + escapeHtml(doc.content_type || 'Type inconnu') + ' · ' + number(doc.byte_size) + ' octets</small></div><div class="row-actions"><button class="text-button" data-doc-open="' + doc.id + '">Ouvrir</button><button class="text-button" data-doc-download="' + doc.id + '">Télécharger</button></div></article>').join('') + '</div>' : '<p class="muted">Aucun document.</p>') + '</section><section><h3>Démarches (' + number(journeys.length) + ')</h3>' + (journeys.length ? '<div class="support-journeys">' + journeys.map((journey) => '<article class="support-journey"><strong>' + escapeHtml(journey.code) + '</strong><p>' + escapeHtml(journey.status) + (journey.deleted_at ? ' · dans la corbeille' : '') + '</p>' + (journey.profile ? '<small>' + escapeHtml(journey.profile.permit_category || '') + (journey.profile.department ? ' · département ' + escapeHtml(journey.profile.department) : '') + '</small>' : '') + '</article>').join('') + '</div>' : '<p class="muted">Aucune démarche.</p>') + '</section></div><section class="support-audit"><h3>Journal d’accès support</h3>' + (auditRows.length ? auditRows.map((row) => '<div><strong>' + escapeHtml(({account_view:'Consultation du compte',document_open:'Ouverture du document',document_download:'Téléchargement du document'}[row.action] || row.action)) + '</strong><span>' + escapeHtml(row.document_name || '') + '</span><small>' + longDate(row.event_at) + '</small></div>').join('') : '<p class="muted">Aucun accès enregistré.</p>') + '</section></section>';

    detail.querySelectorAll('[data-doc-open],[data-doc-download]').forEach((button) => button.addEventListener('click', async () => {
      const isDownload = Boolean(button.dataset.docDownload);
      const documentId = button.dataset.docOpen || button.dataset.docDownload;
      const doc = documents.find((item) => item.id === documentId);
      if (!doc) return;
      button.disabled = true;
      const action = isDownload ? 'document_download' : 'document_open';
      const { error: logError } = await client.rpc('jamlio_beta_support_record_access', {
        target_user_id: account.id,
        access_action: action,
        target_document_id: documentId,
        access_reason: 'Assistance bêta'
      });
      if (logError) {
        button.disabled = false;
        alert('Impossible d’enregistrer cet accès : ' + logError.message);
        return;
      }
      const { data: urlData, error: urlError } = await client.storage.from('jamm-documents').createSignedUrl(doc.storage_path, 300, { download: isDownload });
      button.disabled = false;
      if (urlError || !urlData?.signedUrl) {
        alert('Impossible d’ouvrir ce document.');
        return;
      }
      window.open(urlData.signedUrl, '_blank', 'noopener');
      openSupportUser(account.id);
    }));
  };

  document.querySelector('#support-search-button').addEventListener('click', search);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
  search();
}

function auditView() {
  navigation('<header class="page-heading"><div><p class="eyebrow">TRAÇABILITÉ</p><h1>Journal des changements</h1><p>Chaque action sur le catalogue est enregistrée. Aucun document privé n’est inclus dans ce journal.</p></div></header><section class="audit-list">' + (audit.length ? audit.map((event) => '<article class="audit-card"><div><strong>' + ({ created: 'Création', updated: 'Mise à jour', deleted: 'Suppression' }[event.action] || event.action) + '</strong><p>' + escapeHtml(event.entry_title || 'Fiche retirée') + '</p></div><time>' + longDate(event.occurred_at) + '</time></article>').join('') : '<div class="empty"><strong>Aucun changement enregistré.</strong></div>') + '</section>');
}

function render() {
  try {
    if (view === 'overview') overview();
    else if (view === 'catalog') catalogView();
    else if (view === 'review') reviewView();
    else if (view === 'support') supportView();
    else auditView();
  } catch (error) {
    app.innerHTML = '<section class="login-panel"><p class="eyebrow">ERREUR</p><h1>Impossible d’afficher la console.</h1><p>' + escapeHtml(error.message) + '</p><button class="button primary" onclick="location.reload()">Réessayer</button></section>';
  }
}

function editor(entry) {
  const e = entry || {
    authority_code: '', theme: 'passport_renewal', procedure_code: '', title: '', source_url: '', source_label: '', source_status: 'to_review', notes: '', requirements: [], requirements_source_url: '', coverage_scope: 'national', delivery_channel: '', source_checked_at: new Date().toISOString(), review_due_at: ''
  };
  const requirements = (e.requirements || []).map((requirement) => typeof requirement === 'string' ? requirement : requirement.label).filter(Boolean).join('\n');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = '<section class="editor-card" role="dialog" aria-modal="true" aria-labelledby="editor-title"><button class="icon-button" type="button" id="close-editor" aria-label="Fermer">×</button><p class="eyebrow">' + (entry ? 'MODIFIER LA FICHE' : 'NOUVELLE FICHE') + '</p><h2 id="editor-title">' + (entry ? escapeHtml(e.title) : 'Ajouter une source') + '</h2><p class="editor-lead">Conservez seulement une source officielle et une checklist réellement vérifiée.</p><form id="editor-form"><div class="form-grid"><label>Autorité ou pays<input name="authority_code" required value="' + escapeHtml(e.authority_code) + '"></label><label>Thème<input name="theme" required value="' + escapeHtml(e.theme) + '"></label><label>Code interne<input name="procedure_code" required value="' + escapeHtml(e.procedure_code) + '"></label><label>Statut<select name="source_status"><option value="verified">Vérifié</option><option value="to_review">À contrôler</option><option value="retired">Retiré</option></select></label><label>Portée<select name="coverage_scope"><option value="national">Nationale</option><option value="local">Locale</option></select></label><label>Canal de dépôt<input name="delivery_channel" value="' + escapeHtml(e.delivery_channel || '') + '" placeholder="Ex. Consulat, ANEF"></label><label class="wide">Titre de la démarche<input name="title" required value="' + escapeHtml(e.title) + '"></label><label class="wide">URL officielle<input name="source_url" type="url" required value="' + escapeHtml(e.source_url) + '"></label><label>Nom de la source<input name="source_label" required value="' + escapeHtml(e.source_label) + '"></label><label>URL de la liste des pièces<input name="requirements_source_url" type="url" value="' + escapeHtml(e.requirements_source_url || '') + '"></label><label>Date du dernier contrôle<input name="source_checked_at" type="date" required value="' + inputDate(e.source_checked_at) + '"></label><label>Prochaine revue<input name="review_due_at" type="date" value="' + inputDate(e.review_due_at) + '"></label><label class="wide">Note visible pour l’utilisateur<textarea name="notes" rows="3">' + escapeHtml(e.notes || '') + '</textarea></label><label class="wide">Checklist — une pièce par ligne<textarea name="requirements" rows="9" required>' + escapeHtml(requirements) + '</textarea></label></div><div class="review-rule"><strong>Avant de publier</strong><span>Vérifiez l’URL officielle, les pièces et la date de contrôle. Une fiche retirée n’est plus proposée aux utilisateurs.</span></div><p class="form-error hidden" id="editor-error"></p><div class="form-actions"><button type="button" class="button secondary" id="cancel-editor">Annuler</button><button type="submit" class="button primary">Enregistrer <span>→</span></button></div></form></section>';
  document.body.appendChild(modal);
  const form = modal.querySelector('#editor-form');
  form.source_status.value = e.source_status || 'to_review';
  form.coverage_scope.value = e.coverage_scope || 'national';
  const close = () => modal.remove();
  modal.querySelector('#close-editor').addEventListener('click', close);
  modal.querySelector('#cancel-editor').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    const formData = new FormData(form);
    const payload = {
      authority_code: formData.get('authority_code').trim(),
      theme: formData.get('theme').trim(),
      procedure_code: formData.get('procedure_code').trim(),
      title: formData.get('title').trim(),
      source_url: formData.get('source_url').trim(),
      source_label: formData.get('source_label').trim(),
      source_status: formData.get('source_status'),
      coverage_scope: formData.get('coverage_scope'),
      delivery_channel: formData.get('delivery_channel').trim() || null,
      notes: formData.get('notes').trim() || null,
      requirements: formData.get('requirements').split('\n').map((line) => line.trim()).filter(Boolean).map((label) => ({ label, document_type: 'other' })),
      requirements_source_url: formData.get('requirements_source_url').trim() || null,
      source_checked_at: isoDate(formData.get('source_checked_at')),
      review_due_at: isoDate(formData.get('review_due_at')),
      updated_at: new Date().toISOString()
    };
    const response = entry
      ? await client.from('official_catalog_entries').update(payload).eq('id', entry.id)
      : await client.from('official_catalog_entries').insert(payload);
    if (response.error) {
      const error = modal.querySelector('#editor-error');
      error.textContent = response.error.message;
      error.classList.remove('hidden');
      button.disabled = false;
      return;
    }
    close();
    await refresh();
  });
}

async function refresh() {
  try {
    await loadData();
    render();
  } catch (error) {
    app.innerHTML = '<section class="login-panel"><p class="eyebrow">ERREUR</p><h1>Impossible de charger la console.</h1><p>' + escapeHtml(error.message) + '</p><button class="button primary" onclick="location.reload()">Réessayer</button></section>';
  }
}

async function boot() {
  const { data: { session } } = await client.auth.getSession();
  user = session?.user || null;
  document.querySelector('#sign-out').addEventListener('click', async () => {
    await client.auth.signOut();
    location.reload();
  });
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.reload();
  });
  if (!user) {
    login();
    return;
  }
  const { data, error } = await client.from('jamm_admins').select('role').eq('user_id', user.id).maybeSingle();
  if (error || !data) {
    denied();
    return;
  }
  role = data.role;
  document.querySelector('#sign-out').classList.remove('hidden');
  await refresh();
}

boot();