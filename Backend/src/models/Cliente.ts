import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface ClienteAttributes {
  clie_id: number;
  clie_nombre: string;
  clie_email?: string | null;
  clie_telefono?: string | null;
  clie_direccion?: string | null;
  clie_activo: number;
  clie_created_at?: Date;
  clie_updated_at?: Date;
}

export type ClienteCreationAttributes = Optional<ClienteAttributes, 'clie_id' | 'clie_email' | 'clie_telefono' | 'clie_direccion' | 'clie_created_at' | 'clie_updated_at'>;

export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  public clie_id!: number;
  public clie_nombre!: string;
  public clie_email?: string | null;
  public clie_telefono?: string | null;
  public clie_direccion?: string | null;
  public clie_activo!: number;
  public clie_created_at?: Date;
  public clie_updated_at?: Date;
}

export const initClienteModel = (sequelize: Sequelize) => {
  Cliente.init({
    clie_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clie_nombre: { type: DataTypes.STRING(100), allowNull: false },
    clie_email: { type: DataTypes.STRING(100) },
    clie_telefono: { type: DataTypes.STRING(20) },
    clie_direccion: { type: DataTypes.TEXT },
    clie_activo: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    clie_created_at: { type: DataTypes.DATE },
    clie_updated_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'Clientes',
    timestamps: false
  });
};