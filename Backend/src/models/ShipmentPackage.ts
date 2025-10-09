import { Sequelize, DataTypes, Model } from 'sequelize';

export interface ShipmentPackageAttributes {
  shipment_id: number;
  package_id: number;
  created_at?: Date;
}

export class ShipmentPackage extends Model<ShipmentPackageAttributes> implements ShipmentPackageAttributes {
  public shipment_id!: number;
  public package_id!: number;
  public created_at?: Date;
}

export const initShipmentPackageModel = (sequelize: Sequelize) => {
  ShipmentPackage.init({
    shipment_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'shpa_shipment_id' },
    package_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'shpa_package_id' },
    created_at: { type: DataTypes.DATE, field: 'shpa_created_at' }
  }, {
    sequelize,
    tableName: 'ShipmentPackages',
    timestamps: false
  });
};