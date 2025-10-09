import { Sequelize, DataTypes, Model } from 'sequelize';

export interface EnviosPaquetesAttributes {
  enpa_envio_id: number;
  enpa_paquete_id: number;
  enpa_created_at?: Date;
}

export class EnviosPaquetes extends Model<EnviosPaquetesAttributes> implements EnviosPaquetesAttributes {
  public enpa_envio_id!: number;
  public enpa_paquete_id!: number;
  public enpa_created_at?: Date;
}

export const initEnviosPaquetesModel = (sequelize: Sequelize) => {
  EnviosPaquetes.init({
    enpa_envio_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    enpa_paquete_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    enpa_created_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'EnviosPaquetes',
    timestamps: false
  });
};