import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface UserAttributes {
  id: number;
  name: string;
  role: 'admin' | 'employee' | 'driver' | 'operator';
  email: string;
  password_hash: string;
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public role!: 'admin' | 'employee' | 'driver' | 'operator';
  public email!: string;
  public password_hash!: string;
  public is_active!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

export const initUserModel = (sequelize: Sequelize) => {
  User.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'user_id' },
    name: { type: DataTypes.STRING(100), allowNull: false, field: 'user_name' },
    role: { type: DataTypes.ENUM('admin','employee','driver','operator'), allowNull: false, field: 'user_role' },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'user_email' },
    password_hash: { type: DataTypes.TEXT, allowNull: false, field: 'user_password_hash' },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, field: 'user_is_active' },
    created_at: { type: DataTypes.DATE, field: 'user_created_at' },
    updated_at: { type: DataTypes.DATE, field: 'user_updated_at' }
  }, {
    sequelize,
    tableName: 'Users',
    timestamps: false
  });
};