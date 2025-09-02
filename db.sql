DROP DATABASE IF EXISTS paqueteria_app;
CREATE DATABASE IF NOT EXISTS paqueteria_app;
USE paqueteria_app;

CREATE TABLE IF NOT EXISTS Usuarios (
  usua_id INT AUTO_INCREMENT PRIMARY KEY,
  usua_nombre VARCHAR(100) NOT NULL,
  usua_rol ENUM('admin','empleado','chofer','operador') NOT NULL,
  usua_email VARCHAR(100) NOT NULL UNIQUE,
  usua_password_hash TEXT NOT NULL,
  usua_activo TINYINT(1) NOT NULL DEFAULT 1,
  usua_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  usua_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Clientes (
  clie_id INT AUTO_INCREMENT PRIMARY KEY,
  clie_nombre VARCHAR(100) NOT NULL,
  clie_email VARCHAR(100),
  clie_telefono VARCHAR(20),
  clie_direccion TEXT,
  clie_activo TINYINT(1) NOT NULL DEFAULT 1,
  clie_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  clie_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Paquetes (
  paqu_id INT AUTO_INCREMENT PRIMARY KEY,
  paqu_cliente_id INT NULL,
  paqu_descripcion TEXT NULL,
  paqu_peso DECIMAL(10,2) NULL,
  paqu_dimensiones VARCHAR(50) NULL,
  paqu_valor_declarado DECIMAL(10,2) NULL,
  paqu_direccion_origen TEXT NULL,
  paqu_direccion_destino TEXT NULL,
  paqu_estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  paqu_numero_seguimiento VARCHAR(191) NOT NULL,
  paqu_codigo_rastreo VARCHAR(191) NULL,
  paqu_codigo_rastreo_publico VARCHAR(191) NULL,
  paqu_activo TINYINT(1) NOT NULL DEFAULT 1,
  paqu_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  paqu_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_paqu_numseg UNIQUE (paqu_numero_seguimiento),
  CONSTRAINT uq_paqu_codrastreo UNIQUE (paqu_codigo_rastreo),
  CONSTRAINT fk_paquetes_cliente FOREIGN KEY (paqu_cliente_id) REFERENCES Clientes(clie_id)
);

CREATE TABLE IF NOT EXISTS Envios (
  envi_id INT AUTO_INCREMENT PRIMARY KEY,
  envi_paquete_id INT NULL,
  envi_direccion_origen TEXT NULL,
  envi_direccion_destino TEXT NULL,
  envi_estado VARCHAR(50) NOT NULL DEFAULT 'en_transito',
  envi_fecha_envio_estimada DATETIME NULL,
  envi_fecha_entrega_real DATETIME NULL,
  envi_activo TINYINT(1) NOT NULL DEFAULT 1,
  envi_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  envi_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_envios_paquete FOREIGN KEY (envi_paquete_id) REFERENCES Paquetes(paqu_id)
);

CREATE TABLE IF NOT EXISTS EnviosPaquetes (
  enpa_envio_id INT NOT NULL,
  enpa_paquete_id INT NOT NULL,
  enpa_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (enpa_envio_id, enpa_paquete_id),
  KEY idx_ep_envio (enpa_envio_id),
  KEY idx_ep_paquete (enpa_paquete_id),
  CONSTRAINT fk_ep_envio FOREIGN KEY (enpa_envio_id) REFERENCES Envios(envi_id),
  CONSTRAINT fk_ep_paquete FOREIGN KEY (enpa_paquete_id) REFERENCES Paquetes(paqu_id)
);

CREATE TABLE IF NOT EXISTS HistorialPaquetes (
  hipa_id INT AUTO_INCREMENT PRIMARY KEY,
  hipa_paquete_id INT NOT NULL,
  hipa_estado_anterior VARCHAR(50) NULL,
  hipa_estado_nuevo VARCHAR(50) NOT NULL,
  hipa_comentario TEXT NULL,
  hipa_usuario_id INT NULL,
  hipa_fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hp_paquete (hipa_paquete_id),
  KEY idx_hp_fecha (hipa_fecha_cambio),
  FOREIGN KEY (hipa_paquete_id) REFERENCES Paquetes(paqu_id),
  FOREIGN KEY (hipa_usuario_id) REFERENCES Usuarios(usua_id)
);

CREATE TABLE IF NOT EXISTS RefreshTokens (
  reto_token_id VARCHAR(36) PRIMARY KEY,
  reto_user_id INT NOT NULL,
  reto_revoked TINYINT(1) NOT NULL DEFAULT 0,
  reto_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reto_user_id) REFERENCES Usuarios(usua_id),
  KEY idx_refresh_user (reto_user_id),
  KEY idx_refresh_revoked (reto_revoked)
);

CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  prt_token_id VARCHAR(36) PRIMARY KEY,
  prt_user_id INT NOT NULL,
  prt_used TINYINT(1) NOT NULL DEFAULT 0,
  prt_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prt_user_id) REFERENCES Usuarios(usua_id),
  KEY idx_prt_user (prt_user_id),
  KEY idx_prt_used (prt_used)
);

CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
  evt_token_id VARCHAR(36) PRIMARY KEY,
  evt_user_id INT NOT NULL,
  evt_used TINYINT(1) NOT NULL DEFAULT 0,
  evt_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evt_user_id) REFERENCES Usuarios(usua_id),
  KEY idx_evt_user (evt_user_id),
  KEY idx_evt_used (evt_used)
);

INSERT INTO Usuarios (usua_nombre, usua_rol, usua_email, usua_password_hash, usua_activo)
VALUES ('Admin', 'admin', 'admin@paqueteria.com', '$2a$10$xj9xKEuc0AcYL1nMfZr.Ve9b86hsxoBMhBTMlWoVVCQKqLS5c7uv.', 1)
ON DUPLICATE KEY UPDATE usua_password_hash = VALUES(usua_password_hash), usua_activo = 1;

SELECT * FROM Paquetes