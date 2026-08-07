#!/usr/bin/env bash
# Prépare une base de test vierge, applique la migration réelle,
# puis exécute les tests dans une arborescence identique à Manus.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${TEST_DB_NAME:-tf_int}"
USER="${TEST_DB_USER:-tf}"
PASS="${TEST_DB_PASS:-tf}"

mysql -e "DROP DATABASE IF EXISTS \`$DB\`; CREATE DATABASE \`$DB\`;
          GRANT ALL ON \`$DB\`.* TO '$USER'@'%';
          GRANT ALL ON \`$DB\`.* TO '$USER'@'localhost'; FLUSH PRIVILEGES;"

# Schéma d'origine (avant migration), pour vérifier que la migration
# s'applique bien sur une base existante.
mysql "$DB" < "$REPO/tests/fixtures/schema-before-migration.sql"
mysql "$DB" < "$REPO/db/migrations/001_devis_factures.sql" > /dev/null

bash "$REPO/tests/build-sandbox.sh" > /dev/null
cd "$REPO/.sandbox-test/app"
TEST_DATABASE_URL="mysql://$USER:$PASS@127.0.0.1/$DB" npx tsx tests/integration.ts
