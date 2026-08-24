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
    temporary_worker: [
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
    resident_10_years: [
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
    retiree: [
      'Ce parcours concerne le renouvellement d’une carte « retraité ». La déclaration sur l’honneur porte sur des séjours en France d’une durée inférieure ou égale à un an.',
      'Ne l’utilisez pas pour un autre titre de séjour : choisissez alors la situation correspondante ou créez une liste personnalisée.'
    ],
    lost_or_stolen: [
      'Il s’agit d’un duplicata après perte ou vol, et non d’un renouvellement classique. Les modalités de dépôt et les délais relèvent de votre préfecture.',
      'La copie de l’ancien titre n’est à fournir que si vous l’avez encore.'
    ]
  };
  // Certaines pièces ne sont nécessaires que dans un cas précis. Elles restent visibles
  // dans Jamlio, mais ne doivent jamais être confondues avec les pièces obligatoires.
  const conditionalLabelsByRoute = {
    student: [
      'Attestation de réussite, lorsqu’elle existe',
      'Si bourse : attestation de bourse',
      'Si salarié : trois derniers bulletins de salaire',
      'Si prise en charge par un tiers : identité du tiers et preuves de virements',
      'Si épargne : attestation bancaire de solde suffisant'
    ],
    employee_cdi: [
      'Autorisation de travail, si demandée par votre situation',
      'Si perte involontaire d’emploi : attestation employeur France Travail et situation individuelle France Travail',
      'Si changement d’employeur : nouveau contrat et autorisation de travail correspondante',
      'Documents fiscaux ou justificatif OFII, si demandés par votre préfecture'
    ],
    temporary_worker: [
      'Si perte involontaire d’emploi : attestation employeur France Travail et situation individuelle France Travail',
      'Documents fiscaux ou justificatif OFII, si demandés par votre préfecture'
    ],
    spouse_french: [
      'En cas de décès ou de violences : justificatifs adaptés à votre situation',
      'Traductions et apostilles, si vos actes étrangers le nécessitent'
    ],
    parent_french_child: ['Si reconnaissance tardive : justificatifs complémentaires de filiation'],
    visitor: [
      'État civil, si votre situation a changé ou si demandé',
      'Déclaration de non-polygamie, si elle s’applique',
      'Certificat médical OFII, si vous ne l’avez pas déjà produit'
    ],
    resident_10_years: ['Déclaration relative à vos absences, si demandée'],
    long_term_eu: [
      'Déclaration de non-polygamie, si elle s’applique',
      'Déclaration relative aux absences de France ou de l’Union européenne'
    ],
    seasonal: [
      'Déclaration de non-polygamie, si elle s’applique',
      'Déclaration de résidence habituelle hors de France'
    ],
    lost_or_stolen: ['Copie de l’ancien titre, si disponible']
  };
  const supplementalConditionalRequirements = {
    resident_10_years: [
      { label: 'Justificatifs de ressources, uniquement si la mention de votre carte ou la préfecture les demande', document_type: 'other', conditional: true },
      { label: 'Attestation d’assurance maladie, uniquement si demandée pour votre mention', document_type: 'other', conditional: true },
      { label: 'Justificatif de niveau B1, uniquement si demandé par le parcours applicable', document_type: 'other', conditional: true },
      { label: 'Justificatif d’examen civique, uniquement si demandé par le parcours applicable', document_type: 'other', conditional: true }
    ]
  };
  commonRoutes.forEach((route) => {
    const conditionalLabels = conditionalLabelsByRoute[route.id] || [];
    route.requirements = route.requirements.map((requirement) => conditionalLabels.includes(requirement.label)
      ? { ...requirement, conditional: true }
      : requirement);
    route.requirements.push(...(supplementalConditionalRequirements[route.id] || []));
    route.guidance = routeGuidance[route.id] || [];
  });

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

  function routePicker(route) {
    return '<label class="journey-route-option" style="display:block;border:1px solid #cdd6cd;border-radius:12px;padding:13px 14px;margin:8px 0;cursor:pointer">' +
      '<input type="radio" name="residence-route" value="' + route.id + '" style="width:auto;margin:0 9px 0 0;vertical-align:middle">' +
      '<strong style="font-size:15px">' + esc(route.label) + '</strong><span style="display:block;margin:6px 0 0 25px;color:#647069;font-size:13px;line-height:1.4">' + esc(route.description) + '</span></label>';
  }

  async function saveResidenceV1(node, route, customItems, existingJourney = null) {
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
      let journey = existingJourney;
      if (!journey) {
        const duplicate = typeof activeJourneyConflict === 'function' ? activeJourneyConflict('residence_renewal') : null;
        if (duplicate) { node.remove(); resumeJourney(duplicate); return; }
        const { data, error: journeyError } = await supabaseClient
          .from('journeys')
          .insert({ owner_id: currentUser.id, vault_id: currentVault.id, code: 'residence_renewal' })
          .select().single();
        if (journeyError) throw journeyError;
        journey = data;
      }
      const previousAnswers = journeyProfiles[journey.id]?.situation_answers || {};
      const allowedRequirementLabels = new Set(requirements.map((item) => typeof item === 'string' ? item : item.label).filter(Boolean));
      const requirementLinks = Object.fromEntries(Object.entries(previousAnswers.requirement_links || {}).filter(([label]) => allowedRequirementLabels.has(label)));
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
          requirement_links: requirementLinks,
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

  async function createResidenceFromOrientation(node, route, existingJourney = null) {
    const error = node.querySelector('[data-error]');
    const button = node.querySelector('#orientation-continue');
    if (!route || !currentUser || !currentVault) return;
    button.disabled = true;
    error.hidden = true;
    try {
      let journey = existingJourney;
      if (!journey) {
        const duplicate = typeof activeJourneyConflict === 'function' ? activeJourneyConflict('residence_renewal') : null;
        if (duplicate) { node.remove(); resumeJourney(duplicate); return; }
        const { data, error: journeyError } = await supabaseClient
          .from('journeys')
          .insert({ owner_id: currentUser.id, vault_id: currentVault.id, code: 'residence_renewal' })
          .select().single();
        if (journeyError) throw journeyError;
        journey = data;
      }
      const previousAnswers = journeyProfiles[journey.id]?.situation_answers || {};
      const allowedRequirementLabels = new Set(route.requirements.map((item) => item.label).filter(Boolean));
      const requirementLinks = Object.fromEntries(Object.entries(previousAnswers.requirement_links || {}).filter(([label]) => allowedRequirementLabels.has(label)));
      const { error: profileError } = await supabaseClient.from('journey_profiles').upsert({
        journey_id: journey.id,
        owner_id: currentUser.id,
        department: String(currentUser?.user_metadata?.default_department || ''),
        permit_category: route.label,
        expiry_date: null,
        situation_answers: {
          route: 'residence_renewal',
          common_route: route.id,
          is_custom_residence: false,
          custom_title: route.label,
          note: '',
          required_documents: route.requirements,
          requirement_links: requirementLinks,
          route_guidance: route.guidance || ['Cette liste prépare votre dossier. Vérifiez toujours la source officielle avant le dépôt.']
        },
        source_status: 'verified',
        official_source_url: route.sourceUrl || null,
        source_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'journey_id' });
      if (profileError) throw profileError;
      node.remove();
      currentJourney = journey;
      await loadData();
      showView('journeys');
      $('#success').hidden = false;
      $('#success').textContent = 'Votre checklist de préparation est prête. Avant le dépôt, consultez toujours la source officielle liée à votre dossier.';
      $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (saveError) {
      error.textContent = 'Impossible de créer cette checklist. Réessayez dans un instant.';
      error.hidden = false;
      button.disabled = false;
    }
  }

  function showResidenceOrientation(existingJourney = null) {
    const node = modal(
      '<button class="close" aria-label="Fermer">×</button>' +
      '<p class="eyebrow">AIDE À L’ORIENTATION</p>' +
      '<div id="residence-orientation"></div>'
    );
    styleModal(node);
    node.querySelector('.close').addEventListener('click', () => node.remove());
    const screen = node.querySelector('#residence-orientation');
    const questionTrail = [];
    const goBack = () => {
      const previous = questionTrail.pop();
      if (previous) renderQuestion(previous);
    };
    const questions = {
      incident: {
        title: 'Votre titre a-t-il été perdu ou volé ?',
        help: 'Une perte ou un vol correspond à une demande de duplicata, et non à un renouvellement.',
        choices: [
          { label: 'Oui, il est perdu ou volé', route: 'lost_or_stolen' },
          { label: 'Non, je souhaite le renouveler', next: 'mention' }
        ]
      },
      mention: {
        title: 'Quelle mention correspond le mieux à votre titre actuel ?',
        help: 'Choisissez ce qui est écrit sur votre titre, pas ce que vous aimeriez demander.',
        choices: [
          { label: 'Étudiant', route: 'student' },
          { label: 'Salarié — je travaille en CDI', route: 'employee_cdi' },
          { label: 'Travailleur temporaire — je travaille en CDD', route: 'temporary_worker' },
          { label: 'Visiteur — je ne travaille pas en France', route: 'visitor' },
          { label: 'Vie privée et familiale', next: 'family' },
          { label: 'Carte de résident de 10 ans', route: 'resident_10_years' },
          { label: 'Résident de longue durée-UE', route: 'long_term_eu' },
          { label: 'Retraité ou conjoint de retraité', route: 'retiree' },
          { label: 'Travailleur saisonnier', route: 'seasonal' },
          { label: 'Je ne sais pas / une autre mention', next: 'uncertain' }
        ]
      },
      family: {
        title: 'Quel est le fondement de votre vie privée et familiale ?',
        help: 'Ces deux situations ont des listes distinctes. Si ce n’est ni l’une ni l’autre, Jamlio ne doit pas vous orienter automatiquement.',
        choices: [
          { label: 'Je suis époux ou épouse d’une personne française', route: 'spouse_french' },
          { label: 'Je suis parent d’un enfant français vivant en France', route: 'parent_french_child' },
          { label: 'Une autre situation familiale', next: 'uncertain' }
        ]
      }
    };
    const disclaimer = '<aside role="note" style="margin-top:18px;padding:14px 16px;border:1px solid #e2c67c;border-radius:16px;background:#fff7df;color:#58431e;font-size:14px;line-height:1.45"><strong style="display:block;color:#765013;margin-bottom:4px">Une aide, pas une décision administrative</strong>Cette orientation repose uniquement sur les informations que vous choisissez ici. Confirmez toujours le parcours et les pièces auprès de la source officielle et de votre préfecture.</aside>';
    const renderCustomSituation = () => {
      const profile = existingJourney ? journeyProfiles[existingJourney.id] : null;
      const answers = profile?.situation_answers || {};
      screen.innerHTML =
        '<p class="eyebrow">SITUATION PERSONNALISÉE</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Préparez votre propre liste.</h2>' +
        '<p style="color:#647069;line-height:1.5">Ajoutez les pièces indiquées par votre source officielle. Jamlio les comparera ensuite avec votre coffre.</p>' +
        '<label style="display:grid;gap:8px;margin-top:18px;font-weight:700">Nom de votre démarche<input id="residence-v1-title" maxlength="120" value="' + esc(answers.custom_title || profile?.permit_category || '') + '" placeholder="Ex. Admission exceptionnelle au séjour"></label>' +
        '<label style="display:grid;gap:8px;margin-top:14px;font-weight:700">Lien vers la source officielle <span style="font-weight:400;color:#647069">(facultatif)</span><input id="residence-v1-source" type="url" value="' + esc(profile?.official_source_url || '') + '" placeholder="https://…"></label>' +
        '<label style="display:grid;gap:8px;margin-top:14px;font-weight:700">Département où vous habitez<input id="residence-v1-department" inputmode="numeric" maxlength="3" value="' + esc(String(currentUser?.user_metadata?.default_department || profile?.department || '')) + '" placeholder="Ex. 91"></label>' +
        '<div id="residence-v1-items" style="display:grid;gap:8px;margin:16px 0"></div><button type="button" id="residence-v1-add-item" class="link-button" style="padding:0">+ Ajouter une pièce</button>' +
        '<label style="display:grid;gap:8px;margin-top:16px;font-weight:700">Date d’expiration du titre <span style="font-weight:400;color:#647069">(si connue)</span><input id="residence-v1-expiry" type="date" value="' + esc(profile?.expiry_date || '') + '"></label>' +
        '<label style="display:grid;gap:8px;margin-top:14px;font-weight:700">Élément important pour votre cas <span style="font-weight:400;color:#647069">(facultatif)</span><input id="residence-v1-note" maxlength="240" value="' + esc(answers.note || '') + '" placeholder="Ex. changement d’employeur, enfant concerné…"></label>' +
        '<p data-error hidden style="margin:10px 0;color:#aa3425;font-size:13px"></p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="outline" id="orientation-back" type="button" style="min-width:176px;min-height:48px;margin-top:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">← Retour</button><button class="primary" id="orientation-custom-save" type="submit" style="min-width:176px;min-height:48px;margin-top:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">Préparer ma checklist <span>→</span></button></div>' +
        disclaimer;
      const items = screen.querySelector('#residence-v1-items');
      const initialItems = Array.isArray(answers.required_documents) && answers.is_custom_residence
        ? answers.required_documents.map((item) => typeof item === 'string' ? item : item.label).filter(Boolean)
        : [''];
      const addItem = (value = '') => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;align-items:center';
        row.innerHTML = '<input class="residence-v1-item" maxlength="160" value="' + esc(value) + '" placeholder="Ex. Justificatif de domicile"><button type="button" aria-label="Supprimer cette pièce" style="border:0;background:none;color:#8a4d39;font-size:20px;cursor:pointer">×</button>';
        row.querySelector('button').addEventListener('click', () => row.remove());
        items.appendChild(row);
      };
      initialItems.forEach(addItem);
      screen.querySelector('#residence-v1-add-item').addEventListener('click', () => addItem());
      screen.querySelector('#orientation-back').addEventListener('click', renderSituationPicker);
      screen.querySelector('#orientation-custom-save').addEventListener('click', () => {
        const itemsToSave = Array.from(screen.querySelectorAll('.residence-v1-item')).map((input) => input.value.trim()).filter(Boolean);
        saveResidenceV1(node, null, itemsToSave, existingJourney);
      });
    };
    const renderSituationPicker = (onBack = null) => {
      screen.innerHTML =
        '<p class="eyebrow">CHOISIR MA SITUATION</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Quelle mention figure sur votre titre ?</h2>' +
        '<p style="color:#647069;line-height:1.5">Choisissez la mention inscrite sur votre titre actuel. Si vous ne savez pas laquelle choisir, Jamlio peut vous aider.</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Votre situation<select id="orientation-manual-route" style="width:100%;min-height:52px;padding:12px 14px;border:1px solid #b7c8bd;border-radius:12px;background:#fff;color:#203129;font:inherit"><option value="">Sélectionnez une situation</option>' + commonRoutes.map((route) => '<option value="' + esc(route.id) + '">' + esc(route.label) + '</option>').join('') + '<option value="custom">Autre situation — créer ma propre liste</option></select></label>' +
        '<p data-error hidden style="margin:10px 0;color:#aa3425;font-size:13px"></p>' +
        '<div style="display:grid;gap:10px;margin-top:18px"><button class="primary" id="orientation-manual-next" type="button" style="width:100%;margin-top:0;min-height:52px">Voir la checklist <span>→</span></button><div style="display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap">' + (onBack ? '<button class="link-button" id="orientation-back" type="button" style="padding:7px 0">← Retour</button>' : '') + '<button class="link-button" id="orientation-help" type="button" style="padding:7px 0">Je ne sais pas quoi choisir</button></div></div>' +
        disclaimer;
      const backButton = screen.querySelector('#orientation-back');
      if (backButton) backButton.addEventListener('click', onBack);
      screen.querySelector('#orientation-help').addEventListener('click', () => {
        questionTrail.length = 0;
        renderQuestion('incident');
      });
      screen.querySelector('#orientation-manual-next').addEventListener('click', () => {
        const value = screen.querySelector('#orientation-manual-route').value;
        const error = screen.querySelector('[data-error]');
        if (!value) { error.textContent = 'Sélectionnez une situation pour continuer.'; error.hidden = false; return; }
        if (value === 'custom') { renderCustomSituation(); return; }
        renderResult(value);
      });
    };
    const choose = (onBack = null) => renderSituationPicker(onBack);
    const renderResult = (routeId) => {
      const route = commonRoutes.find((item) => item.id === routeId);
      if (!route) return renderUncertain();
      screen.innerHTML =
        '<p class="eyebrow">PARCOURS SUGGÉRÉ</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Le parcours qui semble correspondre</h2>' +
        '<div style="margin:18px 0;padding:18px;border:1px solid #a4c5b3;border-radius:18px;background:#f1f8f3"><strong style="display:block;font-size:18px;color:#174f3e">' + esc(route.label) + '</strong><span style="display:block;margin-top:6px;color:#4f665b;line-height:1.45">' + esc(route.description) + '</span></div>' +
        '<p style="color:#647069;line-height:1.5">' + (existingJourney ? 'Cette situation remplacera la checklist de ce dossier. Les documents déjà dans votre coffre seront conservés.' : 'Jamlio peut maintenant créer directement votre checklist de préparation. Les pièces conditionnelles y apparaîtront dans la même liste, avec une indication claire.') + '</p>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p>' +
        '<div style="display:grid;gap:12px;margin-top:22px"><button class="primary" id="orientation-continue" type="button" style="width:100%;margin-top:0;min-height:52px">' + (existingJourney ? 'Mettre à jour ce dossier' : 'Préparer cette checklist') + ' <span>→</span></button><div style="display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap"><button class="link-button" id="orientation-back" type="button" style="padding:7px 0">← Modifier mes réponses</button><button class="link-button" id="orientation-choose" type="button" style="padding:7px 0">Voir toutes les situations</button></div></div>' +
        disclaimer;
      screen.querySelector('#orientation-back').addEventListener('click', goBack);
      screen.querySelector('#orientation-continue').addEventListener('click', () => createResidenceFromOrientation(node, route, existingJourney));
      screen.querySelector('#orientation-choose').addEventListener('click', () => choose(() => renderResult(route.id)));
    };
    const renderUncertain = () => {
      screen.innerHTML =
        '<p class="eyebrow">VÉRIFICATION NÉCESSAIRE</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Nous ne pouvons pas vous orienter de façon fiable.</h2>' +
        '<p style="color:#647069;line-height:1.5">Votre situation peut relever d’un autre parcours : changement de statut, entrepreneur, certificat de résidence algérien, autre situation familiale ou cas particulier. Choisissez alors la mention exacte sur votre titre ou créez votre propre liste de pièces.</p>' +
        '<p style="color:#647069;line-height:1.5">En présence d’une OQTF, d’un refus, d’un titre expiré depuis longtemps ou d’un changement de statut complexe, demandez un accompagnement spécialisé.</p>' +
        '<div style="display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:18px"><button class="link-button" id="orientation-back" type="button" style="padding:7px 0">← Retour</button><button class="link-button" id="orientation-choose" type="button" style="padding:7px 0">Voir toutes les situations</button></div>' +
        disclaimer;
      screen.querySelector('#orientation-back').addEventListener('click', goBack);
      screen.querySelector('#orientation-choose').addEventListener('click', () => choose(renderUncertain));
    };
    const renderQuestion = (key) => {
      const question = questions[key];
      screen.innerHTML =
        '<p class="eyebrow">TROUVER MA SITUATION</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">' + esc(question.title) + '</h2>' +
        '<p style="color:#647069;line-height:1.5">' + esc(question.help) + '</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Votre réponse<select id="orientation-choice" style="width:100%;min-height:52px;padding:12px 14px;border:1px solid #b7c8bd;border-radius:12px;background:#fff;color:#203129;font:inherit"><option value="">Sélectionnez une réponse</option>' + question.choices.map((choice, index) => '<option value="' + index + '">' + esc(choice.label) + '</option>').join('') + '</select></label>' +
        '<p data-error hidden style="margin:10px 0;color:#aa3425;font-size:13px"></p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">' + (questionTrail.length ? '<button class="outline" id="orientation-back" type="button" style="min-width:176px;min-height:48px;margin-top:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">← Retour</button>' : '') + '<button class="primary" id="orientation-next" type="button" style="min-width:176px;min-height:48px;margin-top:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">Suivant <span>→</span></button></div>' +
        disclaimer;
      screen.querySelector('#orientation-next').addEventListener('click', () => {
        const select = screen.querySelector('#orientation-choice');
        const error = screen.querySelector('[data-error]');
        if (select.value === '') {
          error.textContent = 'Sélectionnez une réponse pour continuer.';
          error.hidden = false;
          return;
        }
        const choice = question.choices[Number(select.value)];
        questionTrail.push(key);
        if (choice.route) renderResult(choice.route);
        else if (choice.next === 'uncertain') renderUncertain();
        else renderQuestion(choice.next);
      });
      const backButton = screen.querySelector('#orientation-back');
      if (backButton) backButton.addEventListener('click', goBack);
    };
    renderSituationPicker();
  }

  function showResidenceV1(preselectedRouteId = null, existingJourney = null) {
    const defaultDepartment = String(currentUser?.user_metadata?.default_department || '');
    const node = modal(
      '<button class="close" aria-label="Fermer">×</button>' +
      '<p class="eyebrow">RENOUVELER SON TITRE DE SÉJOUR</p>' +
      '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Choisissez la situation inscrite sur votre titre.</h2>' +
      '<p style="color:#647069;line-height:1.45">Votre préfecture et votre situation personnelle restent la référence pour le dépôt.</p>' +
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
      '<button class="primary" type="submit">' + (existingJourney ? 'Mettre à jour ce dossier' : 'Créer ma checklist') + ' <span>→</span></button></form>'
    );
    styleModal(node);
    const close = node.querySelector('.close');
    close.addEventListener('click', () => node.remove());
    const custom = node.querySelector('#residence-v1-custom');
    const items = node.querySelector('#residence-v1-items');
    if (preselectedRouteId) {
      const preselected = node.querySelector('input[name="residence-route"][value="' + preselectedRouteId + '"]');
      if (preselected) preselected.checked = true;
    }
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
      saveResidenceV1(node, route, customItems, existingJourney);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const original = showQualification;
    showQualification = function(code, existingJourney, restartOrientation = false) {
      if (code === 'residence_renewal' && (!existingJourney || restartOrientation)) return showResidenceOrientation(existingJourney || null);
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