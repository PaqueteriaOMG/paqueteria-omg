import { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize, models as defaultModels } from '../db/sequelize';
import { Paquete } from '../types';

export class PaquetesController {
  private PaqueteModel: any;
  private ClienteModel: any;
  private HistorialModel: any;
  private EnviosPaquetesModel: any;
  private EnvioModel: any;

  constructor(_models?: any) {
    const mdl = _models || defaultModels;
    this.PaqueteModel = mdl.Paquete;
    this.ClienteModel = mdl.Cliente;
    this.HistorialModel = mdl.HistorialPaquetes;
    this.EnviosPaquetesModel = mdl.EnviosPaquetes;
    this.EnvioModel = mdl.Envio;
  }

  private generateTrackingNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PKG${timestamp.slice(-6)}${random}`;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const estado = req.query.estado;
      const search = req.query.search || '';

      const where: any = { paqu_activo: 1 };
      if (estado) where.paqu_estado = estado;

      if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
          { paqu_numero_seguimiento: { [Op.like]: like } },
          { paqu_descripcion: { [Op.like]: like } },
          sequelize.where(sequelize.col('cliente.clie_nombre'), { [Op.like]: like })
        ];
      }

      const result = await this.PaqueteModel.findAndCountAll({
        where,
        include: [{ model: this.ClienteModel, as: 'cliente', required: false }],
        limit,
        offset,
        order: [['paqu_created_at', 'DESC']]
      });

      const rows = result.rows.map((p: any) => {
        const plain = p.get({ plain: true });
        return {
          ...plain,
          id: plain.paqu_id,
          cliente_nombre: plain.cliente?.clie_nombre
        } as Paquete;
      });

      const total = result.count;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows,
        pagination: { page, limit, total, totalPages }
      });
    } catch (error) {
      console.error('Error al obtener paquetes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const paquete = await this.PaqueteModel.findOne({
        where: { paqu_id: id, paqu_activo: 1 },
        include: [{ model: this.ClienteModel, as: 'cliente', required: false }]
      });

      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      const historial = await this.HistorialModel.findAll({
        where: { hipa_paquete_id: id },
        order: [['hipa_fecha_cambio', 'DESC']]
      });

      const plain = paquete.get({ plain: true });
      res.json({
        ...plain,
        id: plain.paqu_id,
        cliente_nombre: plain.cliente?.clie_nombre,
        cliente_email: plain.cliente?.clie_email,
        cliente_telefono: plain.cliente?.clie_telefono,
        historial: historial.map((h: any) => h.get({ plain: true }))
      });
    } catch (error) {
      console.error('Error al obtener paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getByTracking(req: any, res: Response) {
    try {
      const { numero } = req.params;
      const paquete = await this.PaqueteModel.findOne({
        where: {
          paqu_activo: 1,
          [Op.or]: [
            { paqu_numero_seguimiento: numero },
            { paqu_codigo_rastreo: numero }
          ]
        },
        include: [{ model: this.ClienteModel, as: 'cliente', required: false }]
      });

      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      const historial = await this.HistorialModel.findAll({
        where: { hipa_paquete_id: paquete.paqu_id },
        order: [['hipa_fecha_cambio', 'DESC']]
      });

      const plain = paquete.get({ plain: true });
      res.json({
        ...plain,
        id: plain.paqu_id,
        cliente_nombre: plain.cliente?.clie_nombre,
        cliente_email: plain.cliente?.clie_email,
        cliente_telefono: plain.cliente?.clie_telefono,
        historial: historial.map((h: any) => h.get({ plain: true }))
      });
    } catch (error) {
      console.error('Error al obtener paquete por número de seguimiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  private generatePublicCode(): string {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    return `TRK-${ts}-${random.slice(0, 6)}`;
  }

  async create(req: any, res: Response) {
    try {
      const { cliente_id, descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino } = req.body;

      const cliente = await this.ClienteModel.findOne({ where: { clie_id: cliente_id, clie_activo: 1 } });
      if (!cliente) {
        res.status(400).json({ error: 'Cliente no encontrado' });
        return;
      }

      let numero_seguimiento: string | undefined;
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        numero_seguimiento = this.generateTrackingNumber();
        const existing = await this.PaqueteModel.findOne({
          where: {
            [Op.or]: [
              { paqu_numero_seguimiento: numero_seguimiento },
              { paqu_codigo_rastreo: numero_seguimiento }
            ]
          }
        });
        isUnique = !existing;
        attempts++;
      }
      if (!isUnique || !numero_seguimiento) {
        res.status(500).json({ error: 'Error al generar número de seguimiento único' });
        return;
      }

      let public_code: string | undefined;
      let isPublicUnique = false;
      let publicAttempts = 0;
      while (!isPublicUnique && publicAttempts < 10) {
        public_code = this.generatePublicCode();
        const existingPublic = await this.PaqueteModel.findOne({ where: { paqu_codigo_rastreo_publico: public_code } });
        isPublicUnique = !existingPublic;
        publicAttempts++;
      }
      if (!isPublicUnique || !public_code) {
        res.status(500).json({ error: 'Error al generar código de rastreo público' });
        return;
      }

      const pkg = await this.PaqueteModel.create({
        paqu_numero_seguimiento: numero_seguimiento,
        paqu_codigo_rastreo: numero_seguimiento,
        paqu_codigo_rastreo_publico: public_code,
        paqu_cliente_id: cliente_id,
        paqu_descripcion: descripcion,
        paqu_peso: peso,
        paqu_dimensiones: dimensiones,
        paqu_valor_declarado: valor_declarado,
        paqu_direccion_origen: direccion_origen,
        paqu_direccion_destino: direccion_destino,
        paqu_estado: 'pendiente'
      });

      await this.HistorialModel.create({
        hipa_paquete_id: pkg.paqu_id,
        hipa_estado_anterior: null,
        hipa_estado_nuevo: 'pendiente',
        hipa_comentario: 'Paquete creado',
        hipa_usuario_id: req.user?.id || null
      });

      const plain = pkg.get({ plain: true });
      res.status(201).json({ ...plain, id: plain.paqu_id } as Paquete);
    } catch (error) {
      console.error('Error al crear paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino } = req.body;

      const paquete = await this.PaqueteModel.findOne({ where: { paqu_id: id, paqu_activo: 1 } });
      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      if (paquete.paqu_estado === 'entregado') {
        res.status(400).json({ error: 'No se puede actualizar un paquete entregado' });
        return;
      }

      if (descripcion !== undefined) paquete.paqu_descripcion = descripcion;
      if (peso !== undefined) paquete.paqu_peso = peso;
      if (dimensiones !== undefined) paquete.paqu_dimensiones = dimensiones;
      if (valor_declarado !== undefined) paquete.paqu_valor_declarado = valor_declarado;
      if (direccion_origen !== undefined) paquete.paqu_direccion_origen = direccion_origen;
      if (direccion_destino !== undefined) paquete.paqu_direccion_destino = direccion_destino;
      paquete.paqu_updated_at = new Date();

      await paquete.save();

      await this.HistorialModel.create({
        hipa_paquete_id: paquete.paqu_id,
        hipa_estado_anterior: paquete.paqu_estado,
        hipa_estado_nuevo: paquete.paqu_estado,
        hipa_comentario: 'Paquete actualizado',
        hipa_usuario_id: req.user?.id || null
      });

      const plain = paquete.get({ plain: true });
      res.json({ ...plain, id: plain.paqu_id } as Paquete);
    } catch (error) {
      console.error('Error al actualizar paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.body;

      const paquete = await this.PaqueteModel.findOne({ where: { paqu_id: id, paqu_activo: 1 } });
      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      const estadoAnterior = paquete.paqu_estado as string;
      const allowedTransitions: Record<string, string[]> = {
        pendiente: ['en_transito'],
        en_transito: ['entregado', 'devuelto'],
        devuelto: ['pendiente'],
        entregado: []
      };

      if (!allowedTransitions[estadoAnterior] || !allowedTransitions[estadoAnterior].includes(estado)) {
        res.status(409).json({ error: `Transición de estado no permitida: ${estadoAnterior} -> ${estado}` });
        return;
      }

      paquete.paqu_estado = estado;
      paquete.paqu_updated_at = new Date();
      await paquete.save();

      await this.HistorialModel.create({
        hipa_paquete_id: paquete.paqu_id,
        hipa_estado_anterior: estadoAnterior,
        hipa_estado_nuevo: estado,
        hipa_comentario: comentario || `Estado cambiado a ${estado}`,
        hipa_usuario_id: req.user?.id || null
      });

      const plain = paquete.get({ plain: true });
      res.json({ ...plain, id: plain.paqu_id } as Paquete);
    } catch (error) {
      console.error('Error al actualizar estado del paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Creación masiva de paquetes (bulk)
  async bulkCreate(req: any, res: Response) {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      res.status(400).json({ error: 'Se requiere un arreglo items con al menos 1 elemento' });
      return;
    }

    const tx = await sequelize.transaction();
    try {
      const created: Paquete[] = [];
      for (const item of items) {
        const { cliente_id, descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino } = item;

        const cliente = await this.ClienteModel.findOne({ where: { clie_id: cliente_id, clie_activo: 1 }, transaction: tx });
        if (!cliente) throw new Error(`Cliente ${cliente_id} no encontrado`);

        let numero_seguimiento: string | undefined;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          numero_seguimiento = this.generateTrackingNumber();
          const existing = await this.PaqueteModel.findOne({
            where: {
              [Op.or]: [
                { paqu_numero_seguimiento: numero_seguimiento },
                { paqu_codigo_rastreo: numero_seguimiento }
              ]
            },
            transaction: tx
          });
          isUnique = !existing;
          attempts++;
        }
        if (!isUnique || !numero_seguimiento) throw new Error('No fue posible generar un número de seguimiento único');

        let public_code: string | undefined;
        let isPublicUnique = false;
        let publicAttempts = 0;
        while (!isPublicUnique && publicAttempts < 10) {
          public_code = this.generatePublicCode();
          const existingPublic = await this.PaqueteModel.findOne({ where: { paqu_codigo_rastreo_publico: public_code }, transaction: tx });
          isPublicUnique = !existingPublic;
          publicAttempts++;
        }
        if (!isPublicUnique || !public_code) throw new Error('No fue posible generar un código público único');

        const pkg = await this.PaqueteModel.create({
          paqu_numero_seguimiento: numero_seguimiento,
          paqu_codigo_rastreo: numero_seguimiento,
          paqu_codigo_rastreo_publico: public_code,
          paqu_cliente_id: cliente_id,
          paqu_descripcion: descripcion,
          paqu_peso: peso,
          paqu_dimensiones: dimensiones,
          paqu_valor_declarado: valor_declarado,
          paqu_direccion_origen: direccion_origen,
          paqu_direccion_destino: direccion_destino,
          paqu_estado: 'pendiente'
        }, { transaction: tx });

        await this.HistorialModel.create({
          hipa_paquete_id: pkg.paqu_id,
          hipa_estado_anterior: null,
          hipa_estado_nuevo: 'pendiente',
          hipa_comentario: 'Paquete creado (bulk)',
          hipa_usuario_id: req.user?.id || null
        }, { transaction: tx });

        const plain = pkg.get({ plain: true });
        created.push({ ...(plain as any), id: plain.paqu_id } as Paquete);
      }

      await tx.commit();
      res.status(201).json(created);
    } catch (error: any) {
      await tx.rollback();
      console.error('Error en creación masiva de paquetes:', error);
      res.status(400).json({ error: error?.message || 'Error al crear paquetes en bulk' });
    }
  }

  // Generación de etiqueta SVG para impresión
  private buildLabelSVG(pkg: any): string {
    const safe = (v: any) => String(v ?? '').replace(/[<&>]/g, (c: string) => ({'<':'&lt;','>':'&gt;','&':'&amp;'} as any)[c]);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect x="5" y="5" width="390" height="240" rx="8" ry="8" fill="#fff" stroke="#111"/>
  <text x="20" y="35" font-family="Arial" font-size="18" font-weight="bold">Etiqueta de Envío</text>
  <text x="20" y="65" font-family="Arial" font-size="14">Tracking: ${safe(pkg.paqu_numero_seguimiento)}</text>
  <text x="20" y="90" font-family="Arial" font-size="12">Cliente: ${safe(pkg.cliente_nombre ?? '')}</text>
  <text x="20" y="110" font-family="Arial" font-size="12">Origen: ${safe(pkg.paqu_direccion_origen)}</text>
  <text x="20" y="130" font-family="Arial" font-size="12">Destino: ${safe(pkg.paqu_direccion_destino)}</text>
  <text x="20" y="160" font-family="Arial" font-size="12">Descripción: ${safe(pkg.paqu_descripcion)}</text>
  <text x="20" y="180" font-family="Arial" font-size="12">Peso: ${safe(pkg.paqu_peso)} kg</text>
  <text x="20" y="200" font-family="Arial" font-size="12">Estado: ${safe(pkg.paqu_estado)}</text>
</svg>`;
  }

  async getLabel(req: any, res: Response) {
    try {
      const { id } = req.params;
      const paquete = await this.PaqueteModel.findOne({
        where: { paqu_id: id, paqu_activo: 1 },
        include: [{ model: this.ClienteModel, as: 'cliente', required: false, attributes: ['clie_nombre'] }]
      });
      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }
      const plain = paquete.get({ plain: true });
      const svg = this.buildLabelSVG({
        ...plain,
        id: plain.paqu_id,
        cliente_nombre: plain.cliente?.clie_nombre
      });
      res.json({ svg });
    } catch (error) {
      console.error('Error al generar etiqueta:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Endpoint dedicado para historial de un paquete
  async getHistory(req: any, res: Response) {
    try {
      const { id } = req.params;

      const paquete = await this.PaqueteModel.findOne({ where: { paqu_id: id, paqu_activo: 1 } });
      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      const historial = await this.HistorialModel.findAll({
        where: { hipa_paquete_id: id },
        order: [['hipa_fecha_cambio', 'DESC']]
      });

      res.json(historial.map((h: any) => h.get({ plain: true })));
    } catch (error) {
      console.error('Error al obtener historial del paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;

      const paquete = await this.PaqueteModel.findOne({ where: { paqu_id: id, paqu_activo: 1 } });
      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      if (paquete.paqu_estado === 'en_transito' || paquete.paqu_estado === 'entregado') {
        res.status(400).json({ error: 'No se puede eliminar un paquete en tránsito o entregado' });
        return;
      }

      const associated = await this.EnviosPaquetesModel.findOne({ where: { enpa_paquete_id: id } });
      if (associated) {
        res.status(400).json({ error: 'No se puede eliminar un paquete asociado a un envío' });
        return;
      }

      await this.PaqueteModel.update(
        { paqu_activo: 0, paqu_updated_at: new Date() },
        { where: { paqu_id: id } }
      );

      res.json({ message: 'Paquete eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Endpoint público: rastreo por código público
  async getByPublicCode(req: any, res: Response) {
    try {
      const { code } = req.params;

      const paquete = await this.PaqueteModel.findOne({
        where: { paqu_codigo_rastreo_publico: code, paqu_activo: 1 },
        attributes: ['paqu_id', 'paqu_codigo_rastreo_publico', 'paqu_estado', 'paqu_created_at', 'paqu_updated_at']
      });

      if (!paquete) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }

      let envioIds: number[] = [];
      const bridges = await this.EnviosPaquetesModel.findAll({
        where: { enpa_paquete_id: paquete.paqu_id },
        attributes: ['enpa_envio_id']
      });
      envioIds = bridges.map((b: any) => Number(b.enpa_envio_id));

      let eta: Date | null = null;
      const latestEnvio = await this.EnvioModel.findOne({
        where: {
          envi_activo: 1,
          [Op.or]: [
            { envi_paquete_id: paquete.paqu_id },
            envioIds.length ? { envi_id: { [Op.in]: envioIds } } : { envi_id: -1 }
          ]
        },
        order: [['envi_updated_at', 'DESC']],
        attributes: ['envi_fecha_envio_estimada']
      });
      if (latestEnvio) {
        eta = latestEnvio.envi_fecha_envio_estimada || null;
      }

      const historial = await this.HistorialModel.findAll({
        where: { hipa_paquete_id: paquete.paqu_id },
        attributes: ['hipa_estado_nuevo', 'hipa_comentario', 'hipa_fecha_cambio'],
        order: [['hipa_fecha_cambio', 'DESC']]
      });
      const events = historial.map((h: any) => h.get({ plain: true })).map((h: any) => ({
        status: h.hipa_estado_nuevo,
        comment: h.hipa_comentario,
        date: h.hipa_fecha_cambio
      }));

      res.json({
        code: paquete.paqu_codigo_rastreo_publico,
        status: paquete.paqu_estado,
        created_at: paquete.paqu_created_at,
        updated_at: paquete.paqu_updated_at,
        eta,
        history: events
      });
    } catch (error) {
      console.error('Error en rastreo público:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}