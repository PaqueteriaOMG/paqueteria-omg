import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface PackageAttributes {
  package_id: number;
  client_id?: number | null;
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
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

export type PackageCreationAttributes = Optional<PackageAttributes, 'package_id' | 'client_id' | 'description' | 'weight' | 'dimensions' | 'declared_value' | 'origin_address' | 'destination_address' | 'tracking_code' | 'public_tracking_code' | 'created_at' | 'updated_at'>;

export class Package extends Model<PackageAttributes, PackageCreationAttributes> implements PackageAttributes {
  public package_id!: number;
  public client_id?: number | null;
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
  public is_active!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

export const initPackageModel = (sequelize: Sequelize) => {
  Package.init({
    package_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'pack_id' },
    client_id: { type: DataTypes.INTEGER, allowNull: true, field: 'pack_client_id' },
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