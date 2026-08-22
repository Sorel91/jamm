/* Jamlio V1 — parcours titre de séjour communs.
   The core app remains responsible for vault matching and checklist rendering. */
(() => {
  const RESIDENCE_SOURCE = 'https://www.service-public.gouv.fr/particuliers/vosdroits/N110';

  const commonRoutes = [
    {
      id: 'student',
      label: 'Renouvellement — étudiant',
      description: 'Vous poursuivez vos études en France.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2231',
      sourceLabel: 'Service-Public — étudiant',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Certificat de scolarité ou attestation de préinscription', document_type: 'other' },
        { label: 'Relevés de notes de l’année écoulée', document_type: 'other' },
        { label: 'Dernier diplôme obtenu en France', document_type: 'other' },
        { label: 'Attestation de réussite, lorsqu’elle existe', document_type: 'other' },
        { label: 'Justificatif de ressources : attestation de bourse, 3 derniers bulletins de salaire, prise en charge avec justificatifs, ou attestation bancaire selon votre situation', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'employee_cdi',
      label: 'Renouvellement — salarié (CDI)',
      description: 'Vous travaillez en France avec un contrat à durée indéterminée.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F15898',
      sourceLabel: 'Service-Public — salarié',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Contrat de travail ou attestation employeur', document_type: 'other' },
        { label: 'Derniers bulletins de salaire', document_type: 'other' },
        { label: 'Autorisation de travail, si demandée par votre situation', document_type: 'other' }
      ]
    },
    {
      id: 'temporary_worker',
      label: 'Renouvellement — travailleur temporaire (CDD)',
      description: 'Vous travaillez en France avec un contrat à durée déterminée.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F15898',
      sourceLabel: 'Service-Public — salarié / travailleur temporaire',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Contrat de travail ou promesse d’embauche', document_type: 'other' },
        { label: 'Derniers bulletins de salaire', document_type: 'other' },
        { label: 'Autorisation de travail correspondant à votre emploi', document_type: 'other' }
      ]
    },
    {
      id: 'spouse_french',
      label: 'Renouvellement — époux ou épouse de Français',
      description: 'Votre droit au séjour est lié à votre mariage avec une personne française.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2209',
      sourceLabel: 'Service-Public — vie privée et familiale',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Acte de mariage ou transcription de l’acte de mariage', document_type: 'other' },
        { label: 'Justificatif de nationalité française du conjoint', document_type: 'other' },
        { label: 'Justificatifs de communauté de vie', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'parent_french_child',
      label: 'Renouvellement — parent d’enfant français',
      description: 'Votre droit au séjour est lié à votre enfant français résidant en France.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2209',
      sourceLabel: 'Service-Public — vie privée et familiale',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Acte de naissance de l’enfant français avec filiation', document_type: 'other' },
        { label: 'Justificatif de nationalité française de l’enfant', document_type: 'other' },
        { label: 'Preuves de contribution à l’entretien et à l’éducation de l’enfant', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'visitor',
      label: 'Renouvellement — visiteur',
      description: 'Vous séjournez en France sans exercer d’activité professionnelle.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F302',
      sourceLabel: 'Service-Public — visiteur',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Justificatifs de ressources suffisantes', document_type: 'other' },
        { label: 'Attestation d’assurance maladie', document_type: 'other' },
        { label: 'Déclaration de ne pas exercer d’activité professionnelle en France', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'resident_10_years',
      label: 'Renouvellement — carte de résident de 10 ans',
      description: 'Vous renouvelez une carte de résident déjà détenue.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2208',
      sourceLabel: 'Service-Public — carte de résident',
      requirements: [
        { label: 'Carte de résident arrivant à expiration', document_type: 'residence_permit' },
        { label: 'Passeport ou document de nationalité', document_type: 'passport' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Déclaration relative à vos absences, si demandée', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'long_term_eu',
      label: 'Renouvellement — résident de longue durée-UE',
      description: 'Vous renouvelez une carte de résident longue durée-UE déjà détenue.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F17359',
      sourceLabel: 'Service-Public — résident longue durée-UE',
      requirements: [
        { label: 'Carte de résident longue durée-UE arrivant à expiration', document_type: 'residence_permit' },
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Acte de naissance avec mentions récentes', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Déclaration relative aux absences de France ou de l’Union européenne', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'seasonal',
      label: 'Renouvellement — travailleur saisonnier',
      description: 'Vous exercez une activité saisonnière en France.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F21516',
      sourceLabel: 'Service-Public — travailleur saisonnier',
      requirements: [
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Autorisation de travail dématérialisée', document_type: 'other' },
        { label: 'Preuves du respect de la durée maximale de séjour saisonnier', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
      ]
    },
    {
      id: 'retiree',
      label: 'Renouvellement — retraité ou conjoint de retraité',
      description: 'Vous renouvelez une carte « retraité » ou « conjoint de retraité ».',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2710',
      sourceLabel: 'Service-Public — retraité',
      requirements: [
        { label: 'Carte « retraité » ou « conjoint de retraité » arrivant à expiration', document_type: 'residence_permit' },
        { label: 'Carte d’identité et document de voyage', document_type: 'passport' },
        { label: 'Trois photos d’identité', document_type: 'other' },
        { label: 'Attestation sur l’honneur sur la durée de vos séjours en France', document_type: 'other' },
        { label: 'Engagement à respecter les principes de la République signé', document_type: 'other' }
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
      const officialSource = route ? route.sourceUrl : customSource;
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
      const sourceUrl = profile.official_source_url || RESIDENCE_SOURCE;
      const route = commonRoutes.find((item) => item.id === profile.situation_answers.common_route);
      const sourceLabel = route?.sourceLabel || 'Source officielle';
      source.innerHTML = '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener">Consulter la source officielle — ' + esc(sourceLabel) + ' ↗</a><small style="display:block;margin-top:5px">Checklist nationale de préparation : vérifiez aussi les modalités de dépôt indiquées pour votre préfecture.</small>';
      note.appendChild(source);
    };
  });
})();