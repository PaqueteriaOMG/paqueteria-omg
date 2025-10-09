import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface ShipmentAttributes {
  shipment_id: number;
  package_id?: number | null;
  origin_address?: string | null;
  destination_address?: string | null;
  status: string;
  estimated_delivery_date?: Date | null;
  actual_delivery_date?: Date | null;
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

export type ShipmentCreationAttributes = Optional<ShipmentAttributes, 'shipment_id' | 'package_id' | 'origin_address' | 'destination_address' | 'estimated_delivery_date' | 'actual_delivery_date' | 'created_at' | 'updated_at'>;

export class Shipment extends Model<ShipmentAttributes, ShipmentCreationAttributes> implements ShipmentAttributes {
  public shipment_id!: number;
  public package_id?: number | null;
  public origin_address?: string | null;
  public destination_address?: string | null;
  public status!: string;
  public estimated_delivery_date?: Date | null;
  public actual_delivery_date?: Date | null;
  public is_active!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

export const initShipmentModel = (sequelize: Sequelize) => {
  Shipment.init({
    shipment_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'ship_id' },
    package_id: { type: DataTypes.INTEGER, allowNull: true, field: 'ship_package_id' },
    origin_address: { type: DataTypes.TEXT, field: 'ship_origin_address' },
    destination_address: { type: DataTypes.TEXT, field: 'ship_destination_address' },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'in_transit', field: 'ship_status' },
    estimated_delivery_date: { type: DataTypes.DATE, field: 'ship_estimated_delivery_date' },
    actual_delivery_date: { type: DataTypes.DATE, field: 'ship_actual_delivery_date' },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, field: 'ship_is_active' },
    created_at: { type: DataTypes.DATE, field: 'ship_created_at' },
    updated_at: { type: DataTypes.DATE, field: 'ship_updated_at' }
  }, {
    sequelize,
    tableName: 'Shipments',
    timestamps: false
  });
};