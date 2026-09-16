/* Jamlio — entrée par destination et nationalité pour les visas. */
(() => {
  const CHECK_URL = 'https://www.gov.uk/check-uk-visa';
  const ETA_URL = 'https://www.gov.uk/eta';
  const visaNationals = new Set([
    'Afghanistan','Albanie','Algérie','Angola','Arménie','Azerbaïdjan','Bangladesh','Biélorussie','Bénin','Bhoutan','Bolivie','Bosnie-Herzégovine','Botswana','Burkina Faso','Burundi','Cambodge','Cameroun','Cap-Vert','Chine','Colombie','Comores','Congo','Congo démocratique','Côte d’Ivoire','Cuba','Djibouti','Dominique','Égypte','Érythrée','Eswatini','Éthiopie','Fidji','Gabon','Gambie','Géorgie','Ghana','Guinée','Guinée-Bissau','Guinée équatoriale','Haïti','Honduras','Inde','Indonésie','Iran','Irak','Jamaïque','Jordanie','Kazakhstan','Kenya','Kirghizistan','Kosovo','Laos','Lesotho','Liban','Liberia','Libye','Macédoine du Nord','Madagascar','Malawi','Mali','Maroc','Mauritanie','Moldavie','Mongolie','Monténégro','Mozambique','Myanmar','Namibie','Nauru','Népal','Nicaragua','Niger','Nigeria','Ouganda','Ouzbékistan','Pakistan','Palestine','Philippines','République centrafricaine','Russie','Rwanda','Sainte-Lucie','Sao Tomé-et-Principe','Sénégal','Serbie','Sierra Leone','Somalie','Soudan','Soudan du Sud','Sri Lanka','Suriname','Syrie','Tadjikistan','Tanzanie','Tchad','Thaïlande','Timor-Leste','Togo','Trinité-et-Tobago','Tunisie','Turkménistan','Turquie','Ukraine','Vanuatu','Venezuela','Vietnam','Yémen','Zambie','Zimbabwe'
  ]);
  const etaExamples = ['France','Allemagne','Belgique','Espagne','Italie','Portugal','Suisse','Pays-Bas','États-Unis','Canada','Australie','Nouvelle-Zélande','Japon','Corée du Sud'];
  const destinations = ['Royaume-Uni','Allemagne','Belgique','Canada','Espagne','États-Unis','France','Italie','Maroc','Sénégal','Turquie','Autre pays'];
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

  function nationalityStatus(nationality, routeId) {
    if (nationality === 'Royaume-Uni' || nationality === 'Irlande') return 'exempt';
    if (nationality === 'Autre nationalité') return 'check';
    if (routeId && routeId !== 'standard_visitor') return 'visa';
    return visaNationals.has(nationality) ? 'visa' : 'eta';
  }

  function statusCopy(status, routeId, nationality) {
    if (status === 'visa') {
      const brake = (routeId === 'student' && ['Afghanistan','Cameroun','Myanmar','Soudan'].includes(nationality)) ||
        (routeId === 'skilled_worker' && nationality === 'Afghanistan');
      return '<div style="margin:18px 0;padding:16px;border:1px solid #b9d5c4;border-radius:16px;background:#f1f8f3;color:#245c48;line-height:1.45"><strong style="display:block;margin-bottom:4px">Un visa est requis avant le voyage.</strong>' +
        (brake ? 'Attention : GOV.UK indique une restriction actuelle (« visa brake ») pour cette nationalité et ce parcours si la demande est faite depuis l’étranger. Vérifiez impérativement la page officielle avant toute démarche.' : 'Vous pouvez préparer la checklist adaptée ci-dessous, puis déposer la demande officielle sur GOV.UK.') + '</div>';
    }
    if (status === 'eta') return '<div style="margin:18px 0;padding:16px;border:1px solid #b9d5c4;border-radius:16px;background:#f1f8f3;color:#245c48;line-height:1.45"><strong style="display:block;margin-bottom:4px">Pour une visite, une ETA semble requise, pas un visa.</strong>Faites toujours la vérification officielle : votre passeport, un éventuel statut britannique ou irlandais et votre situation peuvent modifier le résultat. <a href="' + CHECK_URL + '" target="_blank" rel="noopener">Vérifier sur GOV.UK ↗</a></div>';
    if (status === 'exempt') return '<div style="margin:18px 0;padding:16px;border:1px solid #b9d5c4;border-radius:16px;background:#f1f8f3;color:#245c48;line-height:1.45"><strong style="display:block;margin-bottom:4px">Pour une visite, vous n’avez normalement besoin ni de visa ni d’ETA.</strong>Ce résultat concerne les citoyens britanniques ou irlandais. Les études, le travail et la famille relèvent d’autres règles. <a href="' + CHECK_URL + '" target="_blank" rel="noopener">Vérifier sur GOV.UK ↗</a></div>';
    return '<div style="margin:18px 0;padding:16px;border:1px solid #e2c67c;border-radius:16px;background:#fff7df;color:#58431e;line-height:1.45"><strong style="display:block;margin-bottom:4px">Vérification officielle nécessaire.</strong>Cette nationalité n’est pas encore couverte par l’orientation simplifiée de Jamlio. GOV.UK reste la source de référence. <a href="' + CHECK_URL + '" target="_blank" rel="noopener">Vérifier sur GOV.UK ↗</a></div>';
  }

  function showVisaFlow(existingJourney = null, forceNew = false) {
    const routes = window.JamlioUkVisaRoutes || [];
    if (!routes.length) return;
    const node = modal('<button class="close" aria-label="Fermer">×</button><p class="eyebrow">DEMANDER UN VISA</p><div id="visa-country-flow"></div>');
    styleModal(node);
    node.querySelector('.close').addEventListener('click', () => node.remove());
    const screen = node.querySelector('#visa-country-flow');
    const disclaimer = '<aside role="note" style="margin-top:18px;padding:14px 16px;border:1px solid #e2c67c;border-radius:16px;background:#fff7df;color:#58431e;font-size:14px;line-height:1.45"><strong style="display:block;color:#765013;margin-bottom:4px">Une aide de préparation, pas une décision de visa</strong>Jamlio rassemble les pièces et ne dépose aucune demande. La réponse et la liste finale de GOV.UK prévalent toujours.</aside>';

    const renderCountry = () => {
      screen.innerHTML =
        '<h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Dans quel pays allez-vous ?</h2><p style="color:#647069;line-height:1.5">Choisissez le pays de destination. Le Royaume-Uni est le premier parcours disponible.</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Pays de destination<select id="visa-destination" style="min-height:50px"><option value="">Sélectionnez un pays</option>' + destinations.map((country) => '<option value="' + esc(country) + '">' + esc(country) + '</option>').join('') + '</select></label>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p><button class="primary" id="visa-country-next" type="button" style="width:100%;margin-top:20px;min-height:52px">Continuer <span>→</span></button>' + disclaimer;
      screen.querySelector('#visa-country-next').addEventListener('click', () => {
        const destination = screen.querySelector('#visa-destination').value;
        const error = screen.querySelector('[data-error]');
        if (!destination) { error.textContent = 'Sélectionnez un pays pour continuer.'; error.hidden = false; return; }
        if (destination !== 'Royaume-Uni') { renderUnavailable(destination); return; }
        renderNationality();
      });
    };

    const renderUnavailable = (destination) => {
      screen.innerHTML =
        '<p class="eyebrow">BIENTÔT DISPONIBLE</p><h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">' + esc(destination) + '</h2>' +
        '<p style="color:#647069;line-height:1.5">La préparation guidée des visas pour ce pays n’est pas encore disponible. Nous commençons par le Royaume-Uni afin de vérifier soigneusement chaque source avant d’ajouter un nouveau pays.</p>' +
        '<button class="outline" id="visa-country-back" type="button" style="width:100%;min-height:52px">← Choisir un autre pays</button>';
      screen.querySelector('#visa-country-back').addEventListener('click', renderCountry);
    };

    const renderNationality = () => {
      const all = [...new Set(['Royaume-Uni','Irlande',...etaExamples,...Array.from(visaNationals).sort(),'Autre nationalité'])];
      screen.innerHTML =
        '<p class="eyebrow">ROYAUME-UNI</p><h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Quelle est votre nationalité ?</h2>' +
        '<p style="color:#647069;line-height:1.5">Indiquez la nationalité figurant sur le passeport avec lequel vous voyagerez.</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Nationalité<select id="visa-nationality" style="min-height:50px"><option value="">Sélectionnez une nationalité</option>' + all.map((country) => '<option value="' + esc(country) + '">' + esc(country) + '</option>').join('') + '</select></label>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p><div style="display:grid;gap:12px;margin-top:20px"><button class="primary" id="visa-nationality-next" type="button" style="width:100%;margin-top:0;min-height:52px">Continuer <span>→</span></button><button class="outline" id="visa-nationality-back" type="button" style="width:100%;margin-top:0;min-height:52px">← Retour</button></div>' + disclaimer;
      screen.querySelector('#visa-nationality-back').addEventListener('click', renderCountry);
      screen.querySelector('#visa-nationality-next').addEventListener('click', () => {
        const nationality = screen.querySelector('#visa-nationality').value;
        const error = screen.querySelector('[data-error]');
        if (!nationality) { error.textContent = 'Sélectionnez votre nationalité pour continuer.'; error.hidden = false; return; }
        renderPurpose(nationality);
      });
    };

    const renderPurpose = (nationality) => {
      screen.innerHTML =
        '<p class="eyebrow">ROYAUME-UNI</p><h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">Quel est votre projet ?</h2>' +
        '<p style="color:#647069;line-height:1.5">Votre nationalité est prise en compte. Choisissez maintenant le motif qui correspond le mieux.</p>' +
        '<label style="display:grid;gap:8px;margin-top:20px;font-weight:700">Motif de séjour<select id="visa-route" style="min-height:50px"><option value="">Sélectionnez un motif</option>' + routes.map((route) => '<option value="' + esc(route.id) + '">' + esc(route.label) + '</option>').join('') + '</select></label>' +
        '<p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p><div style="display:grid;gap:12px;margin-top:20px"><button class="primary" id="visa-purpose-next" type="button" style="width:100%;margin-top:0;min-height:52px">Voir ce dont j’ai besoin <span>→</span></button><button class="outline" id="visa-purpose-back" type="button" style="width:100%;margin-top:0;min-height:52px">← Retour</button></div>' + disclaimer;
      screen.querySelector('#visa-purpose-back').addEventListener('click', renderNationality);
      screen.querySelector('#visa-purpose-next').addEventListener('click', () => {
        const routeId = screen.querySelector('#visa-route').value;
        const error = screen.querySelector('[data-error]');
        if (!routeId) { error.textContent = 'Sélectionnez un motif pour continuer.'; error.hidden = false; return; }
        renderResult(nationality, routeId);
      });
    };

    const renderResult = (nationality, routeId) => {
      const route = routes.find((item) => item.id === routeId);
      const status = nationalityStatus(nationality, routeId);
      screen.innerHTML =
        '<p class="eyebrow">VOTRE ORIENTATION</p><h2 style="font:600 30px Georgia,serif;margin:8px 0 10px">' + esc(route.label) + '</h2>' +
        '<p style="color:#647069;line-height:1.5">' + esc(route.description) + '</p>' + statusCopy(status, routeId, nationality) +
        (status === 'visa' ? '<p style="color:#647069;line-height:1.5">La checklist rassemble les pièces principales et les pièces conditionnelles pour ce type de visa. Vous pourrez les retrouver dans votre coffre avant la demande officielle.</p><p data-error hidden style="color:#aa3425;font-size:13px;margin:10px 0"></p><button class="primary" id="visa-create-checklist" type="button" style="width:100%;margin-top:10px;min-height:52px">Préparer cette checklist <span>→</span></button>' : '<a class="primary" href="' + (status === 'eta' ? ETA_URL : CHECK_URL) + '" target="_blank" rel="noopener" style="display:flex;margin-top:10px;min-height:52px;align-items:center;justify-content:center">Continuer sur GOV.UK <span>↗</span></a>') +
        '<button class="outline" id="visa-result-back" type="button" style="width:100%;margin-top:12px;min-height:52px">← Modifier mes réponses</button>' + disclaimer;
      screen.querySelector('#visa-result-back').addEventListener('click', () => renderPurpose(nationality));
      if (status === 'visa') screen.querySelector('#visa-create-checklist').addEventListener('click', async () => {
        const button = screen.querySelector('#visa-create-checklist');
        const error = screen.querySelector('[data-error]');
        button.disabled = true; error.hidden = true;
        try {
          let journey = existingJourney;
          if (!journey) {
            const duplicate = typeof activeJourneyConflict === 'function' ? activeJourneyConflict('uk_visa') : null;
            if (duplicate && !forceNew) { node.remove(); resumeJourney(duplicate); return; }
            const { data, error: insertError } = await supabaseClient.from('journeys').insert({ owner_id: currentUser.id, vault_id: currentVault.id, code: 'uk_visa' }).select().single();
            if (insertError) throw insertError;
            journey = data;
          }
          const previous = journeyProfiles[journey.id]?.situation_answers || {};
          const labels = new Set(route.requirements.map((item) => item.label));
          const requirementLinks = Object.fromEntries(Object.entries(previous.requirement_links || {}).filter(([label]) => labels.has(label)));
          const { error: profileError } = await supabaseClient.from('journey_profiles').upsert({
            journey_id:journey.id,owner_id:currentUser.id,department:'',permit_category:route.label,expiry_date:null,
            situation_answers:{route:'uk_visa',uk_visa_route:route.id,destination:'Royaume-Uni',nationality,custom_title:'Visa Royaume-Uni — '+route.label,required_documents:route.requirements,requirement_links,route_guidance:['Cette liste prépare vos pièces ; elle ne dépose pas la demande.','Vérifiez toujours les exigences finales affichées par GOV.UK.']},
            source_status:'verified',official_source_url:route.sourceUrl,source_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()
          },{onConflict:'journey_id'});
          if (profileError) throw profileError;
          node.remove(); currentJourney=journey; await loadData(); showView('journeys'); $('#success').hidden=false;
          $('#success').textContent='Votre checklist de préparation est prête. Vérifiez les exigences finales sur GOV.UK avant de déposer la demande.';
          $('#demarche').scrollIntoView({behavior:'smooth',block:'start'});
        } catch (err) { error.textContent='Impossible de créer cette checklist. Réessayez dans un instant.';error.hidden=false;button.disabled=false; }
      });
    };
    renderCountry();
  }

  window.showUkVisaFlow = showVisaFlow;
  document.addEventListener('DOMContentLoaded', () => {
    const previous = showQualification;
    showQualification = function(code, existingJourney, forceNew) {
      if (code === 'uk_visa') return showVisaFlow(existingJourney || null, Boolean(forceNew));
      return previous(code, existingJourney, forceNew);
    };
  });
})();