import { Sequelize, DataTypes, Model } from 'sequelize';

export interface EmailVerificationTokenAttributes {
  token_id: string;
  user_id: number;
  is_used: number;
  created_at?: Date;
}

export class EmailVerificationToken extends Model<EmailVerificationTokenAttributes> implements EmailVerificationTokenAttributes {
  public token_id!: string;
  public user_id!: number;
  public is_used!: number;
  public created_at?: Date;
}

export const initEmailVerificationTokenModel = (sequelize: Sequelize) => {
  EmailVerificationToken.init({
    token_id: { type: DataTypes.STRING(36), primaryKey: true, field: 'emve_token_id' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, field: 'emve_user_id' },
    is_used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, field: 'emve_is_used' },
    created_at: { type: DataTypes.DATE, field: 'emve_created_at' }
  }, {
    sequelize,
    tableName: 'EmailVerificationTokens',
    timestamps: false
  });
};