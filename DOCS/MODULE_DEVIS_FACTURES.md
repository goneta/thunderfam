# Module de gestion documentaire — Devis & Factures

Module de création, calcul, signature, export et suivi des documents
commerciaux de Thunderfam Group Limited Côte d'Ivoire (TGL-CI).

---

## 1. État réel de ce module

**Ce qui est écrit, testé et fonctionnel :**

| Composant | Vérification |
|---|---|
| Calculs (HT, remises, TVA, TTC) + montant en lettres + QR | 25/25 tests |
| bcrypt, JWT, matrice RBAC | 24/24 tests |
| Numérotation atomique | 60 connexions simultanées → 0 doublon (MySQL réel) |
| Conversion devis → facture | 16/16 tests (MySQL réel) |
| PDF devis + facture | Rendu vérifié visuellement |
| Word (.docx) | Rendu vérifié, cohérent avec le PDF |
| Signatures + cachet | Intégrés et visibles dans PDF **et** Word |
| QR Code | Décodé avec succès, JSON conforme |
| Excel (.xlsx) | Généré avec ligne de total |
| E-mail | Réellement envoyé via SMTP, PJ PDF + Word |
| Pages React | Rendues sans erreur, colonnes vérifiées |
| **Routeurs tRPC (bout en bout)** | **28 tests d'intégration sur MySQL réel** |

**Ce qui reste à faire avant la production :**

- ~~Câblage des routeurs~~ — **fait** : `quotes`, `invoices` et
  `authLocal` sont montés dans `routers.ts`. `authLocal` est
  volontairement distinct de `auth`, réservé à l'OAuth existant :
  les deux méthodes de connexion coexistent.
- **Migration de base** : `db/migrations/001_devis_factures.sql` est
  prête et testée (exécutée deux fois sur une réplique du schéma, sans
  perte de données), mais **n'a pas été appliquée sur votre base**.
  Rien ne fonctionnera avant. Sauvegardez d'abord.
- ~~Authentification~~ — **fait** : `authRouter.ts` expose 9
  procédures (inscription, connexion, rafraîchissement, déconnexion,
  mot de passe oublié, réinitialisation, vérification d'e-mail, renvoi
  de vérification, changement de mot de passe), avec les écrans
  correspondants (`/connexion`, `/auth/reinitialiser`,
  `/auth/verifier-email`).
- ~~Vérification e-mail et réinitialisation~~ — **fait** :
  `authEmails.ts` envoie les trois messages, testés par capture SMTP.
- **Variables d'environnement** : `JWT_SECRET` et la configuration SMTP
  doivent être renseignées, sinon l'authentification et l'envoi
  d'e-mail refusent de démarrer (volontairement — voir §4).
- **Le client tRPC de ce dépôt est un stub** (`lib/trpc.ts` renvoie des
  données vides). Les pages s'affichent mais ne montrent aucune donnée
  tant qu'elles ne tournent pas contre le vrai backend Manus.

---

## 2. Architecture

```
shared/
  documents.ts        Calculs, montant en lettres, contenu du QR Code
  permissions.ts      Matrice RBAC

  ↑ partagés frontend + backend : une seule source de vérité

Backend (exclus du build frontend, comme vos routeurs existants)
  documentNumbering.ts   Numérotation atomique DEV-/FAC-
  documentPdf.ts         Générateur PDF (devis ET factures)
  documentWord.ts        Générateur Word
  documentExcel.ts       Export de listes
  qrService.ts           QR Code
  emailService.ts        Envoi SMTP
  authService.ts         bcrypt, JWT, sessions, jetons, audit
  rbac.ts                Middleware d'autorisation tRPC
  quotesRouter.ts        Routeur devis
  invoicesRouter.ts      Routeur factures

Frontend
  pages/QuoteEditor.tsx     Éditeur (glisser-déposer, signature)
  pages/QuotesPage.tsx      Liste des devis
  pages/InvoicesPage.tsx    Liste des factures
  components/SignaturePad.tsx
```

### Principe directeur : une seule source de vérité

`shared/documents.ts` contient la logique de calcul utilisée **à la
fois** par le frontend (aperçu instantané) et le backend (recalcul
avant écriture). Il n'existe pas deux implémentations qui pourraient
diverger.

