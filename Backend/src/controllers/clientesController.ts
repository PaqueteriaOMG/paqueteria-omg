import { Response } from 'express';
import { Pool } from 'mysql2/promise';
import { Cliente } from '../types';

export class ClientesController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let query = 'SELECT * FROM Clientes WHERE clie_activo = 1';
      let countQuery = 'SELECT COUNT(*) as total FROM Clientes WHERE clie_activo = 1';
      const queryParams: any[] = [];
      const countQueryParams: any[] = [];

      if (search) {
        query += ' AND (clie_nombre LIKE ? OR clie_email LIKE ? OR clie_telefono LIKE ?)';
        countQuery += ' AND (clie_nombre LIKE ? OR clie_email LIKE ? OR clie_telefono LIKE ?)';
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
        countQueryParams.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY clie_created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      const [rows] = await this.db.execute(query, queryParams);
      const [countRows] = await this.db.execute(countQuery, countQueryParams);
      
      const total = (countRows as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows as Cliente[],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      
      const [rows] = await this.db.execute(
        'SELECT * FROM Clientes WHERE clie_id = ? AND clie_activo = 1',
        [id]
      );
      const clientes = rows as Cliente[];

      if (clientes.length === 0) {
        res.status(404).json({
          error: 'Cliente no encontrado'
        });
        return;
      }

      res.json(clientes[0]);
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async create(req: any, res: Response) {
    try {
      const { nombre, email, telefono, direccion } = req.body;

      // Verificar si el email ya existe
      const [existingClients] = await this.db.execute(
        'SELECT clie_id FROM Clientes WHERE clie_email = ? AND clie_activo = 1',
        [email]
      );
      
      if ((existingClients as any[]).length > 0) {
        res.status(400).json({
          error: 'El email ya está registrado'
        });
        return;
      }

      const [result] = await this.db.execute(
        'INSERT INTO Clientes (clie_nombre, clie_email, clie_telefono, clie_direccion) VALUES (?, ?, ?, ?)',
        [nombre, email, telefono, direccion]
      );

      const insertId = (result as any).insertId;
      
      const [newClient] = await this.db.execute(
        'SELECT * FROM Clientes WHERE clie_id = ?',
        [insertId]
      );

      res.status(201).json((newClient as Cliente[])[0]);
    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, email, telefono, direccion } = req.body;

      // Verificar si el cliente existe
      const [existingClient] = await this.db.execute(
        'SELECT clie_id FROM Clientes WHERE clie_id = ? AND clie_activo = 1',
        [id]
      );
      
      if ((existingClient as any[]).length === 0) {
        res.status(404).json({
          error: 'Cliente no encontrado'
        });
        return;
      }

      // Verificar si el email ya existe en otro cliente
      const [emailCheck] = await this.db.execute(
        'SELECT clie_id FROM Clientes WHERE clie_email = ? AND clie_id != ? AND clie_activo = 1',
        [email, id]
      );
      
      if ((emailCheck as any[]).length > 0) {
        res.status(400).json({
          error: 'El email ya está registrado por otro cliente'
        });
        return;
      }

      await this.db.execute(
        'UPDATE Clientes SET clie_nombre = ?, clie_email = ?, clie_telefono = ?, clie_direccion = ?, clie_updated_at = CURRENT_TIMESTAMP WHERE clie_id = ?',
        [nombre, email, telefono, direccion, id]
      );

      const [updatedClient] = await this.db.execute(
        'SELECT * FROM Clientes WHERE clie_id = ?',
        [id]
      );

      res.json((updatedClient as Cliente[])[0]);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si el cliente existe
      const [existingClient] = await this.db.execute(
        'SELECT clie_id FROM Clientes WHERE clie_id = ? AND clie_activo = 1',
        [id]
      );
      
      if ((existingClient as any[]).length === 0) {
        res.status(404).json({
          error: 'Cliente no encontrado'
        });
        return;
      }

      // Verificar si el cliente tiene envíos activos
      const [activeShipments] = await this.db.execute(
        'SELECT e.envi_id AS id FROM Envios e INNER JOIN EnviosPaquetes ep ON ep.enpa_envio_id = e.envi_id INNER JOIN Paquetes p ON p.paqu_id = ep.enpa_paquete_id WHERE p.paqu_cliente_id = ? AND e.envi_estado NOT IN ("entregado", "cancelado")',
        [id]
      );
      
      if ((activeShipments as any[]).length > 0) {
        res.status(400).json({
          error: 'No se puede eliminar el cliente porque tiene envíos activos'
        });
        return;
      }

      // Soft delete
      await this.db.execute(
        'UPDATE Clientes SET clie_activo = 0, clie_updated_at = CURRENT_TIMESTAMP WHERE clie_id = ?',
        [id]
      );

      res.json({
        message: 'Cliente eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async restore(req: any, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si el cliente existe y está desactivado
      const [existingClient] = await this.db.execute(
        'SELECT clie_id FROM Clientes WHERE clie_id = ? AND clie_activo = 0',
        [id]
      );

      if ((existingClient as any[]).length === 0) {
        res.status(404).json({
          error: 'Cliente no encontrado o ya está activo'
        });
        return;
      }

      // Restaurar cliente
      await this.db.execute(
        'UPDATE Clientes SET clie_activo = 1, clie_updated_at = CURRENT_TIMESTAMP WHERE clie_id = ?',
        [id]
      );

      const [restored] = await this.db.execute(
        'SELECT * FROM Clientes WHERE clie_id = ?',
        [id]
      );

      res.json((restored as Cliente[])[0]);
    } catch (error) {
      console.error('Error al restaurar cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async search(req: any, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q) {
        res.status(400).json({
          error: 'Parámetro de búsqueda requerido'
        });
        return;
      }

      const [rows] = await this.db.execute(
        'SELECT * FROM Clientes WHERE (clie_nombre LIKE ? OR clie_email LIKE ? OR clie_telefono LIKE ?) AND clie_activo = 1 LIMIT 10',
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );

      res.json(rows as Cliente[]);
    } catch (error) {
      console.error('Error en búsqueda de clientes:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}