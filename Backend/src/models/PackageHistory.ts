import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface PackageHistoryAttributes {
  history_id: number;
  package_id: number;
  old_status?: string | null;
  new_status: string;
  comment?: string | null;
  user_id?: number | null;
  change_date?: Date;
}

export type PackageHistoryCreationAttributes = Optional<PackageHistoryAttributes, 'history_id' | 'old_status' | 'comment' | 'user_id' | 'change_date'>;

export class PackageHistory extends Model<PackageHistoryAttributes, PackageHistoryCreationAttributes> implements PackageHistoryAttributes {
  public history_id!: number;
  public package_id!: number;
  public old_status?: string | null;
  public new_status!: string;
  public comment?: string | null;
  public user_id?: number | null;
  public change_date?: Date;
}

export const initPackageHistoryModel = (sequelize: Sequelize) => {
  PackageHistory.init({
    history_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, field: 'pahi_id' },
    package_id: { type: DataTypes.INTEGER, allowNull: false, field: 'pahi_package_id' },
    old_status: { type: DataTypes.STRING(50), field: 'pahi_previous_status' },
    new_status: { type: DataTypes.STRING(50), allowNull: false, field: 'pahi_new_status' },
    comment: { type: DataTypes.TEXT, field: 'pahi_comment' },
    user_id: { type: DataTypes.INTEGER, field: 'pahi_user_id' },
    change_date: { type: DataTypes.DATE, field: 'pahi_change_date' }
  }, {
    sequelize,
    tableName: 'PackageHistory',
    timestamps: false
  });
};