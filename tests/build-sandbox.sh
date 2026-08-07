#!/usr/bin/env bash
# Assemble une arborescence identique à celle de Manus :
#   <racine>/routers/*.ts   <racine>/db.ts   <racine>/_core/trpc.ts
#   <racine>/../drizzle/schema.ts
# Le test valide donc aussi que le PLACEMENT des fichiers est correct.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Le bac à sable vit DANS le dépôt : Node ne suit pas les liens
# symboliques pour résoudre node_modules, il doit donc pouvoir
# remonter jusqu'à celui du projet.
SANDBOX="${1:-$REPO/.sandbox-test}"

rm -rf "$SANDBOX"
mkdir -p "$SANDBOX/app/routers" "$SANDBOX/app/_core" "$SANDBOX/app/shared" "$SANDBOX/drizzle" "$SANDBOX/app/tests"

# Fichiers backend -> routers/ (imports frères : ./rbac, ./documentPdf, …)
for f in quotesRouter invoicesRouter authRouter rbac authService authEmails \
         documentNumbering documentPdf documentWord documentExcel \
         emailService qrService; do
  cp "$REPO/$f.ts" "$SANDBOX/app/routers/$f.ts"
done

cp "$REPO/shared/documents.ts"   "$SANDBOX/app/shared/documents.ts"
cp "$REPO/shared/permissions.ts" "$SANDBOX/app/shared/permissions.ts"
cp "$REPO/shared/const.ts"       "$SANDBOX/app/shared/const.ts"
cp "$REPO/schema.ts"             "$SANDBOX/drizzle/schema.ts"
cp "$REPO/tests/integration.ts"  "$SANDBOX/app/tests/integration.ts"

# Modules fournis par la plateforme, remplacés pour le test
cat > "$SANDBOX/app/db.ts" <<'TS'
let instance: any = null;
export function __setDb(db: any) { instance = db; }
export async function getDb() { return instance; }
TS

cat > "$SANDBOX/app/_core/trpc.ts" <<'TS'
// Reproduit le contrat de la plateforme : protectedProcedure refuse
// toute requête sans utilisateur, exactement comme en production.
import { TRPCError } from "@trpc/server";
let t: any = null;
export function __init(instance: any) { t = instance; }
export const router = (...a: any[]) => t.router(...a);
export const publicProcedure: any = new Proxy({}, { get: (_, k) => (t.procedure as any)[k] });
export const protectedProcedure: any = new Proxy({}, {
  get: (_, k) => {
    const guarded = t.procedure.use(({ ctx, next }: any) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return next({ ctx });
    });
    return (guarded as any)[k];
  },
});
TS

cat > "$SANDBOX/app/tsconfig.json" <<'TS'
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": false, "skipLibCheck": true, "esModuleInterop": true,
    "baseUrl": ".", "paths": { "@shared/*": ["./shared/*"] }
  }
}
TS

echo '{"type":"module"}' > "$SANDBOX/app/package.json"
echo "$SANDBOX"
