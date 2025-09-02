import { Request } from 'express';

export interface Usuario {
  usua_id?: number;
  usua_nombre: string;
  usua_email: string;
  usua_password_hash: string;
  usua_rol: 'admin' | 'chofer' | 'operador';
  usua_activo?: boolean;
}

export interface Cliente {
  clie_id?: number;
  clie_nombre: string;
  clie_email: string;
  clie_telefono: string;
  clie_direccion: string;
  clie_tipo_cliente: 'remitente' | 'destinatario' | 'ambos';
  activo?: boolean;
}

export interface Paquete {
  id?: number;
  numero_seguimiento: string;
  descripcion: string;
  peso: number;
  dimensiones: string;
  valor_declarado: number;
  fragil: boolean;
  fecha_creacion?: Date;
  estado?: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto';
}

export interface Envio {
  id?: number;
  numero_envio: string;
  cliente_origen_id: number;
  cliente_destino_id: number;
  paquete_id: number;
  direccion_origen: string;
  direccion_destino: string;
  fecha_envio: Date;
  fecha_entrega_estimada: Date;
  fecha_entrega_real?: Date;
  estado: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto' | 'cancelado';
  costo: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  notas?: string;
}

export interface HistorialPaquete {
  id?: number;
  paquete_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  ubicacion: string;
  fecha_cambio: Date;
  observaciones?: string;
  usuario_id?: number;
}

export interface Ruta {
  id?: number;
  nombre: string;
  origen: string;
  destino: string;
  distancia_km: number;
  tiempo_estimado_horas: number;
  activa: boolean;
}

export interface Vehiculo {
  id?: number;
  placa: string;
  modelo: string;
  marca: string;
  año: number;
  capacidad_kg: number;
  estado: 'disponible' | 'en_ruta' | 'mantenimiento' | 'fuera_servicio';
  conductor?: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    rol: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AccessTokenPayload = {
  id: number;
  email: string;
  rol: string;
};