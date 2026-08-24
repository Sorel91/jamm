const SUPABASE_URL = 'https://bnkpvyswxdflktpbvxbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xkbi-9JZAp5rGD1rwCf0mQ_1MliAIwY';
const supportClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (selector) => document.querySelector(selector);
const feedbackPanel = $('#beta-feedback');
const signedOutPanel = $('#support-signed-out');
const feedbackForm = $('#beta-feedback-form');
const feedbackStatus = $('#feedback-status');

function showStatus(message, tone = 'success') {
  feedbackStatus.textContent = message;
  feedbackStatus.className = 'support-form-status ' + tone;
  feedbackStatus.hidden = false;
}

async function loadMyTickets() {
  const list = $('#my-feedback-list');
  const { data, error } = await supportClient
    .from('support_tickets')
    .select('category,subject,status,created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error || !data?.length) {
    list.hidden = true;
    return;
  }
  const labels = { connexion: 'Connexion', coffre: 'Coffre', demarche: 'Démarche', suggestion: 'Suggestion', autre: 'Autre', donnees: 'Données personnelles', securite: 'Sécurité' };
  const statuses = { new: 'Nouveau', in_progress: 'En cours', resolved: 'Résolu' };
  list.innerHTML = '<h3>Mes derniers retours</h3><ul>' + data.map((ticket) =>
    '<li><span><strong>' + escapeHtml(ticket.subject) + '</strong><small>' + escapeHtml(labels[ticket.category] || ticket.category) + ' · ' + new Date(ticket.created_at).toLocaleDateString('fr-FR') + '</small></span><em class="ticket-status ' + escapeHtml(ticket.status) + '">' + escapeHtml(statuses[ticket.status] || ticket.status) + '</em></li>'
  ).join('') + '</ul>';
  list.hidden = false;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

async function bootSupport() {
  const { data: { session } } = await supportClient.auth.getSession();
  const currentUser = session?.user;
  if (!currentUser) {
    signedOutPanel.hidden = false;
    return;
  }

  $('#support-email').value = currentUser.email || '';
  feedbackPanel.hidden = false;
  loadMyTickets();

  feedbackForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = feedbackForm.querySelector('button[type="submit"]');
    const category = $('#support-category').value;
    const subject = $('#support-subject').value.trim();
    const message = $('#support-message').value.trim();
    const steps = $('#support-steps').value.trim();

    if (!category || subject.length < 3 || message.length < 10) {
      showStatus('Indiquez une catégorie, un sujet et une description un peu plus détaillée.', 'error');
      return;
    }

    submit.disabled = true;
    feedbackStatus.hidden = true;
    const { error } = await supportClient.from('support_tickets').insert({
      owner_id: currentUser.id,
      requester_email: currentUser.email,
      category,
      subject,
      message,
      reproduction_steps: steps || null,
      page_url: window.location.href,
      browser_info: navigator.userAgent.slice(0, 700)
    });
    submit.disabled = false;

    if (error) {
      showStatus('Votre retour n’a pas pu être envoyé. Réessayez dans un instant.', 'error');
      return;
    }

    feedbackForm.reset();
    $('#support-email').value = currentUser.email || '';
    showStatus('Merci — votre retour a bien été envoyé. Nous vous répondrons à l’adresse de votre compte si nécessaire.');
    loadMyTickets();
  });
}

bootSupport();