-- Schéma tel qu'il existe AVANT la migration, reproduit d'après
-- schema.ts d'origine. Permet de vérifier que la migration s'applique
-- correctement sur une base déjà en service.
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY, openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT, email VARCHAR(320), loginMethod VARCHAR(64),
  role ENUM('user','admin','manager') NOT NULL DEFAULT 'user',
  phone VARCHAR(32), country VARCHAR(64), isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE quotes (
  id INT AUTO_INCREMENT PRIMARY KEY, quoteNumber VARCHAR(32) NOT NULL UNIQUE,
  userId INT NOT NULL, serviceId INT NULL, title VARCHAR(256) NOT NULL,
  description TEXT, items JSON,
  subtotal DECIMAL(10,2) NOT NULL, tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL, currency VARCHAR(8) DEFAULT 'EUR',
  status ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  validUntil TIMESTAMP NULL, notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY, invoiceNumber VARCHAR(32) NOT NULL UNIQUE,
  quoteId INT, projectId INT NULL, userId INT NOT NULL,
  title VARCHAR(256), description TEXT, items JSON,
  subtotal DECIMAL(10,2), tax DECIMAL(10,2), total DECIMAL(10,2),
  currency VARCHAR(8) DEFAULT 'EUR',
  status ENUM('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
  dueDate TIMESTAMP NULL, paidAt TIMESTAMP NULL, notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);

INSERT INTO users (openId,name,email,role) VALUES
  ('local:admin','Admin TGL','admin@thunderfam.com','admin'),
  ('local:mgr','Agent Commercial','agent@thunderfam.com','manager'),
  ('local:cli','Awa Kone','awa@client.ci','user'),
  ('local:cli2','Bob Traore','bob@client.ci','user');
