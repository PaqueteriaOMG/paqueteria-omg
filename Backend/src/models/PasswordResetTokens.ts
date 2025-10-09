import { Sequelize, DataTypes, Model } from 'sequelize';

export interface PasswordResetTokensAttributes {
  prt_token_id: string;
  prt_user_id: number;
  prt_used: number;
  prt_created_at?: Date;
}

export class PasswordResetTokens extends Model<PasswordResetTokensAttributes> implements PasswordResetTokensAttributes {
  public prt_token_id!: string;
  public prt_user_id!: number;
  public prt_used!: number;
  public prt_created_at?: Date;
}

export const initPasswordResetTokensModel = (sequelize: Sequelize) => {
  PasswordResetTokens.init({
    prt_token_id: { type: DataTypes.STRING(36), primaryKey: true },
    prt_user_id: { type: DataTypes.INTEGER, allowNull: false },
    prt_used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    prt_created_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'PasswordResetTokens',
    timestamps: false
  });
};