import { Sequelize, DataTypes, Model } from 'sequelize';

export interface RefreshTokenAttributes {
  token_id: string;
  user_id: number;
  revoked: number;
  created_at?: Date;
}

export class RefreshToken extends Model<RefreshTokenAttributes> implements RefreshTokenAttributes {
  public token_id!: string;
  public user_id!: number;
  public revoked!: number;
  public created_at?: Date;
}

export const initRefreshTokenModel = (sequelize: Sequelize) => {
  RefreshToken.init({
    token_id: { type: DataTypes.STRING(36), primaryKey: true, field: 'reft_token_id' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, field: 'reft_user_id' },
    revoked: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, field: 'reft_revoked' },
    created_at: { type: DataTypes.DATE, field: 'reft_created_at' }
  }, {
    sequelize,
    tableName: 'RefreshTokens',
    timestamps: false
  });
};