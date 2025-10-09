import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface EnvioAttributes {
  envi_id: number;
  envi_paquete_id?: number | null;
  envi_direccion_origen?: string | null;
  envi_direccion_destino?: string | null;
  envi_estado: string;
  envi_fecha_envio_estimada?: Date | null;
  envi_fecha_entrega_real?: Date | null;
  envi_activo: number;
  envi_created_at?: Date;
  envi_updated_at?: Date;
}

export type EnvioCreationAttributes = Optional<EnvioAttributes, 'envi_id' | 'envi_paquete_id' | 'envi_direccion_origen' | 'envi_direccion_destino' | 'envi_fecha_envio_estimada' | 'envi_fecha_entrega_real' | 'envi_created_at' | 'envi_updated_at'>;

export class Envio extends Model<EnvioAttributes, EnvioCreationAttributes> implements EnvioAttributes {
  public envi_id!: number;
  public envi_paquete_id?: number | null;
  public envi_direccion_origen?: string | null;
  public envi_direccion_destino?: string | null;
  public envi_estado!: string;
  public envi_fecha_envio_estimada?: Date | null;
  public envi_fecha_entrega_real?: Date | null;
  public envi_activo!: number;
  public envi_created_at?: Date;
  public envi_updated_at?: Date;
}

export const initEnvioModel = (sequelize: Sequelize) => {
  Envio.init({
    envi_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    envi_paquete_id: { type: DataTypes.INTEGER, allowNull: true },
    envi_direccion_origen: { type: DataTypes.TEXT },
    envi_direccion_destino: { type: DataTypes.TEXT },
    envi_estado: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'en_transito' },
    envi_fecha_envio_estimada: { type: DataTypes.DATE },
    envi_fecha_entrega_real: { type: DataTypes.DATE },
    envi_activo: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    envi_created_at: { type: DataTypes.DATE },
    envi_updated_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'Envios',
    timestamps: false
  });
};