import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface PackageAttributes {
  package_id: number;
  client_id?: number | null;
  sender_name?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  sender_address?: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  description?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  declared_value?: number | null;
  origin_address?: string | null;
  destination_address?: string | null;
  status: string;
  tracking_number: string;
  tracking_code?: string | null;
  public_tracking_code?: string | null;
  estimated_delivery_date?: Date | null;
  quantity?: number | null;
  is_active: number;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type PackageCreationAttributes = Optional<PackageAttributes, 'package_id' | 'client_id' | 'sender_name' | 'sender_email' | 'sender_phone' | 'sender_address' | 'recipient_name' | 'recipient_email' | 'recipient_phone' | 'recipient_address' | 'description' | 'weight' | 'dimensions' | 'declared_value' | 'origin_address' | 'destination_address' | 'tracking_code' | 'public_tracking_code' | 'estimated_delivery_date' | 'quantity' | 'created_at' | 'updated_at'>;

export class Package extends Model<PackageAttributes, PackageCreationAttributes> implements PackageAttributes {
  public package_id!: number;
  public client_id?: number | null;
  public sender_name?: string | null;
  public sender_email?: string | null;
  public sender_phone?: string | null;
  public sender_address?: string | null;
  public recipient_name?: string | null;
  public recipient_email?: string | null;
  public recipient_phone?: string | null;
  public recipient_address?: string | null;
  public description?: string | null;
  public weight?: number | null;
  public dimensions?: string | null;
  public declared_value?: number | null;
  public origin_address?: string | null;
  public destination_address?: string | null;
  public status!: string;
  public tracking_number!: string;
  public tracking_code?: string | null;
  public public_tracking_code?: string | null;
  public estimated_delivery_date?: Date | null;
  public quantity?: number | null;
  public is_active!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

export const initPackageModel = (sequelize: Sequelize) => {
  Package.init({
    package_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'pack_id' },
    client_id: { type: DataTypes.INTEGER, allowNull: true, field: 'pack_clie_id' },
    sender_name: { type: DataTypes.STRING(255), allowNull: true, field: 'pack_sender_name' },
    sender_email: { type: DataTypes.STRING(255), allowNull: true, field: 'pack_sender_email' },
    sender_phone: { type: DataTypes.STRING(20), allowNull: true, field: 'pack_sender_phone' },
    sender_address: { type: DataTypes.TEXT, allowNull: true, field: 'pack_sender_address' },
    recipient_name: { type: DataTypes.STRING(255), allowNull: true, field: 'pack_recipient_name' },
    recipient_email: { type: DataTypes.STRING(255), allowNull: true, field: 'pack_recipient_email' },
    recipient_phone: { type: DataTypes.STRING(20), allowNull: true, field: 'pack_recipient_phone' },
    recipient_address: { type: DataTypes.TEXT, allowNull: true, field: 'pack_recipient_address' },
    description: { type: DataTypes.TEXT, field: 'pack_description' },
    weight: { type: DataTypes.DECIMAL(10,2), field: 'pack_weight' },
    dimensions: { type: DataTypes.STRING(50), field: 'pack_dimensions' },
    declared_value: { type: DataTypes.DECIMAL(10,2), field: 'pack_declared_value' },
    origin_address: { type: DataTypes.TEXT, field: 'pack_origin_address' },
    destination_address: { type: DataTypes.TEXT, field: 'pack_destination_address' },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pending', field: 'pack_status' },
    tracking_number: { type: DataTypes.STRING(191), allowNull: false, field: 'pack_tracking_number' },
    tracking_code: { type: DataTypes.STRING(191), field: 'pack_tracking_code' },
    public_tracking_code: { type: DataTypes.STRING(191), field: 'pack_public_tracking_code' },
    estimated_delivery_date: { type: DataTypes.DATE, field: 'pack_estimated_delivery_date' },
    quantity: { type: DataTypes.INTEGER, field: 'pack_quantity', defaultValue: 1 },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, field: 'pack_is_active' },
    created_at: { type: DataTypes.DATE, field: 'pack_created_at' },
    updated_at: { type: DataTypes.DATE, field: 'pack_updated_at' }
  }, {
    sequelize,
    tableName: 'Packages',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['tracking_number'] },
      { unique: true, fields: ['tracking_code'] }
    ]
  });
};