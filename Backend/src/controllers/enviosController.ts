import { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize, models as defaultModels } from '../db/sequelize';

export class EnviosController {
  private EnvioModel: any;
  private PaqueteModel: any;
  private ClienteModel: any;
  private HistorialModel: any;
  private EnviosPaquetesModel: any;

  constructor(_models?: any) {
    const mdl = _models || defaultModels;
    this.EnvioModel = mdl.Envio;
    this.PaqueteModel = mdl.Paquete;
    this.ClienteModel = mdl.Cliente;
    this.HistorialModel = mdl.PackageHistory;
    this.EnviosPaquetesModel = mdl.EnviosPaquetes;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const estado = req.query.estado;
      const search = (req.query.search || '') as string;

      const where: any = { envi_activo: 1 };
      if (estado) where.envi_estado = estado;

      if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
          { '$paquete.paqu_numero_seguimiento$': { [Op.like]: like } },
          { '$paquete.cliente.clie_nombre$': { [Op.like]: like } },
          { envi_direccion_destino: { [Op.like]: like } }
        ];
      }

      const result = await this.EnvioModel.findAndCountAll({
        where,
        include: [
          {
            model: this.PaqueteModel,
            as: 'paquete',
            include: [{ model: this.ClienteModel, as: 'cliente' }]
          }
        ],
        order: [['envi_created_at', 'DESC']],
        limit,
        offset
      });

      const data = result.rows.map((envio: any) => {
        const plain = envio.get({ plain: true });
        return {
          ...plain,
          numero_seguimiento: plain.paquete?.paqu_numero_seguimiento,
          cliente_nombre: plain.paquete?.cliente?.clie_nombre
        };
      });

      const total = result.count;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data,
        pagination: { page, limit, total, totalPages }
      });
    } catch (error) {
      console.error('Error al obtener envíos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getById(req: any, res: Response) {
    try {
      const { id } = req.params;

      const envio = await this.EnvioModel.findOne({
        where: { envi_id: id, envi_activo: 1 },
        include: [
          {
            model: this.PaqueteModel,
            as: 'paquete',
            include: [{ model: this.ClienteModel, as: 'cliente' }]
          }
        ]
      });

      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const plain = envio.get({ plain: true });
      res.json({
        ...plain,
        numero_seguimiento: plain.paquete?.paqu_numero_seguimiento,
        paquete_descripcion: plain.paquete?.paqu_descripcion,
        cliente_nombre: plain.paquete?.cliente?.clie_nombre,
        cliente_email: plain.paquete?.cliente?.clie_email
      });
    } catch (error) {
      console.error('Error al obtener envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getByTracking(req: any, res: Response) {
    try {
      const { numero } = req.params;
      const envio = await this.EnvioModel.findOne({
        where: { envi_activo: 1 },
        include: [
          {
            model: this.PaqueteModel,
            as: 'paquete',
            where: { paqu_numero_seguimiento: numero },
            required: true,
            include: [{ model: this.ClienteModel, as: 'cliente' }]
          }
        ]
      });

      if (!envio) {
        res.status(404).json({ error: 'No se encontró envío para ese número de seguimiento' });
        return;
      }

      const plain = envio.get({ plain: true });
      res.json({
        ...plain,
        numero_seguimiento: plain.paquete?.paqu_numero_seguimiento,
        paquete_descripcion: plain.paquete?.paqu_descripcion,
        cliente_nombre: plain.paquete?.cliente?.clie_nombre,
        cliente_email: plain.paquete?.cliente?.clie_email
      });
    } catch (error) {
      console.error('Error al obtener envío por seguimiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req: any, res: Response) {
    try {
      const { paquete_id, direccion_origen, direccion_destino, fecha_envio_estimada } = req.body;
      const paquete = await this.PaqueteModel.findOne({
        where: { paqu_id: paquete_id, paqu_activo: 1 },
        attributes: ['paqu_id', 'paqu_estado']
      });

      if (!paquete) {
        res.status(400).json({ error: 'Paquete no encontrado' });
        return;
      }

      if (paquete.paqu_estado !== 'pendiente') {
        res.status(400).json({ error: 'Solo se pueden crear envíos para paquetes en estado pendiente' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        const envio = await this.EnvioModel.create(
          {
            envi_paquete_id: paquete_id,
            envi_direccion_origen: direccion_origen,
            envi_direccion_destino: direccion_destino,
            envi_estado: 'en_transito',
            envi_fecha_envio_estimada: fecha_envio_estimada ?? null
          },
          { transaction: tx }
        );

        await this.PaqueteModel.update(
          { paqu_estado: 'en_transito' },
          { where: { paqu_id: paquete_id }, transaction: tx }
        );

        await this.HistorialModel.create(
          {
            hipa_paquete_id: paquete_id,
            hipa_estado_anterior: 'pendiente',
            hipa_estado_nuevo: 'en_transito',
            hipa_comentario: 'Creación de envío',
            hipa_usuario_id: req.user?.id || null
          },
          { transaction: tx }
        );

        try {
          await this.EnviosPaquetesModel.create(
            { enpa_envio_id: envio.envi_id, enpa_paquete_id: paquete_id },
            { transaction: tx }
          );
        } catch (e) {
          // Ignorar duplicados
        }

        await tx.commit();
        res.status(201).json(envio.get({ plain: true }));
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error al crear envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualización general del envío (direcciones, fecha estimada, y reasignación opcional de paquete)
  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { direccion_origen, direccion_destino, fecha_envio_estimada, paquete_id } = req.body;
      const envio = await this.EnvioModel.findOne({ where: { envi_id: id, envi_activo: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      if (envio.envi_estado === 'entregado' || envio.envi_estado === 'cancelado') {
        res.status(400).json({ error: 'No se puede editar un envío entregado o cancelado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        // Reasignación de paquete (opcional)
        if (paquete_id && paquete_id !== envio.envi_paquete_id) {
          const nuevoPaquete = await this.PaqueteModel.findOne({
            where: { paqu_id: paquete_id, paqu_activo: 1 },
            attributes: ['paqu_id', 'paqu_estado'],
            transaction: tx
          });

          if (!nuevoPaquete) {
            throw new Error('Paquete destino no encontrado');
          }
          if (nuevoPaquete.paqu_estado !== 'pendiente') {
            throw new Error('Solo se puede reasignar a un paquete en estado pendiente');
          }

          // Revertir paquete anterior a pendiente
          await this.PaqueteModel.update(
            { paqu_estado: 'pendiente', paqu_updated_at: new Date() },
            { where: { paqu_id: envio.envi_paquete_id }, transaction: tx }
          );
          await this.HistorialModel.create(
            {
              hipa_paquete_id: envio.envi_paquete_id,
              hipa_estado_anterior: envio.envi_estado,
              hipa_estado_nuevo: 'pendiente',
              hipa_comentario: 'Reasignación de envío: paquete liberado',
              hipa_usuario_id: req.user?.id || null
            },
            { transaction: tx }
          );

          // Marcar nuevo paquete en tránsito
          await this.PaqueteModel.update(
            { paqu_estado: 'en_transito', paqu_updated_at: new Date() },
            { where: { paqu_id: paquete_id }, transaction: tx }
          );
          await this.HistorialModel.create(
            {
              hipa_paquete_id: paquete_id,
              hipa_estado_anterior: 'pendiente',
              hipa_estado_nuevo: 'en_transito',
              hipa_comentario: 'Reasignación de envío: paquete asignado',
              hipa_usuario_id: req.user?.id || null
            },
            { transaction: tx }
          );

          envio.envi_paquete_id = paquete_id;
        }

        if (direccion_origen !== undefined) envio.envi_direccion_origen = direccion_origen;
        if (direccion_destino !== undefined) envio.envi_direccion_destino = direccion_destino;
        if (fecha_envio_estimada !== undefined) envio.envi_fecha_envio_estimada = fecha_envio_estimada;
        envio.envi_updated_at = new Date();

        await envio.save({ transaction: tx });
        await tx.commit();

        const updated = await this.EnvioModel.findByPk(id);
        res.json(updated.get({ plain: true }));
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al actualizar envío:', err);
        res.status(400).json({ error: err?.message || 'Error al actualizar envío' });
      }
    } catch (error) {
      console.error('Error general en update de envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.body;
      const envio = await this.EnvioModel.findOne({ where: { envi_id: id, envi_activo: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const estadoAnterior = envio.envi_estado as string;
      const allowedTransitions: Record<string, string[]> = {
        pendiente: ['en_transito', 'cancelado'],
        en_transito: ['entregado', 'devuelto', 'cancelado'],
        devuelto: [],
        entregado: [],
        cancelado: []
      };
      if (!allowedTransitions[estadoAnterior] || !allowedTransitions[estadoAnterior].includes(estado)) {
        res.status(409).json({ error: `Transición de estado no permitida: ${estadoAnterior} -> ${estado}` });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        envio.envi_estado = estado;
        envio.envi_updated_at = new Date();
        await envio.save({ transaction: tx });

        const puente = await this.EnviosPaquetesModel.findAll({
          where: { enpa_envio_id: id },
          attributes: ['enpa_paquete_id'],
          transaction: tx
        });
        const idsSet = new Set<number>();
        if (envio.envi_paquete_id) idsSet.add(Number(envio.envi_paquete_id));
        for (const r of puente) idsSet.add(Number(r.enpa_paquete_id));
        const paqueteIds = Array.from(idsSet);

        let paqueteEstado: string | null = null;
        if (estado === 'entregado') paqueteEstado = 'entregado';
        else if (estado === 'devuelto') paqueteEstado = 'devuelto';
        else if (estado === 'en_transito') paqueteEstado = 'en_transito';
        else if (estado === 'cancelado') paqueteEstado = 'pendiente';

        if (paqueteIds.length > 0 && paqueteEstado) {
          const paquetes = await this.PaqueteModel.findAll({
            where: { paqu_id: paqueteIds },
            attributes: ['paqu_id', 'paqu_estado'],
            transaction: tx
          });
          const currentById = new Map<number, string>(
            paquetes.map((p: any) => [Number(p.paqu_id), String(p.paqu_estado)])
          );

          for (const pid of paqueteIds) {
            await this.PaqueteModel.update(
              { paqu_estado: paqueteEstado, paqu_updated_at: new Date() },
              { where: { paqu_id: pid }, transaction: tx }
            );
            await this.HistorialModel.create(
              {
                hipa_paquete_id: pid,
                hipa_estado_anterior: currentById.get(pid) || estadoAnterior,
                hipa_estado_nuevo: paqueteEstado,
                hipa_comentario: comentario || `Envío ${estado}`,
                hipa_usuario_id: req.user?.id || null
              },
              { transaction: tx }
            );
          }
        }

        await tx.commit();
        const updatedEnvio = await this.EnvioModel.findByPk(id);
        res.json(updatedEnvio.get({ plain: true }));
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error al actualizar estado del envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const envio = await this.EnvioModel.findOne({ where: { envi_id: id, envi_activo: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      if (envio.envi_estado === 'entregado') {
        res.status(400).json({ error: 'No se puede eliminar un envío entregado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        await this.EnvioModel.update(
          { envi_activo: 0, envi_updated_at: new Date() },
          { where: { envi_id: id }, transaction: tx }
        );

        const puente = await this.EnviosPaquetesModel.findAll({
          where: { enpa_envio_id: id },
          attributes: ['enpa_paquete_id'],
          transaction: tx
        });
        const idsSet = new Set<number>();
        if (envio.envi_paquete_id) idsSet.add(Number(envio.envi_paquete_id));
        for (const r of puente) idsSet.add(Number(r.enpa_paquete_id));
        const paqueteIds = Array.from(idsSet);

        if (paqueteIds.length > 0) {
          const paquetes = await this.PaqueteModel.findAll({
            where: { paqu_id: paqueteIds },
            attributes: ['paqu_id', 'paqu_estado'],
            transaction: tx
          });
          const currentById = new Map<number, string>(
            paquetes.map((p: any) => [Number(p.paqu_id), String(p.paqu_estado)])
          );

          for (const pid of paqueteIds) {
            await this.PaqueteModel.update(
              { paqu_estado: 'pendiente', paqu_updated_at: new Date() },
              { where: { paqu_id: pid }, transaction: tx }
            );
            await this.HistorialModel.create(
              {
                hipa_paquete_id: pid,
                hipa_estado_anterior: currentById.get(pid) || envio.envi_estado,
                hipa_estado_nuevo: 'pendiente',
                hipa_comentario: 'Envío eliminado (soft delete)',
                hipa_usuario_id: req.user?.id || null
              },
              { transaction: tx }
            );
          }
        }

        await this.EnviosPaquetesModel.destroy({ where: { enpa_envio_id: id }, transaction: tx });

        await tx.commit();
        res.json({ message: 'Envío eliminado exitosamente' });
      } catch (err) {
        await tx.rollback();
        console.error('Error al eliminar envío:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    } catch (error) {
      console.error('Error al eliminar envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Listar paquetes asociados a un envío
  async listPackages(req: any, res: Response) {
    try {
      const { id } = req.params;
      const envio = await this.EnvioModel.findOne({ where: { envi_id: id, envi_activo: 1 }, attributes: ['envi_id'] });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }
      const paquetes = await this.PaqueteModel.findAll({
        include: [{
          model: this.EnvioModel,
          as: 'enviosRelacionados',
          where: { envi_id: id },
          through: { attributes: [] }
        }],
        where: { paqu_activo: 1 }
      });
      res.json(paquetes.map((p: any) => p.get({ plain: true })));
    } catch (error) {
      console.error('Error al listar paquetes de envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Agregar paquetes a un envío
  async addPackages(req: any, res: Response) {
    try {
      const { id } = req.params;
      const paquetes: number[] = Array.isArray(req.body?.paquetes) ? req.body.paquetes : [];
      if (paquetes.length === 0) {
        res.status(400).json({ error: 'Debe proporcionar arreglo paquetes con IDs' });
        return;
      }
      const tx = await sequelize.transaction();
      try {
        const envio = await this.EnvioModel.findOne({
          where: { envi_id: id, envi_activo: 1 },
          attributes: ['envi_id', 'envi_estado'],
          transaction: tx
        });
        if (!envio) {
          res.status(404).json({ error: 'Envío no encontrado' });
          await tx.rollback();
          return;
        }
        if (['entregado', 'cancelado'].includes(envio.envi_estado)) {
          throw new Error('No se puede modificar un envío entregado o cancelado');
        }

        const paquetesFound = await this.PaqueteModel.findAll({
          where: { paqu_id: paquetes, paqu_activo: 1 },
          attributes: ['paqu_id', 'paqu_estado'],
          transaction: tx
        });
        if (paquetesFound.length !== paquetes.length) {
          throw new Error('Uno o más paquetes no existen o no están activos');
        }
        for (const p of paquetesFound) {
          if (p.paqu_estado !== 'pendiente') {
            throw new Error('Todos los paquetes deben estar en estado pendiente');
          }
        }

        for (const pid of paquetes) {
          try {
            await this.EnviosPaquetesModel.create(
              { enpa_envio_id: id, enpa_paquete_id: pid },
              { transaction: tx }
            );
          } catch (e) {
            // ignorar duplicado
          }
          if (envio.envi_estado === 'en_transito') {
            await this.PaqueteModel.update(
              { paqu_estado: 'en_transito', paqu_updated_at: new Date() },
              { where: { paqu_id: pid }, transaction: tx }
            );
            await this.HistorialModel.create(
              {
                hipa_paquete_id: pid,
                hipa_estado_anterior: 'pendiente',
                hipa_estado_nuevo: 'en_transito',
                hipa_comentario: 'Paquete agregado al envío',
                hipa_usuario_id: req.user?.id || null
              },
              { transaction: tx }
            );
          }
        }

        await tx.commit();
        res.status(201).json({ message: 'Paquetes agregados al envío' });
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al agregar paquetes al envío:', err);
        res.status(400).json({ error: err?.message || 'Error al agregar paquetes' });
      }
    } catch (error) {
      console.error('Error general al agregar paquetes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Quitar paquete de un envío
  async removePackage(req: any, res: Response) {
    try {
      const { id, paqueteId } = req.params;
      const tx = await sequelize.transaction();
      try {
        const envio = await this.EnvioModel.findOne({
          where: { envi_id: id, envi_activo: 1 },
          attributes: ['envi_id', 'envi_estado'],
          transaction: tx
        });
        if (!envio) {
          res.status(404).json({ error: 'Envío no encontrado' });
          await tx.rollback();
          return;
        }
        if (['entregado', 'cancelado'].includes(envio.envi_estado)) {
          throw new Error('No se puede modificar un envío entregado o cancelado');
        }

        const relacion = await this.EnviosPaquetesModel.findOne({
          where: { enpa_envio_id: id, enpa_paquete_id: paqueteId },
          transaction: tx
        });
        if (!relacion) {
          throw new Error('El paquete no está asociado a este envío');
        }

        const paquete = await this.PaqueteModel.findOne({
          where: { paqu_id: paqueteId },
          attributes: ['paqu_id', 'paqu_estado'],
          transaction: tx
        });
        const prevEstado = paquete?.paqu_estado ?? 'en_transito';

        await this.EnviosPaquetesModel.destroy({
          where: { enpa_envio_id: id, enpa_paquete_id: paqueteId },
          transaction: tx
        });

        await this.PaqueteModel.update(
          { paqu_estado: 'pendiente', paqu_updated_at: new Date() },
          { where: { paqu_id: paqueteId }, transaction: tx }
        );
        await this.HistorialModel.create(
          {
            hipa_paquete_id: paqueteId,
            hipa_estado_anterior: prevEstado,
            hipa_estado_nuevo: 'pendiente',
            hipa_comentario: 'Paquete removido del envío',
            hipa_usuario_id: req.user?.id || null
          },
          { transaction: tx }
        );

        await tx.commit();
        res.json({ message: 'Paquete removido del envío' });
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al remover paquete del envío:', err);
        res.status(400).json({ error: err?.message || 'Error al remover paquete' });
      }
    } catch (error) {
      console.error('Error general al remover paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async restore(req: any, res: Response) {
    try {
      const { id } = req.params;
      
      const envio = await this.EnvioModel.findOne({ 
        where: { envi_id: id, envi_activo: 0 }
      });

      if (!envio) {
        res.status(404).json({ 
          success: false,
          error: 'Envío eliminado no encontrado' 
        });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        envio.envi_activo = 1;
        envio.envi_updated_at = new Date();
        await envio.save({ transaction: tx });

        // Restaurar relaciones con paquetes
        const paquetes = await this.PaqueteModel.findAll({
          include: [{
            model: this.EnvioModel,
            as: 'enviosRelacionados',
            where: { envi_id: id },
            through: { attributes: [] }
          }],
          attributes: ['paqu_id', 'paqu_estado'],
          transaction: tx
        });

        // Actualizar estado de los paquetes a en_transito
        for (const paquete of paquetes) {
          await this.PaqueteModel.update(
            { paqu_estado: 'en_transito', paqu_updated_at: new Date() },
            { where: { paqu_id: paquete.paqu_id }, transaction: tx }
          );

          await this.HistorialModel.create({
            hipa_paquete_id: paquete.paqu_id,
            hipa_estado_anterior: paquete.paqu_estado,
            hipa_estado_nuevo: 'en_transito',
            hipa_comentario: 'Envío restaurado',
            hipa_usuario_id: req.user?.id || null
          }, { transaction: tx });
        }

        await tx.commit();

        const restored = await this.EnvioModel.findByPk(id, {
          include: [{
            model: this.PaqueteModel,
            as: 'paquetes',
            through: { attributes: [] }
          }]
        });

        res.json({
          success: true,
          data: restored.get({ plain: true })
        });
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error al restaurar envío:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }
}