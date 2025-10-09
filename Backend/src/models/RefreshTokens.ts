import { Sequelize, DataTypes, Model } from 'sequelize';

export interface RefreshTokensAttributes {
  reto_token_id: string;
  reto_user_id: number;
  reto_revoked: number;
  reto_created_at?: Date;
}

export class RefreshTokens extends Model<RefreshTokensAttributes> implements RefreshTokensAttributes {
  public reto_token_id!: string;
  public reto_user_id!: number;
  public reto_revoked!: number;
  public reto_created_at?: Date;
}

export const initRefreshTokensModel = (sequelize: Sequelize) => {
  RefreshTokens.init({
    reto_token_id: { type: DataTypes.STRING(36), primaryKey: true },
    reto_user_id: { type: DataTypes.INTEGER, allowNull: false },
    reto_revoked: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    reto_created_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'RefreshTokens',
    timestamps: false
  });
};