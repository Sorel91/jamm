# Jamm — fondation du MVP de production

## Ce que le premier produit réel fait

1. Un utilisateur crée un compte et un coffre privé.
2. Il ajoute un document et renseigne sa date d'expiration.
3. Il choisit une démarche : renouvellement de titre de séjour, passeport ou visite familiale.
4. Jamm compare les documents présents à une checklist versionnée et affiche les pièces manquantes ou périmées.
5. Il télécharge une checklist. Une version ultérieure générera un dossier ZIP.

## Ce que le produit ne fait pas

- Ne garantit pas l'acceptation d'une demande administrative.
- Ne décide pas de l'éligibilité d'une personne.
- Ne transmet pas de dossier à une administration.
- Ne collecte aucun document réel dans GitHub Pages ou dans le navigateur de démonstration.

## Données et sécurité

Les passeports, titres de séjour, actes de naissance et justificatifs de domicile sont des données hautement sensibles. Le produit de production exige :

- authentification par compte individuel ;
- autorisation vérifiée côté serveur pour chaque lecture, partage ou suppression ;
- fichiers stockés hors de la base relationnelle, dans un stockage objet privé ;
- métadonnées séparées des fichiers : propriétaire, type, date d'expiration, date de suppression ;
- chiffrement en transit et au repos fourni par l'infrastructure, puis étude d'un chiffrement applicatif avant le lancement public ;
- journal des accès, export des données et suppression complète à la demande ;
- durée de conservation explicite et aucun entraînement de modèle sur les documents ;
- tests de sécurité et revue juridique/RGPD avant ouverture aux utilisateurs.

## Modèle de données minimal

- `users` : identité du compte et préférences.
- `vaults` : coffre familial, créé par un propriétaire.
- `memberships` : accès d'un membre à un coffre avec rôle précis.
- `documents` : métadonnées seulement ; fichier, propriétaire, expiration, statut.
- `journeys` : démarche choisie et progression.
- `checklist_items` : élément de checklist, source et statut.
- `access_events` : lecture, ajout, partage, téléchargement et suppression.

## Séquence de construction

1. Connecter un fournisseur de comptes, base de données et stockage objet privé.
2. Implémenter un coffre individuel : ajout, liste, suppression et date d'expiration.
3. Ajouter la checklist de titre de séjour avec une source officielle et une date de dernière vérification.
4. Ajouter l'export de checklist puis le dossier ZIP.
5. Ajouter un partage familial à droits limités.
6. Réaliser une revue de sécurité et de conformité avant la moindre phase bêta.

## Décision technique restante

GitHub Pages convient à la démonstration publique actuelle mais ne peut pas héberger le coffre de production. Il faut connecter un backend avec authentification et stockage privé avant de recevoir de vraies données utilisateurs.
