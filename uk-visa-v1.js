/* Jamlio — parcours visa Royaume-Uni, sources GOV.UK vérifiées le 16 septembre 2026. */
(() => {
  const CHECK_URL = 'https://www.gov.uk/check-uk-visa';
  const routes = [
    {
      id: 'standard_visitor',
      label: 'Visa visiteur standard',
      description: 'Tourisme, visite à des proches, voyage d’affaires autorisé ou court séjour.',
      sourceUrl: 'https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk',
      sourceLabel: 'GOV.UK — pièces pour une visite',
      requirements: [
        { label: 'Passeport ou document de voyage valide pendant tout le séjour', document_type: 'passport' },
        { label: 'Détails du séjour : dates prévues, hébergement et budget estimé', document_type: 'other' },
        { label: 'Preuves du motif du voyage et de l’activité autorisée au Royaume-Uni', document_type: 'other' },
        { label: 'Éléments montrant que vous quitterez le Royaume-Uni à la fin de la visite et que votre situation est établie dans votre pays de résidence', document_type: 'other' },
        { label: 'Justificatifs de ressources accessibles : relevés bancaires, épargne ou preuve de revenus', document_type: 'other' },
        { label: 'Si un tiers finance le voyage ou l’hébergement : lettre de prise en charge, lien avec vous, ressources et statut légal au Royaume-Uni si applicable', document_type: 'other' },
        { label: 'Si voyage professionnel ou études hors Royaume-Uni : lettre de l’employeur, de l’établissement ou de l’organisme invitant', document_type: 'other' },
        { label: 'Si travailleur indépendant : immatriculation de l’activité ou factures récentes, selon le cas', document_type: 'other' },
        { label: 'Si vous résidez dans un pays dont vous n’êtes pas ressortissant : preuve de résidence légale', document_type: 'residence_permit' },
        { label: 'Si utile pour votre situation : copies de passeports précédents montrant vos voyages antérieurs', document_type: 'other' },
        { label: 'Si mineur : acte de naissance ou preuve du lien avec un parent ou tuteur, copie de son passeport et consentement écrit', document_type: 'birth_certificate' },
        { label: 'Si les documents ne sont ni en anglais ni en gallois : traduction certifiée complète', document_type: 'other' }
      ]
    },
    {
      id: 'student',
      label: 'Visa étudiant',
      description: 'Vous allez suivre un cursus au Royaume-Uni auprès d’un établissement sponsor.',
      sourceUrl: 'https://www.gov.uk/student-visa/documents-you-must-provide',
      sourceLabel: 'GOV.UK — visa étudiant',
      requirements: [
        { label: 'Passeport ou document de voyage valide', document_type: 'passport' },
        { label: 'Confirmation of Acceptance for Studies (CAS) fournie par votre établissement', document_type: 'other' },
        { label: 'Si demandé : preuve des fonds suffisants pour les frais de formation et de vie', document_type: 'other' },
        { label: 'Si votre cursus et votre nationalité l’exigent : certificat ATAS valide', document_type: 'other' },
        { label: 'Si vous avez moins de 18 ans : consentement écrit des parents ou tuteurs pour la demande, le voyage et l’hébergement', document_type: 'other' },
        { label: 'Si vous avez moins de 18 ans : acte de naissance ou document officiel indiquant vos parents ou tuteurs', document_type: 'birth_certificate' },
        { label: 'Si vous résidez dans un pays concerné : résultat du test de tuberculose (TB)', document_type: 'other' },
        { label: 'Si un sponsor financier a pris en charge vos frais de cours ou de vie durant les 12 derniers mois : son consentement écrit', document_type: 'other' },
        { label: 'Si les documents ne sont ni en anglais ni en gallois : traduction certifiée complète', document_type: 'other' }
      ]
    },
    {
      id: 'skilled_worker',
      label: 'Visa Skilled Worker',
      description: 'Vous avez une offre d’emploi auprès d’un employeur britannique agréé.',
      sourceUrl: 'https://www.gov.uk/skilled-worker-visa/documents-you-must-provide',
      sourceLabel: 'GOV.UK — Skilled Worker visa',
      requirements: [
        { label: 'Passeport ou document prouvant votre identité et votre nationalité', document_type: 'passport' },
        { label: 'Numéro de référence du Certificate of Sponsorship (CoS) fourni par l’employeur', document_type: 'other' },
        { label: 'Preuve de votre niveau d’anglais', document_type: 'other' },
        { label: 'Intitulé du poste, salaire annuel, code de profession, nom de l’employeur et numéro de licence sponsor', document_type: 'other' },
        { label: 'Si le CoS ne confirme pas la prise en charge : preuve d’épargne personnelle suffisante, par exemple relevés bancaires', document_type: 'other' },
        { label: 'Si partenaire ou enfants vous accompagnent : preuve du lien familial', document_type: 'family_record' },
        { label: 'Si vous venez d’un pays concerné : résultat du test de tuberculose (TB)', document_type: 'other' },
        { label: 'Si le poste est concerné (éducation, santé, thérapie ou services sociaux) et que vous postulez depuis l’étranger : extrait de casier judiciaire', document_type: 'other' },
        { label: 'Si l’employeur le demande pour une recherche doctorale sensible : certificat ATAS valide', document_type: 'other' },
        { label: 'Si applicable : diplôme de doctorat britannique ou référence Ecctis pour un diplôme étranger', document_type: 'other' },
        { label: 'Si les documents ne sont ni en anglais ni en gallois : traduction certifiée complète', document_type: 'other' }
      ]
    },
    {
      id: 'family',
      label: 'Visa famille',
      description: 'Vous rejoignez un partenaire, un parent, un enfant ou un proche au Royaume-Uni.',
      sourceUrl: 'https://www.gov.uk/uk-family-visa/provide-information',
      sourceLabel: 'GOV.UK — visa famille',
      requirements: [
        { label: 'Passeport ou titre de voyage valide', document_type: 'passport' },
        { label: 'Copies de la page photo et des visas ou tampons de vos passeports précédents', document_type: 'other' },
        { label: 'Informations sur vos précédentes demandes d’immigration et éventuelles condamnations', document_type: 'other' },
        { label: 'Si vous postulez depuis l’extérieur du Royaume-Uni : dates de naissance et nationalités de vos parents', document_type: 'other' },
        { label: 'Si vous résidez dans un pays concerné : résultat du test de tuberculose (TB)', document_type: 'other' },
        { label: 'Si vous avez une eVisa : code de partage de votre statut ; sinon, votre BRP si elle est encore utilisable', document_type: 'residence_permit' },
        { label: 'Preuve de votre niveau d’anglais', document_type: 'other' },
        { label: 'Preuves de finances correspondant à votre catégorie de visa', document_type: 'other' },
        { label: 'Si emploi salarié : relevés bancaires, 6 mois de fiches de paie et lettre de l’employeur', document_type: 'other' },
        { label: 'Si vous rejoignez un partenaire : preuves de la relation et, si vous vivez ensemble, preuves de cohabitation et de dépenses communes', document_type: 'family_record' },
        { label: 'Si mariages ou unions précédents : preuves de leur fin, par exemple jugement de divorce', document_type: 'marriage_certificate' },
        { label: 'Si votre proche au Royaume-Uni vous sponsorise : informations et documents de son statut et de son soutien', document_type: 'other' },
        { label: 'Si les documents ne sont ni en anglais ni en gallois : traduction certifiée complète', document_type: 'other' }
      ]
    }
  ];

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

  async function createUkVisa(node, route, existingJourney = null, forceNew = false) {
    const button = node.querySelector('#uk-visa-continue');
    const error = node.querySelector('[data-error]');
    button.disabled = true;
    error.hidden = true;
    try {
      let journey = existingJourney;
      if (!journey) {
        const duplicate = typeof activeJourneyConflict === 'function' ? activeJourneyConflict('uk_visa') : null;
        if (duplicate && !forceNew) { node.remove(); resumeJourney(duplicate); return; }
        const { data, error: journeyError } = await supabaseClient.from('journeys')
          .insert({ owner_id: currentUser.id, vault_id: currentVault.id, code: 'uk_visa' })
          .select().single();
        if (journeyError) throw journeyError;
        journey = data;
      }
      const previous = journeyProfiles[journey.id]?.situation_answers || {};
      const allowed = new Set(route.requirements.map((item) => item.label));
      const requirementLinks = Object.fromEntries(Object.entries(previous.requirement_links || {}).filter(([label]) => allowed.has(label)));
      const { error: profileError } = await supabaseClient.from('journey_profiles').upsert({
        journey_id: journey.id,
        owner_id: currentUser.id,
        department: '',
        permit_category: route.label,
        expiry_date: null,
        situation_answers: {
          route: 'uk_visa',
          uk_visa_route: route.id,
          custom_title: 'Visa Royaume-Uni — ' + route.label,
          required_documents: route.requirements,
          requirement_links,
          route_guidance: [
            'Cette liste prépare vos pièces ; elle ne dépose pas la demande.',
            'Vérifiez d’abord si vous avez besoin d’un visa ou d’une ETA, puis suivez la liste finale affichée par GOV.UK au moment de la demande.'
          ]
        },
        source_status: 'verified',
        official_source_url: route.sourceUrl,
        source_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'journey_id' });
      if (profileError) throw profileError;
      node.remove();
      currentJourney = journey;
      await loadData();
      showView('journeys');
      $('#success').hidden = false;
      $('#success').textContent = 'Votre checklist de préparation est prête. Vérifiez ensuite sur GOV.UK si vous avez besoin d’un visa ou d’une ETA avant de déposer votre demande.';
      $('#demarche').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (saveError) {
      error.textContent = 'Impossible de créer cette checklist. Réessayez dans un instant.';
      error.hidden = false;
      button.disabled = false;
    }
  }

  function showUkVisaFlow(existingJourney = null, forceNew = false) {
    const currentRoute = existingJourney && journeyProfiles[existingJourney.id]?.situation_answers?.uk_visa_route;
    const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">VISA POUR LE ROYAUME-UNI</p><div id="uk-visa-flow"></div>');
    styleModal(node);
    node.querySelector('.close').addEventListener('click', () => node.remove());
    const screen = node.querySelector('#uk-visa-flow');
    const disclaimer = '<aside role="note" style="margin-top:18px;padding:14px 16px;border:1px solid #e2c67c;border-radius:16px;background:#fff7df;color:#58431e;font-size:14px;line-height:1.45"><strong style="display:block;color:#765013;margin-bottom:4px">Une aide de préparation, pas une décision de visa</strong>Les exigences finales sont celles communiquées par GOV.UK dans votre demande. Jamlio vous aide à réunir vos documents ; il ne dépose pas la demande.</aside>';

    const renderRoute = (routeId) => {
      const route = routes.find((item) => item.id === routeId);
      if (!route) return renderPicker();
      screen.innerHTML =
        '<p class="eyebrow">CHECKLIST PROPOSÉE</p>' +
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">' + esc(route.label) + '</h2>' +
        '<p style="color:#647069;line-height:1.5">' + esc(route.description) + '</p>' +
        '<div style="margin:18px 0;padding:15px 16px;border:1px solid #b9d5c4;border-radius:16px;background:#f1f8f3;color:#245c48;line-height:1.45"><strong style="display:block;margin-bottom:4px">Avant de préparer le dossier</strong>Selon votre nationalité, vous pouvez avoir besoin d’un visa, d’une ETA, ou d’aucune autorisation préalable pour une visite. <a href="' + CHECK_URL + '" target="_blank" rel="noopener">Vérifier sur GOV.UK ↗</a></div>' +
        '<p style="color:#647069;line-height:1.5">' + (existingJourney ? 'Cette sélection remplacera la checklist de ce dossier. Vos documents déjà présents dans le coffre ne seront pas supprimés.' : 'Les pièces conditionnelles figurent dans la même checklist avec une indication claire.') + '</p>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p>' +
        '<div style="display:grid;gap:12px;margin-top:22px"><button class="primary" id="uk-visa-continue" type="button" style="width:100%;margin-top:0;min-height:52px">Préparer cette checklist <span>→</span></button><button class="outline" id="uk-visa-back" type="button" style="width:100%;margin-top:0;min-height:52px">← Retour</button></div>' +
        disclaimer;
      screen.querySelector('#uk-visa-back').addEventListener('click', renderPicker);
      screen.querySelector('#uk-visa-continue').addEventListener('click', () => createUkVisa(node, route, existingJourney, forceNew));
    };

    const renderPicker = () => {
      screen.innerHTML =
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Quel est votre projet ?</h2>' +
        '<p style="color:#647069;line-height:1.5">Choisissez le motif qui correspond le mieux. Il déterminera la checklist de préparation.</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Motif de votre séjour<select id="uk-visa-route" style="min-height:50px"><option value="">Sélectionnez un motif</option>' +
        routes.map((route) => '<option value="' + route.id + '"' + (route.id === currentRoute ? ' selected' : '') + '>' + esc(route.label) + '</option>').join('') +
        '</select></label>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p>' +
        '<div style="margin-top:20px;padding:15px 16px;border:1px solid #b9d5c4;border-radius:16px;background:#f6fbf7;color:#315a49;font-size:14px;line-height:1.45"><strong style="display:block;margin-bottom:4px">Une exigence dépend toujours de votre situation</strong>Nationalité, durée, motif précis, sponsor et lieu de résidence peuvent modifier les pièces demandées. La checklist officielle affichée par GOV.UK reste la référence.</div>' +
        '<button class="primary" id="uk-visa-next" type="button" style="width:100%;margin-top:20px;min-height:52px">Voir ma checklist <span>→</span></button>' +
        disclaimer;
      screen.querySelector('#uk-visa-next').addEventListener('click', () => {
        const value = screen.querySelector('#uk-visa-route').value;
        const error = screen.querySelector('[data-error]');
        if (!value) { error.textContent = 'Sélectionnez un motif pour continuer.'; error.hidden = false; return; }
        renderRoute(value);
      });
    };
    renderPicker();
  }

  window.showUkVisaFlow = showUkVisaFlow;

  document.addEventListener('DOMContentLoaded', () => {
    const originalQualification = showQualification;
    showQualification = function(code, existingJourney, forceNew) {
      if (code === 'uk_visa') return showUkVisaFlow(existingJourney || null, Boolean(forceNew));
      return originalQualification(code, existingJourney, forceNew);
    };

    const originalRenderChecklist = renderChecklist;
    renderChecklist = function() {
      originalRenderChecklist();
      const profile = currentJourney && journeyProfiles[currentJourney.id];
      if (currentJourney?.code !== 'uk_visa' || !profile?.situation_answers?.uk_visa_route) return;
      const note = document.querySelector('#checklist .custom-list-note');
      if (!note || note.querySelector('.uk-visa-source')) return;
      const source = document.createElement('span');
      source.className = 'uk-visa-source';
      const route = routes.find((item) => item.id === profile.situation_answers.uk_visa_route);
      source.innerHTML = '<a href="' + esc(profile.official_source_url || CHECK_URL) + '" target="_blank" rel="noopener">Consulter la source officielle — ' + esc(route?.sourceLabel || 'GOV.UK') + ' ↗</a><small style="display:block;margin-top:5px">Vérifiez également votre besoin de visa ou d’ETA et la liste finale demandée dans votre dossier GOV.UK.</small>';
      note.appendChild(source);
    };
  });
})();