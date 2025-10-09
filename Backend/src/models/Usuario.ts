import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface UsuarioAttributes {
  usua_id: number;
  usua_nombre: string;
  usua_rol: 'admin' | 'empleado' | 'chofer' | 'operador';
  usua_email: string;
  usua_password_hash: string;
  usua_activo: number;
  usua_created_at?: Date;
  usua_updated_at?: Date;
}

export type UsuarioCreationAttributes = Optional<UsuarioAttributes, 'usua_id' | 'usua_created_at' | 'usua_updated_at'>;

export class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  public usua_id!: number;
  public usua_nombre!: string;
  public usua_rol!: 'admin' | 'empleado' | 'chofer' | 'operador';
  public usua_email!: string;
  public usua_password_hash!: string;
  public usua_activo!: number;
  public usua_created_at?: Date;
  public usua_updated_at?: Date;
}

export const initUsuarioModel = (sequelize: Sequelize) => {
  Usuario.init({
    usua_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usua_nombre: { type: DataTypes.STRING(100), allowNull: false },
    usua_rol: { type: DataTypes.ENUM('admin','empleado','chofer','operador'), allowNull: false },
    usua_email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    usua_password_hash: { type: DataTypes.TEXT, allowNull: false },
    usua_activo: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    usua_created_at: { type: DataTypes.DATE },
    usua_updated_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'Usuarios',
    timestamps: false
  });
};