Corollaire de sécurité : **les totaux envoyés par le client ne sont
jamais repris tels quels**. `computeTotals()` recalcule tout avant
chaque écriture, donc un client forgé ne peut pas imposer un total
de 1 FCFA.

Même principe pour `shared/permissions.ts` : le frontend l'utilise
pour *masquer*, le backend pour *autoriser*. Le masquage n'est pas une
protection — la décision réelle est prise dans `rbac.ts`.

---

## 3. QR Code

Positionné **au-dessus du numéro de document**, dans le PDF comme dans
le Word. Contenu JSON :

```json
{
  "company": "THUNDERFAM GROUP LIMITED CÔTE D'IVOIRE (TGL-CI)",
  "rccm": "CI-ABJ-03-2024-B22-00006",
  "invoiceNumber": "DEV-TGL-CI-2026-000001",
  "client": "Inter Logistique & Transport",
  "createdAt": "2026-08-05",
  "totalAmount": 875000000,
  "currency": "FCFA"
}
```

**Le QR n'est ni stocké ni mis en cache** : il est régénéré à chaque
export à partir des données courantes du document. Il n'y a donc rien
à invalider lors d'une modification — la mise à jour est automatique
par construction, et une désynchronisation est impossible.

---

## 4. Sécurité

- **Mots de passe** : bcrypt, coût 12. Minimum 10 caractères avec
  lettre et chiffre.
- **Access token** : JWT de 15 minutes, non persisté.
- **Refresh token** : 32 octets aléatoires, dont seul le SHA-256 est
  stocké. Une fuite de la base ne permet pas de rejouer les sessions.
  Rotation à chaque rafraîchissement : un jeton volé devient inutile
  dès que le titulaire légitime rafraîchit.
- **Verrouillage** : 15 minutes après 5 échecs consécutifs.
- **Audit** : connexions, échecs, réinitialisations et refus de
  permission sont journalisés dans `auth_audit_log`.
- **JWT_SECRET** : l'application **refuse de signer** si le secret est
  absent ou fait moins de 32 caractères. C'est délibéré : un secret
  faible compromettrait toutes les sessions.

  ```bash
  openssl rand -base64 48   # génère un secret convenable
  ```

- **Fuite d'information** : accéder au document d'un tiers renvoie
  `NOT_FOUND`, pas `FORBIDDEN` — pour ne pas révéler son existence.

### Rôles

| Rôle | Portée |
|---|---|
| `user` | Consulte uniquement **ses** devis et factures (vue lecture seule) |
| `manager` | Crée et modifie devis et clients, envoie, signe, convertit en facture |
| `admin` | Accès complet, administration et journal d'audit |

Un `manager` ne peut ni supprimer un devis ni gérer les utilisateurs.

L'interface s'aligne sur cette matrice : `/devis/:id` affiche
l'éditeur ou une vue en lecture seule selon `quotes:update`
(voir `pages/QuoteRoute.tsx`). Ce n'est pas une protection — le
cloisonnement réel est appliqué par les routeurs — mais une cohérence :
on ne montre pas une action que le serveur refuserait.

---

## 5. Migration de base de données

Les colonnes et tables suivantes sont nécessaires. **Elles n'ont pas
été appliquées** — à faire via votre outil de migration Drizzle.

Sur `quotes` : `clientName`, `clientAddress`, `clientEmail`,
`discountTotal`, `amountInWords`, `clientSignature`,
`managerSignature`, `companyStamp`, `signedAt`, `paidAt`,
`generatedInvoiceId`, et la valeur `paid` sur l'enum `status`.

Sur `invoices` : mêmes colonnes de snapshot et de signature, plus
`amountPaid`, `paymentStatus`, `lastReminderAt`, `reminderCount`.

Sur `users` : `passwordHash`, `emailVerified`, `failedLoginAttempts`,
`lockedUntil`.

Nouvelles tables : `document_counters`, `saved_signatures`,
`auth_sessions`, `auth_tokens`, `auth_audit_log`.

### Numérotation atomique

`document_counters` doit impérativement porter un index unique :

```sql
ALTER TABLE document_counters ADD UNIQUE KEY uk_prefix_year (prefix, year);
```

L'incrément repose sur `UPDATE ... SET counter = LAST_INSERT_ID(counter + 1)`.
MySQL sérialise les écritures concurrentes sur une même ligne, et
`LAST_INSERT_ID()` est propre à la connexion : deux créations
simultanées ne peuvent donc pas obtenir le même numéro. Validé par un
test de charge à 60 connexions parallèles (0 doublon, séquence 1→60
sans trou).

