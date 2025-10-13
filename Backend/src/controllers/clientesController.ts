import { Response } from 'express';
import { Cliente as ClienteType } from '../types';
import { models } from '../db/sequelize';
import { Op } from 'sequelize';

export class ClientesController {
  private ClienteModel = models.Client;

  constructor(_models?: any) {
    if (_models?.Client) this.ClienteModel = _models.Client;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      const { Op } = require('sequelize');
      const where: any = { is_active: 1 };
      if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
          { name: { [Op.like]: like } },
          { email: { [Op.like]: like } },
          { phone: { [Op.like]: like } }
        ];
      }

      const result = await this.ClienteModel.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      const rows = result.rows;
      const total = result.count as number;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows as unknown as ClienteType[],
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
      const cliente = await this.ClienteModel.findOne({ where: { client_id: id, is_active: 1 } });
      if (!cliente) {
        res.status(404).json({ error: 'Cliente no encontrado' });
        return;
      }
      res.json(cliente as unknown as ClienteType);
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
      const existingClient = await this.ClienteModel.findOne({ where: { email: email, is_active: 1 } });
      if (existingClient) {
        res.status(400).json({
          error: 'El email ya está registrado'
        });
        return;
      }
      const created = await this.ClienteModel.create({
        name: nombre,
        email: email,
        phone: telefono,
        address: direccion,
        is_active: 1
      });
      res.status(201).json(created as unknown as ClienteType);
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
      const existingClient = await this.ClienteModel.findOne({ where: { client_id: id, is_active: 1 } });
      if (!existingClient) {
        res.status(404).json({
          error: 'Cliente no encontrado'
        });
        return;
      }
      const emailCheck = await this.ClienteModel.findOne({ where: { email: email, client_id: { [Op.ne]: id }, is_active: 1 } as any });
      if (emailCheck) {
        res.status(400).json({
          error: 'El email ya está registrado por otro cliente'
        });
        return;
      }
      await this.ClienteModel.update({
        name: nombre,
        email: email,
        phone: telefono,
        address: direccion,
        updated_at: new Date()
      }, { where: { client_id: id } });
      const updated = await this.ClienteModel.findByPk(id);
      res.json(updated as unknown as ClienteType);
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
      const existingClient = await this.ClienteModel.findOne({ where: { client_id: id, is_active: 1 } });
      if (!existingClient) {
        res.status(404).json({
          error: 'Cliente no encontrado'
        });
        return;
      }
      // Verificar si el cliente tiene envíos activos
      // Nota: esta verificación compleja se mantiene con una consulta mínima; puede optimizarse con asociaciones si es necesario
      const { sequelize } = require('../db/sequelize');
      const [activeShipments]: any = await sequelize.query(
        'SELECT e.envi_id AS id FROM Envios e INNER JOIN EnviosPaquetes ep ON ep.enpa_envio_id = e.envi_id INNER JOIN Paquetes p ON p.pack_id = ep.enpa_paquete_id WHERE p.paqu_cliente_id = ? AND e.envi_estado NOT IN ("entregado", "cancelado")',
        { replacements: [id] }
      );
      if ((activeShipments as any[]).length > 0) {
        res.status(400).json({
          error: 'No se puede eliminar el cliente porque tiene envíos activos'
        });
        return;
      }
      await this.ClienteModel.update({ is_active: 0, updated_at: new Date() }, { where: { client_id: id } });
      res.json({ message: 'Cliente eliminado exitosamente' });
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
      const existingClient = await this.ClienteModel.findOne({ where: { client_id: id, is_active: 0 } });
      if (!existingClient) {
        res.status(404).json({
          error: 'Cliente no encontrado o ya está activo'
        });
        return;
      }
      await this.ClienteModel.update({ is_active: 1, updated_at: new Date() }, { where: { client_id: id } });
      const restored = await this.ClienteModel.findByPk(id);
      res.json(restored as unknown as ClienteType);
    } catch (error) {
      console.error('Error al restaurar cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async search(req: any, res: Response) {
    try {
      const term = req.params?.term ?? req.query?.term ?? req.query?.q;
      
      if (!term) {
        res.status(400).json({
          error: 'Parámetro de búsqueda requerido'
        });
        return;
      }

      const { Op } = require('sequelize');
      const rows = await this.ClienteModel.findAll({
        where: {
          is_active: 1,
          [Op.or]: [
            { name: { [Op.like]: `%${term}%` } },
            { email: { [Op.like]: `%${term}%` } },
            { phone: { [Op.like]: `%${term}%` } }
          ]
        },
        limit: 10
      });

      res.json(rows as unknown as ClienteType[]);
    } catch (error) {
      console.error('Error en búsqueda de clientes:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}