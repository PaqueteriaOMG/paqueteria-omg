import { Sequelize, DataTypes, Model } from 'sequelize';

export interface EmailVerificationTokensAttributes {
  evt_token_id: string;
  evt_user_id: number;
  evt_used: number;
  evt_created_at?: Date;
}

export class EmailVerificationTokens extends Model<EmailVerificationTokensAttributes> implements EmailVerificationTokensAttributes {
  public evt_token_id!: string;
  public evt_user_id!: number;
  public evt_used!: number;
  public evt_created_at?: Date;
}

export const initEmailVerificationTokensModel = (sequelize: Sequelize) => {
  EmailVerificationTokens.init({
    evt_token_id: { type: DataTypes.STRING(36), primaryKey: true },
    evt_user_id: { type: DataTypes.INTEGER, allowNull: false },
    evt_used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    evt_created_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'EmailVerificationTokens',
    timestamps: false
  });
};