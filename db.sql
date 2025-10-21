DROP DATABASE IF EXISTS paqueteria_app;
CREATE DATABASE IF NOT EXISTS paqueteria_app;
USE paqueteria_app;

CREATE TABLE IF NOT EXISTS Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  user_role ENUM('admin','employee','driver','operator') NOT NULL,
  user_email VARCHAR(100) NOT NULL UNIQUE,
  user_password_hash TEXT NOT NULL,
  user_is_active TINYINT(1) NOT NULL DEFAULT 1,
  user_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  user_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Clients (
  clie_id INT AUTO_INCREMENT PRIMARY KEY,
  clie_name VARCHAR(100) NOT NULL,
  clie_email VARCHAR(100),
  clie_phone VARCHAR(20),
  clie_address TEXT,
  clie_is_active TINYINT(1) NOT NULL DEFAULT 1,
  clie_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  clie_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Packages (
  pack_id INT AUTO_INCREMENT PRIMARY KEY,
  pack_clie_id INT NULL,
  pack_sender_name VARCHAR(255) NULL,
  pack_sender_email VARCHAR(255) NULL,
  pack_sender_phone VARCHAR(20) NULL,
  pack_sender_address TEXT NULL,
  pack_recipient_name VARCHAR(255) NULL,
  pack_recipient_email VARCHAR(255) NULL,
  pack_recipient_phone VARCHAR(20) NULL,
  pack_recipient_address TEXT NULL,
  pack_description TEXT NULL,
  pack_weight DECIMAL(10,2) NULL,
  pack_dimensions VARCHAR(50) NULL,
  pack_declared_value DECIMAL(10,2) NULL,
  pack_origin_address TEXT NULL,
  pack_destination_address TEXT NULL,
  pack_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  pack_tracking_number VARCHAR(191) NOT NULL,
  pack_tracking_code VARCHAR(191) NULL,
  pack_public_tracking_code VARCHAR(191) NULL,
  pack_real_delivery_date DATETIME NULL,
  pack_is_active TINYINT(1) NOT NULL DEFAULT 1,
  pack_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  pack_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pack_estimated_delivery_date DATETIME NULL,
  
  pack_quantity INT NULL,
  CONSTRAINT uq_pack_tracking_number UNIQUE (pack_tracking_number),
  CONSTRAINT uq_pack_tracking_code UNIQUE (pack_tracking_code),
  CONSTRAINT fk_packages_client FOREIGN KEY (pack_clie_id) REFERENCES Clients(clie_id)
);

CREATE TABLE IF NOT EXISTS Shipments (
  ship_id INT AUTO_INCREMENT PRIMARY KEY,
  ship_package_id INT NULL,
  ship_origin_address TEXT NULL,
  ship_destination_address TEXT NULL,
  ship_status VARCHAR(50) NOT NULL DEFAULT 'in_transit',
  ship_estimated_delivery_date DATETIME NULL,
  ship_real_delivery_date DATETIME NULL,
  ship_is_active TINYINT(1) NOT NULL DEFAULT 1,
  ship_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ship_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_package FOREIGN KEY (ship_package_id) REFERENCES Packages(pack_id)
);

CREATE TABLE IF NOT EXISTS ShipmentPackages (
  shpa_shipment_id INT NOT NULL,
  shpa_package_id INT NOT NULL,
  shpa_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shpa_shipment_id, shpa_package_id),
  KEY idx_shpa_shipment (shpa_shipment_id),
  KEY idx_shpa_package (shpa_package_id),
  CONSTRAINT fk_shpa_shipment FOREIGN KEY (shpa_shipment_id) REFERENCES Shipments(ship_id),
  CONSTRAINT fk_shpa_package FOREIGN KEY (shpa_package_id) REFERENCES Packages(pack_id)
);

CREATE TABLE IF NOT EXISTS PackageHistory (
  pahi_id INT AUTO_INCREMENT PRIMARY KEY,
  pahi_package_id INT NOT NULL,
  pahi_previous_status VARCHAR(50) NULL,
  pahi_new_status VARCHAR(50) NOT NULL,
  pahi_comment TEXT NULL,
  pahi_user_id INT NULL,
  pahi_change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pahi_package (pahi_package_id),
  KEY idx_pahi_date (pahi_change_date),
  FOREIGN KEY (pahi_package_id) REFERENCES Packages(pack_id),
  FOREIGN KEY (pahi_user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS RefreshTokens (
  reft_token_id VARCHAR(36) PRIMARY KEY,
  reft_user_id INT NOT NULL,
  reft_revoked TINYINT(1) NOT NULL DEFAULT 0,
  reft_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reft_user_id) REFERENCES Users(user_id),
  KEY idx_reft_user (reft_user_id),
  KEY idx_reft_revoked (reft_revoked)
);

CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  part_token_id VARCHAR(36) PRIMARY KEY,
  part_user_id INT NOT NULL,
  part_is_used TINYINT(1) NOT NULL DEFAULT 0,
  part_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (part_user_id) REFERENCES Users(user_id),
  KEY idx_part_user (part_user_id),
  KEY idx_part_is_used (part_is_used)
);

CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
  emve_token_id VARCHAR(36) PRIMARY KEY,
  emve_user_id INT NOT NULL,
  emve_is_used TINYINT(1) NOT NULL DEFAULT 0,
  emve_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emve_user_id) REFERENCES Users(user_id),
  KEY idx_emve_user (emve_user_id),
  KEY idx_emve_is_used (emve_is_used)
);

INSERT INTO Users (user_name, user_role, user_email, user_password_hash, user_is_active)
VALUES ('Admin', 'admin', 'admin@paqueteria.com', '$2a$10$xj9xKEuc0AcYL1nMfZr.Ve9b86hsxoBMhBTMlWoVVCQKqLS5c7uv.', 1)
ON DUPLICATE KEY UPDATE user_password_hash = VALUES(user_password_hash), user_is_active = 1;

SELECT * FROM Users;
SELECT * FROM Packages;
SELECT * FROM Shipments;
SELECT * FROM ShipmentPackages;
SELECT * FROM PackageHistory;
SELECT * FROM RefreshTokens;
SELECT * FROM PasswordResetTokens;
SELECT * FROM EmailVerificationTokens;