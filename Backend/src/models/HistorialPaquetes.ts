import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface HistorialPaquetesAttributes {
  hipa_id: number;
  hipa_paquete_id: number;
  hipa_estado_anterior?: string | null;
  hipa_estado_nuevo: string;
  hipa_comentario?: string | null;
  hipa_usuario_id?: number | null;
  hipa_fecha_cambio?: Date;
}

export type HistorialPaquetesCreationAttributes = Optional<HistorialPaquetesAttributes, 'hipa_id' | 'hipa_estado_anterior' | 'hipa_comentario' | 'hipa_usuario_id' | 'hipa_fecha_cambio'>;

export class HistorialPaquetes extends Model<HistorialPaquetesAttributes, HistorialPaquetesCreationAttributes> implements HistorialPaquetesAttributes {
  public hipa_id!: number;
  public hipa_paquete_id!: number;
  public hipa_estado_anterior?: string | null;
  public hipa_estado_nuevo!: string;
  public hipa_comentario?: string | null;
  public hipa_usuario_id?: number | null;
  public hipa_fecha_cambio?: Date;
}

export const initHistorialPaquetesModel = (sequelize: Sequelize) => {
  HistorialPaquetes.init({
    hipa_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    hipa_paquete_id: { type: DataTypes.INTEGER, allowNull: false },
    hipa_estado_anterior: { type: DataTypes.STRING(50) },
    hipa_estado_nuevo: { type: DataTypes.STRING(50), allowNull: false },
    hipa_comentario: { type: DataTypes.TEXT },
    hipa_usuario_id: { type: DataTypes.INTEGER },
    hipa_fecha_cambio: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'HistorialPaquetes',
    timestamps: false
  });
};