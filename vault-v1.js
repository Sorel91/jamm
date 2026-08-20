/* Jamm coffre V1.2 — retrieval, safe replacement and accessible actions. */
(() => {
  let vaultSearch = '';
  let vaultSort = 'recent';
  let vaultListView = false;
  let pendingToast = '';
  let toastTimer;

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

  function showVaultToast(message) {
    let toast = document.querySelector('#jamm-vault-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'jamm-vault-toast';
      toast.className = 'jamm-vault-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  function enhanceModalAccessibility() {
    const originalModal = modal;
    modal = function(content) {
      const trigger = document.activeElement;
      const node = originalModal(content);
      const card = node.querySelector('.jamm-modal-card');
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.tabIndex = -1;
      const close = node.querySelector('.close');
      const keyHandler = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          node.remove();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusables = Array.from(node.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      document.addEventListener('keydown', keyHandler, true);
      const observer = new MutationObserver(() => {
        if (document.body.contains(node)) return;
        document.removeEventListener('keydown', keyHandler, true);
        observer.disconnect();
        if (trigger && typeof trigger.focus === 'function') trigger.focus();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => (close || card).focus(), 0);
      return node;
    };
  }

  function installToolbar() {
    let toolbar = document.querySelector('#jamm-vault-toolbar');
    if (toolbar) return toolbar;
    toolbar = document.createElement('section');
    toolbar.id = 'jamm-vault-toolbar';
    toolbar.className = 'jamm-vault-toolbar';
    toolbar.innerHTML =
      '<label class="jamm-search"><span class="visually-hidden">Rechercher dans mon coffre</span><input type="search" placeholder="Rechercher un document" autocomplete="off"></label>' +
      '<label class="jamm-sort"><span>Trier</span><select aria-label="Trier les documents"><option value="recent">Ajout récent</option><option value="expiry">Expiration proche</option><option value="name">Nom A–Z</option></select></label>' +
      '<div class="jamm-view-switch" aria-label="Affichage des documents"><button type="button" data-view="grid" aria-pressed="true">Cartes</button><button type="button" data-view="list" aria-pressed="false">Liste</button></div>';
    $('#vault-context').insertAdjacentElement('afterend', toolbar);
    const input = toolbar.querySelector('input');
    input.addEventListener('input', () => { vaultSearch = input.value.trim().toLocaleLowerCase('fr-FR'); applyVaultTools(); });
    const sort = toolbar.querySelector('select');
    sort.addEventListener('change', () => { vaultSort = sort.value; applyVaultTools(); });
    toolbar.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
      vaultListView = button.dataset.view === 'list';
      toolbar.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      applyVaultTools();
    }));
    return toolbar;
  }

  function addAttentionAction() {
    const old = document.querySelector('#jamm-attention-action');
    if (old) old.remove();
    const attention = documents.filter((doc) => !doc.archived_at && ['expired', 'expiring'].includes(lifecycleFor(doc).key));
    if (vaultFilter !== 'all' || !attention.length) return;
    const panel = document.createElement('section');
    panel.id = 'jamm-attention-action';
    panel.className = 'jamm-attention-action';
    panel.innerHTML = '<div><p class="eyebrow">À SURVEILLER</p><strong>' + attention.length + ' document' + (attention.length > 1 ? 's demandent votre attention' : ' demande votre attention') + '</strong><span>Une date est expirée ou approche.</span></div><button type="button">Voir les documents</button>';
    panel.querySelector('button').addEventListener('click', () => { vaultFilter = 'attention'; renderDocuments(); });
    $('#vault-context').insertAdjacentElement('afterend', panel);
  }

  function documentSearchText(doc) {
    return [doc.display_name, documentLabels[doc.document_type], doc.holder_name, doc.issuer_country].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR');
  }

  function applyVaultTools() {
    const container = $('#documents');
    if (!container) return;
    container.classList.toggle('is-list', vaultListView);
    const cards = Array.from(container.querySelectorAll('.document-card'));
    if (!cards.length) return;
    const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
    const itemId = (card) => card.querySelector('[data-id]')?.dataset.id;
    const sorters = {
      recent: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      name: (a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'fr'),
      expiry: (a, b) => {
        const aDate = a.expires_at ? new Date(a.expires_at) : new Date('9999-12-31');
        const bDate = b.expires_at ? new Date(b.expires_at) : new Date('9999-12-31');
        return aDate - bDate;
      }
    };
    const visible = cards.map((card) => ({ card, doc: documentsById.get(itemId(card)) })).filter((item) => item.doc && documentSearchText(item.doc).includes(vaultSearch));
    cards.forEach((card) => { card.hidden = true; });
    visible.sort((a, b) => sorters[vaultSort](a.doc, b.doc)).forEach(({ card }) => {
      card.hidden = false;
      container.appendChild(card);
    });
    let empty = container.querySelector('.jamm-search-empty');
    if (!visible.length && vaultSearch) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'jamm-search-empty';
        container.appendChild(empty);
      }
      empty.textContent = 'Aucun document ne correspond à « ' + vaultSearch + ' ».';
    } else if (empty) empty.remove();
  }

  function addReplacementAction() {
    $('#documents')?.querySelectorAll('.vault-more-menu').forEach((menu) => {
      if (menu.querySelector('.replace-vault-document')) return;
      const existing = menu.querySelector('.edit-vault-document');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'replace-vault-document';
      button.textContent = 'Remplacer le fichier';
      button.dataset.id = existing?.dataset.id || '';
      button.addEventListener('click', () => showDocumentReplacement(button.dataset.id));
      menu.insertBefore(button, existing || null);
    });
    // Archiving is recoverable. Remove the irreversible deletion affordance from the vault.
    $('#documents')?.querySelectorAll('.delete-document').forEach((button) => button.remove());
  }

  function showDocumentReplacement(id) {
    const old = documents.find((doc) => doc.id === id);
    if (!old) return;
    const node = modal(
      '<button class="close" aria-label="Fermer">×</button><p class="eyebrow">METTRE À JOUR UN DOCUMENT</p>' +
      '<h2 style="font:600 31px Georgia,serif;margin:8px 0 10px">Remplacer le fichier</h2>' +
      '<p style="color:#647069;line-height:1.45">Le nouveau fichier sera ajouté au coffre. L’ancienne version sera archivée et ne sera plus proposée dans vos démarches.</p>' +
      '<form id="replace-document-form"><label>Nouveau fichier<input id="replace-document-file" type="file" required accept=".pdf,image/jpeg,image/png"></label>' +
      '<label>Date d’expiration (facultatif)<input id="replace-document-expiry" type="date" value="' + esc(old.expires_at || '') + '"></label>' +
      '<p data-error hidden style="color:#aa3425;font-size:13px"></p><button class="primary" type="submit">Ajouter la nouvelle version <span>→</span></button></form>'
    );
    styleModal(node);
    node.querySelector('.close').addEventListener('click', () => node.remove());
    node.querySelector('#replace-document-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = node.querySelector('#replace-document-file').files[0];
      const submit = node.querySelector('[type="submit"]');
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { showError(node, 'Ce fichier dépasse la limite de 10 Mo.'); return; }
      submit.disabled = true;
      const newId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = currentUser.id + '/' + newId + '/' + safeName;
      try {
        const { error: uploadError } = await supabaseClient.storage.from('jamm-documents').upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabaseClient.from('documents').insert({
          id: newId, vault_id: currentVault.id, owner_id: currentUser.id, document_type: old.document_type,
          display_name: file.name, storage_path: storagePath, content_type: file.type, byte_size: file.size,
          holder_name: old.holder_name, issuer_country: old.issuer_country,
          expires_at: node.querySelector('#replace-document-expiry').value || null
        });
        if (insertError) throw insertError;
        const { error: archiveError } = await supabaseClient.from('documents').update({ archived_at: new Date().toISOString() }).eq('id', old.id).eq('owner_id', currentUser.id);
        if (archiveError) {
          await supabaseClient.from('documents').delete().eq('id', newId).eq('owner_id', currentUser.id);
          await supabaseClient.storage.from('jamm-documents').remove([storagePath]);
          throw archiveError;
        }
        node.remove();
        pendingToast = file.name + ' a remplacé l’ancienne version. Celle-ci est disponible dans vos archives.';
        await loadData();
      } catch (error) {
        showError(node, 'Impossible de remplacer ce fichier. Réessayez dans un instant.');
        submit.disabled = false;
      }
    });
  }

  function enhanceVault() {
    installToolbar();
    addAttentionAction();
    addReplacementAction();
    applyVaultTools();
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceModalAccessibility();

    const originalRenderDocuments = renderDocuments;
    renderDocuments = function() {
      originalRenderDocuments();
      enhanceVault();
    };

    const originalLoadData = loadData;
    loadData = async function() {
      await originalLoadData();
      if (pendingToast) {
        showVaultToast(pendingToast);
        pendingToast = '';
      }
    };

    document.addEventListener('submit', (event) => {
      if (event.target?.id !== 'upload-form') return;
      const file = event.target.querySelector('#upload-file')?.files?.[0];
      pendingToast = file ? file.name + ' est maintenant disponible dans votre coffre.' : '';
    }, true);
  });
})();