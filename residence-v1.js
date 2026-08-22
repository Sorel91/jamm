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
        { label: 'Titre de séjour en cours de validité', document_type: 'residence_permit' },
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Inscription ou préinscription dans un établissement', document_type: 'other' },
        { label: 'Relevés de notes de l’année écoulée', document_type: 'other' },
        { label: 'Dernier diplôme obtenu en France', document_type: 'other' },
        { label: 'Attestation de réussite, lorsqu’elle existe', document_type: 'other' },
        { label: 'Justificatifs de ressources', document_type: 'other' },
        { label: 'Si bourse : attestation de bourse', document_type: 'other' },
        { label: 'Si salarié : trois derniers bulletins de salaire', document_type: 'other' },
        { label: 'Si prise en charge par un tiers : identité du tiers et preuves de virements', document_type: 'other' },
        { label: 'Si épargne : attestation bancaire de solde suffisant', document_type: 'other' },
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
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport ou justificatif de nationalité', document_type: 'passport' },
        { label: 'Justificatif de domicile de moins de 6 mois', document_type: 'proof_of_address' },
        { label: 'e-photo ou photos d’identité, selon le canal de dépôt', document_type: 'other' },
        { label: 'Contrat de travail ou attestation employeur', document_type: 'other' },
        { label: 'Autorisation de travail, si demandée par votre situation', document_type: 'other' },
        { label: 'Justificatifs de l’activité du salarié et de l’employeur', document_type: 'other' },
        { label: 'Si perte involontaire d’emploi : attestation employeur France Travail et situation individuelle France Travail', document_type: 'other' },
        { label: 'Si changement d’employeur : nouveau contrat et autorisation de travail correspondante', document_type: 'other' },
        { label: 'Documents fiscaux ou justificatif OFII, si demandés par votre préfecture', document_type: 'other' }
      ]
    },
    {
      id: 'temporary_worker',
      label: 'Renouvellement — travailleur temporaire (CDD)',
      description: 'Vous travaillez en France avec un contrat à durée déterminée.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F15898',
      sourceLabel: 'Service-Public — salarié / travailleur temporaire',
      requirements: [
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport ou justificatif de nationalité', document_type: 'passport' },
        { label: 'Justificatif de domicile de moins de 6 mois', document_type: 'proof_of_address' },
        { label: 'e-photo ou photos d’identité, selon le canal de dépôt', document_type: 'other' },
        { label: 'Contrat à durée déterminée, avenant ou promesse d’embauche', document_type: 'other' },
        { label: 'Autorisation de travail correspondant à votre emploi', document_type: 'other' },
        { label: 'Justificatifs de l’activité du salarié et de l’employeur', document_type: 'other' },
        { label: 'Si perte involontaire d’emploi : attestation employeur France Travail et situation individuelle France Travail', document_type: 'other' },
        { label: 'Documents fiscaux ou justificatif OFII, si demandés par votre préfecture', document_type: 'other' }
      ]
    },
    {
      id: 'spouse_french',
      label: 'Renouvellement — époux ou épouse de Français',
      description: 'Votre droit au séjour est lié à votre mariage avec une personne française.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2209',
      sourceLabel: 'Service-Public — vie privée et familiale',
      requirements: [
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport ou justificatif de nationalité', document_type: 'passport' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile de moins de 6 mois', document_type: 'proof_of_address' },
        { label: 'Acte de mariage ou transcription de l’acte de mariage', document_type: 'marriage_certificate' },
        { label: 'Justificatif de nationalité française du conjoint', document_type: 'other' },
        { label: 'Justificatifs de communauté de vie', document_type: 'other' },
        { label: 'En cas de décès ou de violences : justificatifs adaptés à votre situation', document_type: 'other' },
        { label: 'Traductions et apostilles, si vos actes étrangers le nécessitent', document_type: 'other' },
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
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport ou justificatif de nationalité', document_type: 'passport' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile de moins de 6 mois', document_type: 'proof_of_address' },
        { label: 'Acte de naissance de l’enfant français avec filiation', document_type: 'birth_certificate' },
        { label: 'Justificatif de résidence de l’enfant en France', document_type: 'other' },
        { label: 'Justificatif de nationalité française de l’enfant', document_type: 'other' },
        { label: 'Preuves de contribution à l’entretien et à l’éducation de l’enfant', document_type: 'other' },
        { label: 'Si reconnaissance tardive : justificatifs complémentaires de filiation', document_type: 'other' },
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
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'État civil, si votre situation a changé ou si demandé', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Déclaration de non-polygamie, si elle s’applique', document_type: 'other' },
        { label: 'Justificatifs de ressources suffisantes', document_type: 'other' },
        { label: 'Déclaration de ne pas exercer d’activité professionnelle en France', document_type: 'other' },
        { label: 'Attestation d’assurance maladie', document_type: 'other' },
        { label: 'Certificat médical OFII, si vous ne l’avez pas déjà produit', document_type: 'other' }
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
        { label: 'Acte de naissance avec mentions récentes', document_type: 'birth_certificate' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Déclaration de non-polygamie, si elle s’applique', document_type: 'other' },
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
        { label: 'Titre de séjour actuel', document_type: 'residence_permit' },
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'e-photo avec code', document_type: 'other' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'Déclaration de non-polygamie, si elle s’applique', document_type: 'other' },
        { label: 'Autorisation de travail dématérialisée', document_type: 'other' },
        { label: 'Déclaration de résidence habituelle hors de France', document_type: 'other' },
        { label: 'Preuves du respect de la durée maximale de séjour saisonnier (6 mois par an)', document_type: 'other' },
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
    },
    {
      id: 'lost_or_stolen',
      label: 'Demander un duplicata — titre perdu ou volé',
      description: 'Vous demandez un duplicata après la perte ou le vol de votre titre.',
      sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/N110',
      sourceLabel: 'Service-Public — titre de séjour',
      requirements: [
        { label: 'Déclaration de perte ou de vol', document_type: 'other' },
        { label: 'Copie de l’ancien titre, si disponible', document_type: 'residence_permit' },
        { label: 'Passeport en cours de validité', document_type: 'passport' },
        { label: 'Justificatif de domicile récent', document_type: 'proof_of_address' },
        { label: 'e-photo avec code', document_type: 'other' }
      ]
    }
  ];


  // Ces notes sont affichées dans le dossier : elles font partie de la checklist,
  // mais ne sont pas des pièces à ajouter. Elles évitent d'élargir à tort une demande.
  const routeGuidance = {
    student: [
      'Les justificatifs de ressources sont alternatifs : bourse, fiches de paie, prise en charge par un tiers ou attestation bancaire. Joignez uniquement la ou les preuves qui correspondent réellement à votre cas.',
      'Les relevés de notes, le dernier diplôme obtenu en France et l’attestation de réussite sont demandés lorsqu’ils existent et sont pertinents pour votre parcours.',
      'Vérifiez auprès de votre préfecture le canal de dépôt et la date à partir de laquelle le renouvellement peut être demandé.'
    ],
    employee_cdi: [
      'Le contrat, l’autorisation de travail et les justificatifs de l’employeur dépendent notamment d’un changement d’employeur, d’une période sans emploi ou de votre type de contrat.',
      'Les pièces fiscales, OFII et les documents complémentaires de l’employeur ne doivent être ajoutés que lorsque la préfecture les demande pour votre situation.'
    ],
    employee_cdd: [
      'Le contrat, l’autorisation de travail et les justificatifs de l’employeur dépendent notamment d’un changement d’employeur, d’une période sans emploi ou de votre type de contrat.',
      'Les pièces fiscales, OFII et les documents complémentaires de l’employeur ne doivent être ajoutés que lorsque la préfecture les demande pour votre situation.'
    ],
    spouse_french: [
      'En cas de séparation, décès ou violences, ne vous appuyez pas uniquement sur les preuves habituelles de communauté de vie : utilisez les justificatifs correspondant précisément à votre situation.',
      'Les documents étrangers peuvent nécessiter une traduction, une légalisation ou une apostille selon le pays émetteur.'
    ],
    parent_french_child: [
      'Les preuves de contribution à l’entretien et à l’éducation de l’enfant dépendent de la garde, de la résidence de l’enfant et de la date de reconnaissance de la filiation.',
      'En cas de reconnaissance tardive, de séparation ou de situation familiale particulière, la préfecture peut demander des pièces différentes.'
    ],
    visitor: [
      'Les ressources, la couverture maladie et l’engagement de ne pas travailler sont centraux pour ce statut. Les pièces d’état civil modifiées et le certificat médical OFII ne sont requis que dans les cas prévus.',
      'N’ajoutez pas de justificatif de travail : ce parcours suppose l’absence d’activité professionnelle en France.'
    ],
    resident_10: [
      'La liste exacte dépend de la mention figurant sur votre carte de résident.',
      'Pour un simple renouvellement, les ressources, l’assurance maladie, le niveau B1 ou l’examen civique ne doivent pas être ajoutés automatiquement : ils ne sont demandés que dans certains parcours particuliers.',
      'Vérifiez les éventuelles pièces conditionnelles auprès de la préfecture compétente avant le dépôt.'
    ],
    long_term_eu: [
      'Les justificatifs d’absence hors de France ou hors de l’Union européenne et la déclaration de non-polygamie ne s’ajoutent que s’ils correspondent à votre situation.',
      'La mention exacte de la carte et l’historique de résidence peuvent entraîner des demandes complémentaires.'
    ],
    seasonal: [
      'Ce parcours concerne une carte de séjour pluriannuelle « travailleur saisonnier ». L’autorisation de travail et le respect de la limite de six mois sur douze mois sont à vérifier selon votre activité.',
      'La déclaration de résidence hors de France ne doit être ajoutée que lorsqu’elle correspond à votre situation.'
    ],
    retired: [
      'Ce parcours concerne le renouvellement d’une carte « retraité ». La déclaration sur l’honneur porte sur des séjours en France d’une durée inférieure ou égale à un an.',
      'Ne l’utilisez pas pour un autre titre de séjour : choisissez alors la situation correspondante ou créez une liste personnalisée.'
    ],
    lost_or_stolen: [
      'Il s’agit d’un duplicata après perte ou vol, et non d’un renouvellement classique. Les modalités de dépôt et les délais relèvent de votre préfecture.',
      'La copie de l’ancien titre n’est à fournir que si vous l’avez encore.'
    ]
  };
  commonRoutes.forEach((route) => { route.guidance = routeGuidance[route.id] || []; });

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
          requirement_links: {},
          route_guidance: route ? (route.guidance || []) : ['La liste finale dépend de l’organisme compétent et de votre situation. Vérifiez votre source avant le dépôt.']
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