Formats : `DEV-TGL-CI-2026-000001` et `FAC-TGL-CI-2026-000001`, avec
des séquences **distinctes**.

---

## 5 bis. Tests d'intégration

```bash
npm run test:integration
```

Ces tests appellent les **vraies** procédures via `createCaller`, pas
une copie de la logique : ils couvrent donc aussi le contrôle d'accès,
la validation Zod et le recalcul serveur des montants.

Ils s'exécutent dans une arborescence reproduisant celle de Manus
(`routers/`, `_core/`, `../../drizzle/schema`) et valident donc aussi
le **placement** des fichiers. La base est recréée depuis le schéma
d'avant migration, ce qui vérifie au passage que la migration
s'applique correctement à une base déjà en service.

Deux bugs bloquants ont été trouvés par ces tests, invisibles en
tests unitaires :

1. **Montants plafonnés à ~100 millions.** Les colonnes étaient en
   `DECIMAL(10,2)`, soit un maximum de 99 999 999,99. Convenable en
   euros, rédhibitoire en FCFA : un devis de transport de
   878 000 000 FCFA était rejeté par MySQL. Corrigé en
   `DECIMAL(18,2)`.
2. **Numéros dupliqués sous charge.** L'incrément par
   `LAST_INSERT_ID(counter+1)` puis `SELECT` n'est atomique que si
   chaque appel dispose de sa propre connexion. Sur une connexion
   partagée, deux appels concurrents obtenaient le même numéro.
   Remplacé par une transaction avec `SELECT ... FOR UPDATE`.

⚠️ **La numérotation suppose un pool de connexions** (le cas en
production). Sur une connexion unique partagée, les transactions
concurrentes ne peuvent pas s'isoler.

## 6. Câblage des routeurs

Dans `routers.ts` :

```ts
import { quotesRouter } from "./routers/quotesRouter";
import { invoicesRouter } from "./routers/invoicesRouter";

export const appRouter = router({
  // … routeurs existants
  quotes: quotesRouter,
  invoices: invoicesRouter,
});
```

Les fichiers de ce dépôt sont à la racine ; côté Manus, ils vont dans
`routers/` comme vos routeurs existants. Les imports (`../_core/trpc`,
`../db`, `../../drizzle/schema`) suivent déjà cette convention.

---

## 7. Variables d'environnement

```bash
JWT_SECRET=                 # ≥ 32 caractères (openssl rand -base64 48)

SMTP_HOST=                  # sans lui, l'envoi d'e-mail est refusé
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Thunderfam Group <devis@thunderfam.com>"

THUNDERFAM_LOGO_PATH=       # optionnel, si le logo n'est pas à la racine
```

---

## 8. Transformation devis → facture

Déclenchée par `quotes.markPaidAndInvoice` :

1. Le devis passe au statut `paid`.
2. Une facture est créée avec **toutes** les données du devis : client,
   lignes, montants, taxes, conditions, signatures. Aucune ressaisie.
3. La facture reçoit son propre numéro (`FAC-…`), séquence distincte.
4. Le lien est bidirectionnel : `invoices.quoteId` et
   `quotes.generatedInvoiceId`.

**Idempotent** : deux clics ne produisent pas deux factures — un devis
déjà facturé renvoie la facture existante.

Garde-fous comptables : un devis facturé n'est plus modifiable, et un
devis ayant généré une facture ne peut plus être supprimé.

---

## 9. Extension vers d'autres documents

Les générateurs PDF et Word prennent un type `CommercialDocument` dont
le champ `kind` ne change que le titre et quelques libellés. Ajouter un
bon de commande, un bon de livraison ou un avoir demande donc :

1. une valeur de plus sur `kind` ;
2. un préfixe de numérotation (`nextDocumentNumber("BC-TGL-CI")`) ;
3. un routeur reprenant le modèle de `invoicesRouter.ts`.

Aucun des calculs, ni le QR, ni les exports, ni la logique de signature
n'est à dupliquer.

Le suivi comptable est déjà amorcé : `amountPaid`, `paymentStatus`,
`lastReminderAt` et `reminderCount` permettent d'ajouter paiements
partiels (déjà géré par `recordPayment`), relances et échéances sans
refonte.
