# CLAUDE.md

Repères pour travailler sur ce dépôt. À lire avant toute modification.

---

## Particularités de ce dépôt (à connaître absolument)

**Ce dépôt est un export partiel.** Plusieurs modules référencés par
les fichiers backend n'y figurent pas : `_core/trpc`, `_core/cookies`,
`_core/notification`, `db`, `storage`. Ils sont gérés par la
plateforme Manus, hors Git. Les imports du type `../_core/trpc`,
`../db` et `../../drizzle/schema` sont donc **normaux** et ne doivent
pas être « corrigés ».

**Conséquence :** tous les fichiers backend sont listés dans
`tsconfig.json > exclude`. Tout nouveau fichier backend doit y être
ajouté, sinon `npm run build` échoue sur des modules introuvables.

**`lib/trpc.ts` est un stub.** Il renvoie un Proxy produisant des
données vides (`[]`, `0`) pour que le frontend se construise seul.
Deux pièges :

- `query.data` n'a pas la forme attendue → toujours écrire
  `query.data?.items ?? []`.
- Toute propriété inconnue renvoie un **objet Proxy non appelable**.
  `trpc.x.y.fetch?.({...})` ne lève pas d'erreur à cause du `?.` mais
  plante en `TypeError` à l'appel. Vérifier `typeof fn === "function"`
  avant d'appeler (voir `fetchDocument` dans `pages/InvoicesPage.tsx`).

**`_core/hooks/useAuth.ts` renvoie toujours `user: null`.** Ne pas en
conclure que l'authentification est cassée.

---

## Environnement

- **ESM** (`"type": "module"` dans package.json) : `__dirname` et
  `require` n'existent pas. Utiliser `process.cwd()` ou
  `import.meta.url`.
- **MySQL / MariaDB** via Drizzle (`drizzle-orm/mysql-core`), pas
  PostgreSQL.
- **Vite + React + wouter + Tailwind**. Les alias `@` et `@shared`
  doivent rester **absolus** dans `vite.config.ts` : un alias relatif
  n'est pas résolvable par Rollup depuis un fichier hors racine.
- **docx ≥ 9** exige `type: "png"` dans `ImageRun` (docx 8 le
  refusait — attention aux exemples anciens).

---

## Vérifier son travail

```bash
npm run build          # tsc --noEmit && vite build — doit rester vert
```

Le build ne couvre **que** le frontend. Les fichiers backend étant
exclus, ils ne sont jamais typés par le build : les tester
explicitement avec `npx tsx`.

Pour tester un fichier backend isolément, créer des stubs **hors du
dépôt** (par exemple `/home/db.js` et `/home/drizzle/schema.js` avec
un `package.json` `{"type":"module"}` au-dessus). Ne jamais committer
de stub.

Pour vérifier qu'une page React ne plante pas sans navigateur :

```bash
npx tsx -e 'import {renderToString} from "react-dom/server"; …'
```

---

## Module documents commerciaux

Voir `DOCS/MODULE_DEVIS_FACTURES.md` pour le détail. L'essentiel :

- **`shared/documents.ts` et `shared/permissions.ts` sont partagés**
  frontend et backend. Ne jamais dupliquer un calcul ou une règle de
  permission ailleurs — c'est précisément ce que ces fichiers
  empêchent.
- **Les montants venant du client ne sont jamais repris tels quels.**
  Toujours appeler `computeTotals()` avant écriture.
- **Le frontend masque, le backend autorise.** Toute procédure
  sensible passe par `permissionProcedure("…")` dans `rbac.ts`.
- **Le QR Code n'est pas stocké** : il est régénéré à chaque export.
  Ne pas introduire de cache — c'est ce qui garantit qu'il ne peut pas
  se désynchroniser.
- **La numérotation passe par `documentNumbering.ts`**, jamais par un
  `SELECT MAX(...) + 1` (condition de course).

---

## Pièges déjà rencontrés

| Symptôme | Cause |
|---|---|
| `__dirname is not defined` | Projet en ESM |
| `Could not load ./shared/...` | Alias Vite relatif au lieu d'absolu |
| `IImageOptions` : `type` manquant | docx ≥ 9 l'exige |
| « soixante-onze » | En français, 71 s'écrit « soixante **et** onze » (mais 81 et 91 n'ont pas de « et ») |
| Build cassé après ajout backend | Fichier non ajouté à `tsconfig > exclude` |

---

## Langue

Le produit est francophone (Côte d'Ivoire / Mali). Interface,
messages d'erreur, commentaires de code et messages de commit sont
rédigés **en français**.
