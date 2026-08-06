-- ============================================================
-- Migration 001 — Module devis / factures + authentification
--
-- Base : MySQL 8 / MariaDB 10.5+
-- Idempotente : réexécutable sans erreur (voir la procédure
-- add_column_if_missing ci-dessous).
--
-- ⚠️ SAUVEGARDEZ LA BASE AVANT EXÉCUTION :
--    mysqldump -u <user> -p <base> > sauvegarde_avant_migration.sql
--
-- Exécution :
--    mysql -u <user> -p <base> < db/migrations/001_devis_factures.sql
-- ============================================================

-- ------------------------------------------------------------
-- Utilitaire : ajouter une colonne seulement si elle n'existe pas.
-- (MySQL ne connaît pas ADD COLUMN IF NOT EXISTS avant 8.0.29.)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- 1. DEVIS (quotes)
-- ------------------------------------------------------------
CALL add_column_if_missing('quotes', 'clientName',        'VARCHAR(256) NULL');
CALL add_column_if_missing('quotes', 'clientAddress',     'TEXT NULL');
CALL add_column_if_missing('quotes', 'clientEmail',       'VARCHAR(320) NULL');
CALL add_column_if_missing('quotes', 'discountTotal',     'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL add_column_if_missing('quotes', 'amountInWords',     'TEXT NULL');
CALL add_column_if_missing('quotes', 'clientSignature',   'TEXT NULL');
CALL add_column_if_missing('quotes', 'managerSignature',  'TEXT NULL');
CALL add_column_if_missing('quotes', 'companyStamp',      'TEXT NULL');
CALL add_column_if_missing('quotes', 'signedAt',          'TIMESTAMP NULL');
CALL add_column_if_missing('quotes', 'paidAt',            'TIMESTAMP NULL');
CALL add_column_if_missing('quotes', 'generatedInvoiceId','INT NULL');

-- Ajoute la valeur 'paid' à l'enum de statut, sans perdre les autres.
ALTER TABLE quotes
  MODIFY COLUMN status ENUM('draft','sent','accepted','rejected','expired','paid')
  NOT NULL DEFAULT 'draft';

-- ------------------------------------------------------------
-- 2. FACTURES (invoices)
-- ------------------------------------------------------------
CALL add_column_if_missing('invoices', 'clientName',       'VARCHAR(256) NULL');
CALL add_column_if_missing('invoices', 'clientAddress',    'TEXT NULL');
CALL add_column_if_missing('invoices', 'clientEmail',      'VARCHAR(320) NULL');
CALL add_column_if_missing('invoices', 'discountTotal',    'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL add_column_if_missing('invoices', 'amountInWords',    'TEXT NULL');
CALL add_column_if_missing('invoices', 'clientSignature',  'TEXT NULL');
CALL add_column_if_missing('invoices', 'managerSignature', 'TEXT NULL');
CALL add_column_if_missing('invoices', 'companyStamp',     'TEXT NULL');
CALL add_column_if_missing('invoices', 'amountPaid',       'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL add_column_if_missing('invoices', 'paymentStatus',
  "ENUM('pending','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'pending'");
CALL add_column_if_missing('invoices', 'lastReminderAt',   'TIMESTAMP NULL');
CALL add_column_if_missing('invoices', 'reminderCount',    'INT NOT NULL DEFAULT 0');

-- ------------------------------------------------------------
-- 3. UTILISATEURS — authentification par mot de passe
-- ------------------------------------------------------------
CALL add_column_if_missing('users', 'passwordHash',        'VARCHAR(255) NULL');
CALL add_column_if_missing('users', 'emailVerified',       'BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('users', 'failedLoginAttempts', 'INT NOT NULL DEFAULT 0');
CALL add_column_if_missing('users', 'lockedUntil',         'TIMESTAMP NULL');

-- ------------------------------------------------------------
-- 4. NUMÉROTATION ATOMIQUE
--
-- L'index unique (prefix, year) est INDISPENSABLE : c'est lui qui
-- fait que deux créations simultanées ne peuvent pas obtenir le
-- même numéro. Sans lui, la numérotation n'est plus garantie.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_counters (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  prefix     VARCHAR(32) NOT NULL,
  year       INT NOT NULL,
  counter    INT NOT NULL DEFAULT 0,
  updatedAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_prefix_year (prefix, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. SIGNATURES ENREGISTRÉES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_signatures (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  userId       INT NOT NULL,
  label        VARCHAR(128) NOT NULL,
  imageBase64  MEDIUMTEXT NOT NULL,
  type         ENUM('signature','stamp') NOT NULL DEFAULT 'signature',
  isDefault    BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_signatures_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. SESSIONS ET JETONS
--
-- Seul le HASH du refresh token est stocké : une fuite de la base
-- ne permet donc pas de rejouer les sessions.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  userId            INT NOT NULL,
  refreshTokenHash  VARCHAR(128) NOT NULL,
  userAgent         VARCHAR(512) NULL,
  ipAddress         VARCHAR(64) NULL,
  expiresAt         TIMESTAMP NOT NULL,
  revokedAt         TIMESTAMP NULL,
  createdAt         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_refresh_hash (refreshTokenHash),
  KEY idx_sessions_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  userId     INT NOT NULL,
  tokenHash  VARCHAR(128) NOT NULL,
  purpose    ENUM('password_reset','email_verification') NOT NULL,
  expiresAt  TIMESTAMP NOT NULL,
  usedAt     TIMESTAMP NULL,
  createdAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_token_hash (tokenHash),
  KEY idx_tokens_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. JOURNAL D'AUDIT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId     INT NULL,
  email      VARCHAR(320) NULL,
  event      ENUM('login_success','login_failed','logout','register',
                  'password_reset_requested','password_reset_completed',
                  'email_verified','account_locked','permission_denied') NOT NULL,
  ipAddress  VARCHAR(64) NULL,
  userAgent  VARCHAR(512) NULL,
  detail     TEXT NULL,
  createdAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (userId),
  KEY idx_audit_event (event, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Nettoyage
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_column_if_missing;

-- ------------------------------------------------------------
-- Vérification post-migration (doit renvoyer 5 lignes)
-- ------------------------------------------------------------
SELECT TABLE_NAME AS 'Tables créées'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('document_counters','saved_signatures',
                     'auth_sessions','auth_tokens','auth_audit_log')
ORDER BY TABLE_NAME;
