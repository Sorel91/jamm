/* Jamm V1.1 — UX refinements without changing the current journey creation flow. */
(() => {
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

  function checklistEnhancements() {
    const checklist = $('#checklist');
    const profile = currentJourney && journeyProfiles[currentJourney.id];
    if (!checklist || !profile || checklist.dataset.jammOrganised === 'true') return;
    const rows = Array.from(checklist.querySelectorAll(':scope > .check-row'));
    if (!rows.length) return;
    checklist.dataset.jammOrganised = 'true';
    const ready = rows.filter((row) => row.classList.contains('done')).length;
    const missing = rows.length - ready;
    const summary = document.createElement('div');
    summary.className = 'jamm-checklist-summary';
    summary.setAttribute('aria-label', 'Résumé de la checklist');
    summary.innerHTML = '<strong>' + ready + ' pièce' + (ready > 1 ? 's' : '') + ' prête' + (ready > 1 ? 's' : '') + ' · ' + missing + ' à compléter</strong>';
    const note = checklist.querySelector(':scope > .custom-list-note');
    if (note) note.insertAdjacentElement('afterend', summary);
    else checklist.prepend(summary);
  }

  function emptyVaultEnhancement() {
    const container = $('#documents');
    if (!container || documents.length || container.querySelector('.jamm-vault-start')) return;
    const start = document.createElement('section');
    start.className = 'jamm-vault-start';
    start.innerHTML = '<p class="eyebrow">COMMENCEZ PAR L’ESSENTIEL</p><h3>Ajoutez les documents qui vous feront gagner du temps.</h3><p>Vous pourrez toujours ajouter le reste plus tard.</p><div><button type="button" data-type="passport">Ajouter mon passeport</button><button type="button" data-type="residence_permit">Ajouter mon titre de séjour</button><button type="button" data-type="proof_of_address">Ajouter un justificatif de domicile</button></div>';
    container.appendChild(start);
    start.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => showUpload(button.dataset.type)));
  }

  function showDownloadReview(originalDownload) {
    const profile = currentJourney && journeyProfiles[currentJourney.id];
    if (!currentJourney || !profile) {
      originalDownload();
      return;
    }
    const sourceUrl = profile.official_source_url;
    const requirements = normalizedRequirements(profile.situation_answers?.required_documents || []);
    if (!requirements.length) {
      originalDownload();
      return;
    }
    const links = profile.situation_answers?.requirement_links || {};
    const documentFor = (requirement) => linkedDocumentForRequirement(requirement, links);
    const rows = requirements.map((requirement) => {
      const doc = documentFor(requirement);
      return '<li class="' + (doc ? 'ready' : 'missing') + '"><span>' + (doc ? '✓' : '!') + '</span><div><strong>' + esc(requirement.label) + '</strong><small>' + (doc ? esc(doc.display_name) : 'À ajouter ou à rattacher') + '</small></div></li>';
    }).join('');
    const readyCount = requirements.filter(documentFor).length;
    const node = modal(
      '<button class="close" aria-label="Fermer">×</button>' +
      '<p class="eyebrow">VÉRIFIER MON DOSSIER</p>' +
      '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">' + (currentJourney.status === 'completed' ? 'Votre dossier' : 'Votre dossier de préparation') + '</h2>' +
      '<p style="color:#647069;line-height:1.45">' + readyCount + ' pièce' + (readyCount > 1 ? 's' : '') + ' prête' + (readyCount > 1 ? 's' : '') + ' sur ' + requirements.length + '.</p>' +
      '<ul class="jamm-review-list">' + rows + '</ul>' +
      (sourceUrl ? '<p class="jamm-review-source"><a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener">Consulter la source officielle ↗</a><br><small>Le dépôt de la demande se fait sur le site officiel, pas sur Jamm.</small></p>' : '<p class="jamm-review-source"><small>Cette liste a été créée par vous. Vérifiez toujours les pièces avant le dépôt.</small></p>') +
      '<p data-error hidden style="color:#aa3425;font-size:13px"></p>' +
      '<button class="primary" type="button" id="jamm-confirm-download">' + (currentJourney.status === 'completed' ? 'Télécharger le dossier' : 'Télécharger le dossier de préparation') + ' <span>→</span></button>'
    );
    styleModal(node);
    node.querySelector('.close').addEventListener('click', () => node.remove());
    node.querySelector('#jamm-confirm-download').addEventListener('click', () => {
      node.remove();
      originalDownload();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const originalRenderChecklist = renderChecklist;
    renderChecklist = function() {
      originalRenderChecklist();
      checklistEnhancements();
    };

    const originalRenderDocuments = renderDocuments;
    renderDocuments = function() {
      originalRenderDocuments();
      emptyVaultEnhancement();
    };

    const originalDownload = downloadChecklist;
    $('#prepare').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      showDownloadReview(originalDownload);
    }, true);
  });
})();