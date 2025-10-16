import { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize, models as defaultModels } from '../db/sequelize';

export class EnviosController {
  private ShipmentModel: any;
  private PackageModel: any;
  private ClientModel: any;
  private PackageHistoryModel: any;
  private ShipmentPackageModel: any;

  constructor(_models?: any) {
    const mdl = _models || defaultModels;
    this.ShipmentModel = mdl.Shipment;
    this.PackageModel = mdl.Package;
    this.ClientModel = mdl.Client;
    this.PackageHistoryModel = mdl.PackageHistory;
    this.ShipmentPackageModel = mdl.ShipmentPackage;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const estado = req.query.estado;
      const search = (req.query.search || '') as string;

      const where: any = { is_active: 1 };
      if (estado) where.status = estado;

      if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
          { '$package.tracking_number$': { [Op.like]: like } },
          { '$package.client.name$': { [Op.like]: like } },
          { destination_address: { [Op.like]: like } }
        ];
      }

      const result = await this.ShipmentModel.findAndCountAll({
        where,
        include: [
          {
            model: this.PackageModel,
            as: 'package',
            include: [{ model: this.ClientModel, as: 'client' }]
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      const data = result.rows.map((envio: any) => {
        const plain = envio.get({ plain: true });
        return {
          ...plain,
          tracking_number: plain.package?.tracking_number,
          client_name: plain.package?.client?.name
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

      const envio = await this.ShipmentModel.findOne({
        where: { shipment_id: id, is_active: 1 },
        include: [
          {
            model: this.PackageModel,
            as: 'package',
            include: [{ model: this.ClientModel, as: 'client' }]
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
        tracking_number: plain.package?.tracking_number,
        package_description: plain.package?.description,
        client_name: plain.package?.client?.name,
        client_email: plain.package?.client?.email
      });
    } catch (error) {
      console.error('Error al obtener envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getByTracking(req: any, res: Response) {
    try {
      const { numero } = req.params;
      const envio = await this.ShipmentModel.findOne({
        where: { is_active: 1 },
        include: [
          {
            model: this.PackageModel,
            as: 'package',
            where: { tracking_number: numero },
            required: true,
            include: [{ model: this.ClientModel, as: 'client' }]
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
        tracking_number: plain.package?.tracking_number,
        package_description: plain.package?.description,
        client_name: plain.package?.client?.name,
        client_email: plain.package?.client?.email
      });
    } catch (error) {
      console.error('Error al obtener envío por seguimiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req: any, res: Response) {
    try {
      const { package_id, origin_address, destination_address, estimated_delivery_date } = req.body;
      const paquete = await this.PackageModel.findOne({
        where: { package_id: package_id, is_active: 1 },
        attributes: ['package_id', 'status']
      });

      if (!paquete) {
        res.status(400).json({ error: 'Paquete no encontrado' });
        return;
      }

      if (paquete.status !== 'pendiente') {
        res.status(400).json({ error: 'Solo se pueden crear envíos para paquetes en estado pendiente' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        const envio = await this.ShipmentModel.create(
          {
            package_id: package_id,
            origin_address: origin_address,
            destination_address: destination_address,
            status: 'en_transito',
            estimated_delivery_date: estimated_delivery_date ?? null
          },
          { transaction: tx }
        );

        await this.PackageModel.update(
          { status: 'en_transito' },
          { where: { package_id: package_id }, transaction: tx }
        );

        await this.PackageHistoryModel.create(
          {
            package_id: package_id,
            new_status: 'en_transito',
            comment: 'Creación de envío',
            user_id: req.user?.id || null
          },
          { transaction: tx }
        );

        try {
          await this.ShipmentPackageModel.create(
            { shipment_id: envio.shipment_id, package_id: package_id },
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
      const { origin_address, destination_address, estimated_delivery_date, package_id } = req.body;
      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      if (envio.status === 'entregado' || envio.status === 'cancelado') {
        res.status(400).json({ error: 'No se puede editar un envío entregado o cancelado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        // Reasignación de paquete (opcional)
        if (package_id && package_id !== envio.package_id) {
          const nuevoPaquete = await this.PackageModel.findOne({
            where: { package_id: package_id, is_active: 1 },
            attributes: ['package_id', 'status'],
            transaction: tx
          });

          if (!nuevoPaquete) {
            throw new Error('Paquete destino no encontrado');
          }
          if (nuevoPaquete.status !== 'pendiente') {
            throw new Error('Solo se puede reasignar a un paquete en estado pendiente');
          }

          // Revertir paquete anterior a pendiente
          await this.PackageModel.update(
            { status: 'pendiente', updated_at: new Date() },
            { where: { package_id: envio.package_id }, transaction: tx }
          );
          await this.PackageHistoryModel.create(
            {
              package_id: envio.package_id,
              new_status: 'pendiente',
              comment: 'Reasignación de envío: paquete liberado',
              user_id: req.user?.id || null
            },
            { transaction: tx }
          );

          // Marcar nuevo paquete en tránsito
          await this.PackageModel.update(
            { status: 'en_transito', updated_at: new Date() },
            { where: { package_id: package_id }, transaction: tx }
          );
          await this.PackageHistoryModel.create(
            {
              package_id: package_id,
              new_status: 'en_transito',
              comment: 'Reasignación de envío: paquete asignado',
              user_id: req.user?.id || null
            },
            { transaction: tx }
          );

          envio.package_id = package_id;
        }

        if (origin_address !== undefined) envio.origin_address = origin_address;
        if (destination_address !== undefined) envio.destination_address = destination_address;
        if (estimated_delivery_date !== undefined) envio.estimated_delivery_date = estimated_delivery_date;
        envio.updated_at = new Date();

        await envio.save({ transaction: tx });
        await tx.commit();

        const updated = await this.ShipmentModel.findByPk(id);
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
      const { status, comment } = req.body;

      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      if (!['en_transito', 'entregado', 'cancelado'].includes(status)) {
        res.status(400).json({ error: 'Estado de envío no válido' });
        return;
      }

      if (envio.status === 'entregado' || envio.status === 'cancelado') {
        res.status(400).json({ error: 'No se puede cambiar el estado de un envío entregado o cancelado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        const oldStatus = envio.status;
        envio.status = status;
        envio.updated_at = new Date();
        await envio.save({ transaction: tx });

        await this.PackageModel.update(
          { status: status, updated_at: new Date() },
          { where: { package_id: envio.package_id }, transaction: tx }
        );

        await this.PackageHistoryModel.create(
          {
            package_id: envio.package_id,
            new_status: status,
            comment: comment || `Estado de envío actualizado a ${status}`,
            user_id: req.user?.id || null
          },
          { transaction: tx }
        );

        await tx.commit();

        const updated = await this.ShipmentModel.findByPk(id);
        res.json(updated.get({ plain: true }));
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al actualizar envío:', err);
        res.status(400).json({ error: err?.message || 'Error al actualizar envío' });
      }
    } catch (error) {
      console.error('Error al actualizar estado del envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 1 } });

      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        envio.is_active = 0;
        envio.updated_at = new Date();
        await envio.save({ transaction: tx });

        await this.PackageModel.update(
          { status: 'pendiente', updated_at: new Date() },
          { where: { package_id: envio.package_id }, transaction: tx }
        );

        await this.PackageHistoryModel.create(
          {
            package_id: envio.package_id,
            new_status: 'pendiente',
            comment: 'Envío cancelado/eliminado',
            user_id: req.user?.id || null
          },
          { transaction: tx }
        );

        await tx.commit();
        res.status(204).send();
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error al eliminar envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Restaurar un envío eliminado
  async restore(req: any, res: Response) {
    try {
      const { id } = req.params;
      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 0 } });

      if (!envio) {
        res.status(404).json({ error: 'Envío eliminado no encontrado' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        envio.is_active = 1;
        envio.status = 'en_transito';
        envio.updated_at = new Date();
        await envio.save({ transaction: tx });

        const paquete = await this.PackageModel.findOne({ where: { package_id: envio.package_id }, transaction: tx });
        if (paquete) {
          const oldStatus = paquete.status;
          await this.PackageModel.update(
            { status: 'en_transito', updated_at: new Date() },
            { where: { package_id: paquete.package_id }, transaction: tx }
          );
          await this.PackageHistoryModel.create(
            {
              package_id: paquete.package_id,
              new_status: 'en_transito',
              comment: 'Envío restaurado',
              user_id: req.user?.id || null
            },
            { transaction: tx }
          );
        }

        // Asegurar relación en tabla puente
        try {
          await this.ShipmentPackageModel.create(
            { shipment_id: envio.shipment_id, package_id: envio.package_id },
            { transaction: tx }
          );
        } catch (e) {
          // Ignorar duplicados
        }

        await tx.commit();

        const restored = await this.ShipmentModel.findOne({
          where: { shipment_id: id },
          include: [
            { model: this.PackageModel, as: 'package' },
            { model: this.PackageModel, as: 'relatedPackages' }
          ]
        });
        res.json(restored.get({ plain: true }));
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error al restaurar envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Listar paquetes asociados (incluye el principal si existe en la relación)
  async listPackages(req: any, res: Response) {
    try {
      const { id } = req.params;
      const envio = await this.ShipmentModel.findOne({
        where: { shipment_id: id, is_active: 1 },
        include: [{ model: this.PackageModel, as: 'relatedPackages' }]
      });

      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const packages = (envio.relatedPackages || []).map((p: any) => p.get({ plain: true }));
      res.json({ data: packages, count: packages.length });
    } catch (error) {
      console.error('Error al listar paquetes de envío:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Agregar paquetes adicionales al envío (actualiza estado de paquetes a en_transito)
  async addPackages(req: any, res: Response) {
    try {
      const { id } = req.params;
      const paquetes: number[] = req.body.paquetes || [];

      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }
      if (envio.status === 'entregado' || envio.status === 'cancelado') {
        res.status(400).json({ error: 'No se pueden agregar paquetes a un envío entregado o cancelado' });
        return;
      }

      if (!Array.isArray(paquetes) || paquetes.length === 0) {
        res.status(400).json({ error: 'Debe enviar un arreglo "paquetes" con al menos 1 ID' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        for (const pid of paquetes) {
          const paquete = await this.PackageModel.findOne({
            where: { package_id: pid, is_active: 1 },
            attributes: ['package_id', 'status'],
            transaction: tx
          });
          if (!paquete) {
            throw new Error(`Paquete ${pid} no encontrado`);
          }

          // Crear relación en tabla puente (si no existe)
          try {
            await this.ShipmentPackageModel.create(
              { shipment_id: envio.shipment_id, package_id: pid },
              { transaction: tx }
            );
          } catch (e) {
            // Ignorar duplicados
          }

          // Actualizar estado del paquete si estaba pendiente
          if (paquete.status !== 'en_transito') {
            await this.PackageModel.update(
              { status: 'en_transito', updated_at: new Date() },
              { where: { package_id: pid }, transaction: tx }
            );
            await this.PackageHistoryModel.create(
              {
                package_id: pid,
                new_status: 'en_transito',
                comment: 'Paquete agregado al envío',
                user_id: req.user?.id || null
              },
              { transaction: tx }
            );
          }
        }

        await tx.commit();

        const updated = await this.ShipmentModel.findOne({
          where: { shipment_id: id },
          include: [{ model: this.PackageModel, as: 'relatedPackages' }]
        });
        const packages = (updated.relatedPackages || []).map((p: any) => p.get({ plain: true }));
        res.json({ data: packages, count: packages.length });
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al agregar paquetes al envío:', err);
        res.status(400).json({ error: err?.message || 'Error al agregar paquetes al envío' });
      }
    } catch (error) {
      console.error('Error general al agregar paquetes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Remover un paquete del envío (no permite remover el paquete principal)
  async removePackage(req: any, res: Response) {
    try {
      const { id, paqueteId } = req.params;
      const envio = await this.ShipmentModel.findOne({ where: { shipment_id: id, is_active: 1 } });
      if (!envio) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const pid = parseInt(paqueteId, 10);
      if (envio.package_id === pid) {
        res.status(400).json({ error: 'No se puede remover el paquete principal del envío' });
        return;
      }

      const relation = await this.ShipmentPackageModel.findOne({
        where: { shipment_id: envio.shipment_id, package_id: pid }
      });
      if (!relation) {
        res.status(404).json({ error: 'Relación envío-paquete no encontrada' });
        return;
      }

      const tx = await sequelize.transaction();
      try {
        // Eliminar relación en tabla puente
        await this.ShipmentPackageModel.destroy({
          where: { shipment_id: envio.shipment_id, package_id: pid },
          transaction: tx
        });

        // Verificar si el paquete sigue asociado a otros envíos activos
        const existeEnOtroEnvioActivo = await this.ShipmentModel.findOne({
          where: { is_active: 1 },
          include: [{ model: this.PackageModel, as: 'relatedPackages', where: { package_id: pid }, required: true }],
          transaction: tx
        });

        if (!existeEnOtroEnvioActivo) {
          const paquete = await this.PackageModel.findOne({ where: { package_id: pid }, transaction: tx });
          if (paquete && paquete.status !== 'pendiente') {
            await this.PackageModel.update(
              { status: 'pendiente', updated_at: new Date() },
              { where: { package_id: pid }, transaction: tx }
            );
            await this.PackageHistoryModel.create(
              {
                package_id: pid,
                new_status: 'pendiente',
                comment: 'Paquete removido del envío',
                user_id: req.user?.id || null
              },
              { transaction: tx }
            );
          }
        }

        await tx.commit();

        const updated = await this.ShipmentModel.findOne({
          where: { shipment_id: id },
          include: [{ model: this.PackageModel, as: 'relatedPackages' }]
        });
        const packages = (updated.relatedPackages || []).map((p: any) => p.get({ plain: true }));
        res.json({ data: packages, count: packages.length });
      } catch (err: any) {
        await tx.rollback();
        console.error('Error al remover paquete del envío:', err);
        res.status(400).json({ error: err?.message || 'Error al remover paquete del envío' });
      }
    } catch (error) {
      console.error('Error general al remover paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}