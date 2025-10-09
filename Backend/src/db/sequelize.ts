import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Asegura que las variables de entorno se carguen al inicializar este módulo
dotenv.config();
import { initUserModel, User } from '../models/User';
import { initClientModel, Client } from '../models/Client';
import { initPaqueteModel, Paquete } from '../models/Paquete';
import { initEnvioModel, Envio } from '../models/Envio';
import { initPackageHistoryModel, PackageHistory } from '../models/PackageHistory';
import { initEnviosPaquetesModel, EnviosPaquetes } from '../models/EnviosPaquetes';
import { initRefreshTokenModel, RefreshToken } from '../models/RefreshToken';
import { initPasswordResetTokenModel, PasswordResetToken } from '../models/PasswordResetToken';
import { initEmailVerificationTokenModel, EmailVerificationToken } from '../models/EmailVerificationToken';

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
  initUserModel(sequelize);
  initClientModel(sequelize);
  initPaqueteModel(sequelize);
  initEnvioModel(sequelize);
  initPackageHistoryModel(sequelize);
  initEnviosPaquetesModel(sequelize);
  initRefreshTokenModel(sequelize);
  initPasswordResetTokenModel(sequelize);
  initEmailVerificationTokenModel(sequelize);

  // Associations
  Paquete.belongsTo(Client, { foreignKey: 'paqu_cliente_id', as: 'cliente' });
  Client.hasMany(Paquete, { foreignKey: 'paqu_cliente_id', as: 'paquetes' });

  Envio.belongsTo(Paquete, { foreignKey: 'envi_paquete_id', as: 'paquete' });
  Paquete.hasMany(Envio, { foreignKey: 'envi_paquete_id', as: 'envios' });

  initPackageHistoryModel(sequelize);
  Paquete.hasMany(PackageHistory, { foreignKey: 'pahi_package_id', as: 'historial' });
  PackageHistory.belongsTo(Paquete, { foreignKey: 'pahi_package_id', as: 'paquete' });
  PackageHistory.belongsTo(User, { foreignKey: 'pahi_user_id', as: 'usuario' });
  User.hasMany(PackageHistory, { foreignKey: 'pahi_user_id', as: 'historial' });

  // Auth token associations
  RefreshToken.belongsTo(User, { foreignKey: 'reft_user_id', as: 'usuario' });
  PasswordResetToken.belongsTo(User, { foreignKey: 'part_user_id', as: 'usuario' });
  EmailVerificationToken.belongsTo(User, { foreignKey: 'evt_user_id', as: 'usuario' });

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
  User,
  Client,
  Paquete,
  Envio,
  PackageHistory,
  EnviosPaquetes,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken
};