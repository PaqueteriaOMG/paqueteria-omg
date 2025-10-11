import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Asegura que las variables de entorno se carguen al inicializar este módulo
dotenv.config();
import { initUserModel, User } from '../models/User';
import { initClientModel, Client } from '../models/Client';
import { initPackageModel, Package } from '../models/Package';
import { initShipmentModel, Shipment } from '../models/Shipment';
import { initPackageHistoryModel, PackageHistory } from '../models/PackageHistory';
import { initShipmentPackageModel, ShipmentPackage } from '../models/ShipmentPackage';
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
  initPackageModel(sequelize);
  initShipmentModel(sequelize);
  initPackageHistoryModel(sequelize);
  initShipmentPackageModel(sequelize);
  initRefreshTokenModel(sequelize);
  initPasswordResetTokenModel(sequelize);
  initEmailVerificationTokenModel(sequelize);

  // Associations
  Package.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Client.hasMany(Package, { foreignKey: 'client_id', as: 'packages' });

  Shipment.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });
  Package.hasMany(Shipment, { foreignKey: 'package_id', as: 'shipments' });

  initPackageHistoryModel(sequelize);
  Package.hasMany(PackageHistory, { foreignKey: 'package_id', as: 'history' });
  PackageHistory.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });
  PackageHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(PackageHistory, { foreignKey: 'user_id', as: 'history' });

  // Auth token associations
  RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  EmailVerificationToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Many-to-many: Envios <-> Paquetes
  Package.belongsToMany(Shipment, {
    through: ShipmentPackage,
    foreignKey: 'package_id',
    otherKey: 'shipment_id',
    as: 'relatedShipments'
  });
  Shipment.belongsToMany(Package, {
    through: ShipmentPackage,
    foreignKey: 'shipment_id',
    otherKey: 'package_id',
    as: 'relatedPackages'
  });
};

export const models = {
  User,
  Client,
  Package,
  Shipment,
  PackageHistory,
  ShipmentPackage,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken
};