# Thunderfam Group Limited – Todo

## Site Vitrine

- [x] Configurer le thème global (couleurs, typographie, variables CSS)
- [x] Ajouter les polices premium via Google Fonts (index.html)
- [x] Créer le composant Navbar responsive avec menu hamburger mobile
- [x] Créer la Hero Section avec titre, sous-titre, CTA et image de fond
- [x] Créer la section "À propos" avec informations légales UK et Côte d'Ivoire
- [x] Créer la section "Services" avec les activités du groupe
- [x] Créer la section "Contact" avec formulaire (nom, email, message) et coordonnées
- [x] Créer le Footer avec liens rapides, coordonnées et mentions légales
- [x] Connecter toutes les sections dans Home.tsx
- [x] Assurer la responsivité mobile/tablette/desktop
- [x] Ajouter les animations et transitions fluides
- [x] Écrire les tests Vitest
- [x] Sauvegarder le checkpoint final

## Phase 2 – Nouvelles fonctionnalités (pasted_content_2.txt)

### Multilingue
- [x] Système i18n avec support FR (défaut), EN, ES
- [x] Traduction de tous les menus, sections, formulaires et notifications
- [x] Sélecteur de langue dans la navbar

### Authentification étendue
- [x] Login via Manus OAuth (Google, Facebook, Apple via Manus)
- [x] Page de connexion/inscription dédiée (/auth)

### Base de données
- [x] Table `services` (catalogue complet des services)
- [x] Table `projects` (projets clients avec statut, jalons, progression)
- [x] Table `project_milestones` (jalons de projet)
- [x] Table `project_comments` (commentaires et feedback)
- [x] Table `documents` (fichiers uploadés par clients et admins)
- [x] Table `quotes` (devis générés)
- [x] Table `invoices` (factures)
- [x] Table `payments` (paiements, méthode, statut, échéancier)
- [x] Table `notifications` (notifications in-app)
- [x] Table `tickets` (tickets support)
- [x] Table `reviews` (avis clients)
- [x] Table `audit_logs` (journal d'audit)

### Portail client (/portal)
- [x] Dashboard client : projets actifs, complétés, indicateurs de progression
- [x] Sélection de services avec formulaire de demande
- [x] Suivi de projet en temps réel avec jalons et barre de progression
- [x] Gestion de documents (upload/download, stockage S3)
- [x] Notifications in-app (changement statut, tâches, paiements)
- [x] Système de tickets support

### Système de paiement
- [x] Paiement Mobile Money Afrique (Orange Money, MTN, Moov, Wave, Djamo)
- [x] Option paiement intégral (100%)
- [x] Option paiement en 3 mensualités
- [ ] Intégration Stripe complète (cartes crédit/débit) – nécessite clé API Stripe
- [ ] Génération de factures PDF

### Portail admin (/admin)
- [x] Gestion utilisateurs (liste, rôles, activation/désactivation)
- [x] Gestion projets (statut, progression, jalons)
- [x] Gestion paiements (suivi, confirmation)
- [x] Gestion services (CRUD catalogue)
- [x] Gestion factures (création)
- [x] Gestion tickets support
- [x] Rapports et analytics (revenus, paiements par méthode)
- [x] Contrôle d'accès basé sur les rôles (admin, manager, client)

### Fonctionnalités additionnelles
- [x] Système de tickets support
- [x] Stockage sécurisé des documents (S3)
- [x] Routes App.tsx mises à jour (/portal, /admin, /auth)
- [x] Navigation mise à jour avec liens portail client et admin
- [x] 16 tests Vitest passants
- [ ] Chat en direct (support) – fonctionnalité future
- [ ] Notifications email – nécessite service SMTP
- [ ] Recommandations IA de services – fonctionnalité future
- [ ] Optimisation SEO avancée (sitemap XML)

## Phase 3 – Intégration CinetPay Mobile Money

- [ ] Consulter la documentation CinetPay API v2
- [ ] Configurer les secrets CINETPAY_API_KEY et CINETPAY_SITE_ID
- [ ] Mettre à jour le schéma DB (champs cinetpayTransactionId, cinetpayPaymentUrl, webhookData)
- [ ] Implémenter le service CinetPay côté serveur (initiation paiement)
- [ ] Implémenter le webhook CinetPay pour confirmation automatique
- [ ] Mettre à jour le router payments (initiateCinetPay, cinetpayWebhook)
- [ ] Mettre à jour le portail client avec le flux de paiement CinetPay (redirection + retour)
- [ ] Tester le flux complet et sauvegarder le checkpoint


## Phase 4 – Devis et Factures

- [ ] Ajouter les tables devis et factures au schéma (déjà présentes)
- [ ] Créer le router tRPC pour devis (create, list, update, delete, generatePDF)
- [ ] Créer le router tRPC pour factures (create, list, update, delete, generatePDF)
- [ ] Implémenter la génération PDF des devis et factures (ReportLab/WeasyPrint)
- [ ] Créer l'interface UI pour créer/éditer devis
- [ ] Créer l'interface UI pour créer/éditer factures
- [ ] Ajouter la section devis/factures dans le portail client
- [ ] Ajouter la section devis/factures dans le portail admin
- [ ] Tests Vitest pour devis et factures

## Phase 5 – Avis Clients

- [ ] Ajouter la table reviews au schéma (déjà présente)
- [ ] Créer le router tRPC pour avis (create, list, update, delete, moderate)
- [ ] Créer l'interface UI pour soumettre un avis
- [ ] Créer l'interface UI pour afficher les avis (étoiles, commentaires)
- [ ] Ajouter la modération des avis dans le portail admin
- [ ] Tests Vitest pour avis

## Phase 6 – Chat en Direct

- [ ] Ajouter la table messages au schéma
- [ ] Implémenter WebSocket pour le chat temps réel
- [ ] Créer le composant Chat UI
- [ ] Ajouter le chat dans le portail client
- [ ] Ajouter le chat dans le portail admin
- [ ] Tests Vitest pour chat

## Phase 7 – Analytics et Rapports

- [ ] Créer les routers tRPC pour analytics (revenue, projects, clients, etc.)
- [ ] Créer le dashboard analytics dans le portail admin
- [ ] Ajouter les graphiques (Recharts)
- [ ] Ajouter l'export de rapports (CSV, PDF)
- [ ] Tests Vitest pour analytics

## Phase 8 – Gestion des Équipes

- [ ] Ajouter la table teams et team_members au schéma
- [ ] Créer les routers tRPC pour équipes
- [ ] Implémenter les permissions granulaires
- [ ] Créer l'interface UI pour gérer les équipes
- [ ] Tests Vitest pour équipes

## Phase 9 – API Publique

- [ ] Créer les endpoints API publics (authentification par clé API)
- [ ] Documenter l'API publique
- [ ] Implémenter les rate limits
- [ ] Tests Vitest pour API publique

## Phase 10 – Notifications Avancées

- [ ] Configurer SendGrid ou Mailgun pour email
- [ ] Implémenter les notifications email
- [ ] Implémenter les notifications SMS (Twilio)
- [ ] Implémenter les notifications push
- [ ] Tests Vitest pour notifications

## Phase 11 – Améliorations Portail Client

- [ ] Ajouter le calendrier des projets
- [ ] Ajouter le diagramme de Gantt
- [ ] Ajouter le tableau Kanban
- [ ] Tests Vitest pour améliorations

## Phase 12 – Push GitHub

- [ ] Configurer git avec le token GitHub
- [ ] Faire un commit de toutes les modifications
- [ ] Push sur main
