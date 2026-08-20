/* Jamm V1 — parcours titre de séjour communs.
   The core app remains responsible for vault matching and checklist rendering. */
(() => {
  const RESIDENCE_SOURCE = 'https://www.service-public.gouv.fr/particuliers/vosdroits/N110';

  const commonRoutes = [
    {
      id: 'student',
      label: 'Renouvellement — étudiant',
      description: 'Vous poursuivez vos études en France.',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Certificat de scolarité ou attestation d’inscription', document_type: 'other' },
        { label: 'Justificatifs de ressources', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' }
      ]
    },
    {
      id: 'employee',
      label: 'Renouvellement — salarié ou travailleur temporaire',
      description: 'Vous travaillez en France avec un contrat salarié.',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Contrat de travail ou attestation employeur', document_type: 'other' },
        { label: 'Derniers bulletins de salaire', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' }
      ]
    },
    {
      id: 'family',
      label: 'Renouvellement — vie privée et familiale',
      description: 'Votre droit au séjour est lié à votre famille ou à votre vie privée en France.',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Justificatif de votre situation familiale ou personnelle', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Éléments prouvant la continuité de votre vie en France', document_type: 'other' }
      ]
    },
    {
      id: 'visitor',
      label: 'Renouvellement — visiteur',
      description: 'Vous séjournez en France sans exercer d’activité professionnelle.',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Justificatifs de ressources suffisantes', document_type: 'other' },
        { label: 'Attestation d’assurance maladie', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' }
      ]
    }
  ];

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

  function routePicker(route) {
    return '<label class="journey-route-option" style="display:block;border:1px solid #cdd6cd;border-radius:12px;padding:13px 14px;margin:8px 0;cursor:pointer">' +
      '<input type="radio" name="residence-route" value="' + route.id + '" style="width:auto;margin:0 9px 0 0;vertical-align:middle">' +
      '<strong style="font-size:15px">' + esc(route.label) + '</strong><span style="display:block;margin:6px 0 0 25px;color:#647069;font-size:13px;line-height:1.4">' + esc(route.description) + '</span></label>';
  }

  async function saveResidenceV1(node, route, customItems) {
    const submit = node.querySelector('[type="submit"]');
    const error = node.querySelector('[data-error]');
    submit.disabled = true;
    error.hidden = true;
    const department = node.querySelector('#residence-v1-department').value.trim();
    const expiry = node.querySelector('#residence-v1-expiry').value || null;
    const note = node.querySelector('#residence-v1-note').value.trim();
    const customSource = node.querySelector('#residence-v1-source')?.value.trim() || '';
    const title = route ? route.label : node.querySelector('#residence-v1-title').value.trim();
    const requirements = route ? route.requirements : customItems.map((label) => ({ label, document_type: null }));
    if (!title) {
      error.textContent = 'Donnez un nom à cette démarche.';
      error.hidden = false; submit.disabled = false; return;
    }
    if (!requirements.length) {
      error.textContent = 'Ajoutez au moins une pièce à préparer.';
      error.hidden = false; submit.disabled = false; return;
    }
    try {
      const { data: journey, error: journeyError } = await supabaseClient
        .from('journeys')
        .insert({ owner_id: currentUser.id, vault_id: currentVault.id, code: 'residence_renewal' })
        .select().single();
      if (journeyError) throw journeyError;
      const officialSource = route ? RESIDENCE_SOURCE : customSource;
      const { error: profileError } = await supabaseClient.from('journey_profiles').upsert({
        journey_id: journey.id,
        owner_id: currentUser.id,
        department,
        permit_category: title,
        expiry_date: expiry,
        situation_answers: {
          route: 'residence_renewal',
          common_route: route ? route.id : null,
          is_custom_residence: !route,
          custom_title: title,
          note,
          required_documents: requirements,
          requirement_links: {}
        },
        source_status: route ? 'verified' : 'to_verify',
        official_source_url: officialSource || null,
        source_checked_at: route ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'journey_id' });
      if (profileError) throw profileError;
      node.remove();
      currentJourney = journey;
      await loadData();
      showView('journeys');
      $('#success').hidden = false;
      $('#success').textContent = route
        ? 'Votre checklist de préparation est prête. Avant le dépôt, consultez toujours la source officielle liée à votre dossier.'
        : 'Votre liste personnelle est prête. Ajoutez la source officielle lorsque vous la connaissez.';
      $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (saveError) {
      error.textContent = 'Impossible d’enregistrer cette démarche. Réessayez dans un instant.';
      error.hidden = false;
      submit.disabled = false;
    }
  }

  function showResidenceV1() {
    const defaultDepartment = String(currentUser?.user_metadata?.default_department || '');
    const node = modal(
      '<button class="close" aria-label="Fermer">×</button>' +
      '<p class="eyebrow">RENOUVELER SON TITRE DE SÉJOUR</p>' +
      '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Choisissez un parcours courant.</h2>' +
      '<p style="color:#647069;line-height:1.45">Ces repères sont communs. Votre préfecture et votre situation personnelle restent la référence pour le dépôt.</p>' +
      '<form id="residence-v1-form">' +
      '<label>Département où vous habitez <input id="residence-v1-department" inputmode="numeric" maxlength="3" value="' + esc(defaultDepartment) + '" placeholder="Ex. 91"></label>' +
      '<fieldset style="border:0;padding:0;margin:18px 0"><legend style="font-weight:700;font-size:14px">Votre situation</legend>' +
      commonRoutes.map(routePicker).join('') +
      '<label class="journey-route-option" style="display:block;border:1px dashed #8eaa9b;border-radius:12px;padding:13px 14px;margin:8px 0;cursor:pointer"><input type="radio" name="residence-route" value="custom" style="width:auto;margin:0 9px 0 0;vertical-align:middle"><strong style="font-size:15px">Mon parcours est spécifique</strong><span style="display:block;margin:6px 0 0 25px;color:#647069;font-size:13px;line-height:1.4">Je saisis moi-même les pièces demandées.</span></label></fieldset>' +
      '<div id="residence-v1-custom" hidden>' +
      '<label>Nom de votre démarche <input id="residence-v1-title" maxlength="120" placeholder="Ex. Admission exceptionnelle au séjour"></label>' +
      '<label>Lien vers la source officielle (facultatif) <input id="residence-v1-source" type="url" placeholder="https://…"></label>' +
      '<div id="residence-v1-items" style="display:grid;gap:8px;margin:12px 0"></div>' +
      '<button type="button" id="residence-v1-add-item" class="link-button" style="padding:0">+ Ajouter une pièce</button></div>' +
      '<label>Date d’expiration du titre (si connue) <input id="residence-v1-expiry" type="date"></label>' +
      '<label>Élément important pour votre cas (facultatif) <input id="residence-v1-note" maxlength="240" placeholder="Ex. changement d’employeur, enfant concerné…"></label>' +
      '<p data-error hidden style="color:#aa3425;font-size:13px"></p>' +
      '<button class="primary" type="submit">Créer ma checklist <span>→</span></button></form>'
    );
    styleModal(node);
    const close = node.querySelector('.close');
    close.addEventListener('click', () => node.remove());
    const custom = node.querySelector('#residence-v1-custom');
    const items = node.querySelector('#residence-v1-items');
    const addItem = () => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center';
      row.innerHTML = '<input class="residence-v1-item" maxlength="160" placeholder="Ex. Justificatif de domicile"><button type="button" aria-label="Supprimer cette pièce" style="border:0;background:none;color:#8a4d39;font-size:20px;cursor:pointer">×</button>';
      row.querySelector('button').addEventListener('click', () => row.remove());
      items.appendChild(row);
    };
    addItem();
    node.querySelector('#residence-v1-add-item').addEventListener('click', addItem);
    node.querySelectorAll('input[name="residence-route"]').forEach((input) => input.addEventListener('change', () => {
      custom.hidden = input.value !== 'custom' || !input.checked;
    }));
    node.querySelector('#residence-v1-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const selectedRoute = node.querySelector('input[name="residence-route"]:checked');
      if (!selectedRoute) {
        const error = node.querySelector('[data-error]');
        error.textContent = 'Choisissez votre situation pour continuer.'; error.hidden = false; return;
      }
      const route = commonRoutes.find((item) => item.id === selectedRoute.value);
      const customItems = Array.from(node.querySelectorAll('.residence-v1-item')).map((input) => input.value.trim()).filter(Boolean);
      saveResidenceV1(node, route, customItems);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const original = showQualification;
    showQualification = function(code, existingJourney) {
      if (code === 'residence_renewal' && !existingJourney) return showResidenceV1();
      return original(code, existingJourney);
    };
    const originalRenderChecklist = renderChecklist;
    renderChecklist = function() {
      originalRenderChecklist();
      const profile = currentJourney && journeyProfiles[currentJourney.id];
      if (currentJourney?.code !== 'residence_renewal' || !profile?.situation_answers?.common_route) return;
      const note = document.querySelector('#checklist .custom-list-note');
      if (!note || note.querySelector('.jamm-v1-source')) return;
      const source = document.createElement('span');
      source.className = 'jamm-v1-source';
      source.innerHTML = '<a href="' + RESIDENCE_SOURCE + '" target="_blank" rel="noopener">Consulter la source officielle ↗</a><small style="display:block;margin-top:5px">Cette checklist est un repère commun : confirmez les pièces et le canal de dépôt avec votre préfecture.</small>';
      note.appendChild(source);
    };
  });
})();