import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Asegura que las variables de entorno se carguen al inicializar este módulo
dotenv.config();
import { initUsuarioModel, Usuario } from '../models/Usuario';
import { initClienteModel, Cliente } from '../models/Cliente';
import { initPaqueteModel, Paquete } from '../models/Paquete';
import { initEnvioModel, Envio } from '../models/Envio';
import { initHistorialPaquetesModel, HistorialPaquetes } from '../models/HistorialPaquetes';
import { initEnviosPaquetesModel, EnviosPaquetes } from '../models/EnviosPaquetes';
import { initRefreshTokensModel, RefreshTokens } from '../models/RefreshTokens';
import { initPasswordResetTokensModel, PasswordResetTokens } from '../models/PasswordResetTokens';
import { initEmailVerificationTokensModel, EmailVerificationTokens } from '../models/EmailVerificationTokens';

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'paqueteria_app',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: false
    }
  }
);

export const initModels = () => {
  initUsuarioModel(sequelize);
  initClienteModel(sequelize);
  initPaqueteModel(sequelize);
  initEnvioModel(sequelize);
  initHistorialPaquetesModel(sequelize);
  initEnviosPaquetesModel(sequelize);
  initRefreshTokensModel(sequelize);
  initPasswordResetTokensModel(sequelize);
  initEmailVerificationTokensModel(sequelize);

  // Associations
  Paquete.belongsTo(Cliente, { foreignKey: 'paqu_cliente_id', as: 'cliente' });
  Cliente.hasMany(Paquete, { foreignKey: 'paqu_cliente_id', as: 'paquetes' });

  Envio.belongsTo(Paquete, { foreignKey: 'envi_paquete_id', as: 'paquete' });
  Paquete.hasMany(Envio, { foreignKey: 'envi_paquete_id', as: 'envios' });

  Paquete.hasMany(HistorialPaquetes, { foreignKey: 'hipa_paquete_id', as: 'historial' });
  HistorialPaquetes.belongsTo(Paquete, { foreignKey: 'hipa_paquete_id', as: 'paquete' });

  HistorialPaquetes.belongsTo(Usuario, { foreignKey: 'hipa_usuario_id', as: 'usuario' });
  Usuario.hasMany(HistorialPaquetes, { foreignKey: 'hipa_usuario_id', as: 'historial' });

  // Auth token associations
  RefreshTokens.belongsTo(Usuario, { foreignKey: 'reto_user_id', as: 'usuario' });
  PasswordResetTokens.belongsTo(Usuario, { foreignKey: 'prt_user_id', as: 'usuario' });
  EmailVerificationTokens.belongsTo(Usuario, { foreignKey: 'evt_user_id', as: 'usuario' });

  // Many-to-many: Envios <-> Paquetes
  Paquete.belongsToMany(Envio, {
    through: EnviosPaquetes,
    foreignKey: 'enpa_paquete_id',
    otherKey: 'enpa_envio_id',
    as: 'enviosRelacionados'
  });
  Envio.belongsToMany(Paquete, {
    through: EnviosPaquetes,
    foreignKey: 'enpa_envio_id',
    otherKey: 'enpa_paquete_id',
    as: 'paquetesRelacionados'
  });
};

export const models = {
  Usuario,
  Cliente,
  Paquete,
  Envio,
  HistorialPaquetes,
  EnviosPaquetes,
  RefreshTokens,
  PasswordResetTokens,
  EmailVerificationTokens
};