import { Sequelize, DataTypes, Model } from 'sequelize';

export interface PasswordResetTokenAttributes {
  token_id: string;
  user_id: number;
  is_used: number;
  created_at?: Date;
}

export class PasswordResetToken extends Model<PasswordResetTokenAttributes> implements PasswordResetTokenAttributes {
  public token_id!: string;
  public user_id!: number;
  public is_used!: number;
  public created_at?: Date;
}

export const initPasswordResetTokenModel = (sequelize: Sequelize) => {
  PasswordResetToken.init({
    token_id: { type: DataTypes.STRING(36), primaryKey: true, field: 'part_token_id' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, field: 'part_user_id' },
    is_used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, field: 'part_is_used' },
    created_at: { type: DataTypes.DATE, field: 'part_created_at' }
  }, {
    sequelize,
    tableName: 'PasswordResetTokens',
    timestamps: false
  });
};