import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface ClientAttributes {
  client_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

export type ClientCreationAttributes = Optional<ClientAttributes, 'client_id' | 'email' | 'phone' | 'address' | 'created_at' | 'updated_at'>;

export class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public client_id!: number;
  public name!: string;
  public email?: string | null;
  public phone?: string | null;
  public address?: string | null;
  public is_active!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

export const initClientModel = (sequelize: Sequelize) => {
  Client.init({
    client_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'clie_id' },
    name: { type: DataTypes.STRING(100), allowNull: false, field: 'clie_name' },
    email: { type: DataTypes.STRING(100), field: 'clie_email' },
    phone: { type: DataTypes.STRING(20), field: 'clie_phone' },
    address: { type: DataTypes.TEXT, field: 'clie_address' },
    is_active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      field: 'clie_is_active'
    },
    created_at: { type: DataTypes.DATE, field: 'clie_created_at' },
    updated_at: { type: DataTypes.DATE, field: 'clie_updated_at' }
  }, {
    sequelize,
    tableName: 'Clients',
    timestamps: false
  });
};