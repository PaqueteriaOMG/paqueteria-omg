import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface PaqueteAttributes {
  paqu_id: number;
  paqu_cliente_id?: number | null;
  paqu_descripcion?: string | null;
  paqu_peso?: number | null;
  paqu_dimensiones?: string | null;
  paqu_valor_declarado?: number | null;
  paqu_direccion_origen?: string | null;
  paqu_direccion_destino?: string | null;
  paqu_estado: string;
  paqu_numero_seguimiento: string;
  paqu_codigo_rastreo?: string | null;
  paqu_codigo_rastreo_publico?: string | null;
  paqu_activo: number;
  paqu_created_at?: Date;
  paqu_updated_at?: Date;
}

export type PaqueteCreationAttributes = Optional<PaqueteAttributes, 'paqu_id' | 'paqu_cliente_id' | 'paqu_descripcion' | 'paqu_peso' | 'paqu_dimensiones' | 'paqu_valor_declarado' | 'paqu_direccion_origen' | 'paqu_direccion_destino' | 'paqu_codigo_rastreo' | 'paqu_codigo_rastreo_publico' | 'paqu_created_at' | 'paqu_updated_at'>;

export class Paquete extends Model<PaqueteAttributes, PaqueteCreationAttributes> implements PaqueteAttributes {
  public paqu_id!: number;
  public paqu_cliente_id?: number | null;
  public paqu_descripcion?: string | null;
  public paqu_peso?: number | null;
  public paqu_dimensiones?: string | null;
  public paqu_valor_declarado?: number | null;
  public paqu_direccion_origen?: string | null;
  public paqu_direccion_destino?: string | null;
  public paqu_estado!: string;
  public paqu_numero_seguimiento!: string;
  public paqu_codigo_rastreo?: string | null;
  public paqu_codigo_rastreo_publico?: string | null;
  public paqu_activo!: number;
  public paqu_created_at?: Date;
  public paqu_updated_at?: Date;
}

export const initPaqueteModel = (sequelize: Sequelize) => {
  Paquete.init({
    paqu_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    paqu_cliente_id: { type: DataTypes.INTEGER, allowNull: true },
    paqu_descripcion: { type: DataTypes.TEXT },
    paqu_peso: { type: DataTypes.DECIMAL(10,2) },
    paqu_dimensiones: { type: DataTypes.STRING(50) },
    paqu_valor_declarado: { type: DataTypes.DECIMAL(10,2) },
    paqu_direccion_origen: { type: DataTypes.TEXT },
    paqu_direccion_destino: { type: DataTypes.TEXT },
    paqu_estado: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pendiente' },
    paqu_numero_seguimiento: { type: DataTypes.STRING(191), allowNull: false },
    paqu_codigo_rastreo: { type: DataTypes.STRING(191) },
    paqu_codigo_rastreo_publico: { type: DataTypes.STRING(191) },
    paqu_activo: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    paqu_created_at: { type: DataTypes.DATE },
    paqu_updated_at: { type: DataTypes.DATE }
  }, {
    sequelize,
    tableName: 'Paquetes',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['paqu_numero_seguimiento'] },
      { unique: true, fields: ['paqu_codigo_rastreo'] }
    ]
  });
};