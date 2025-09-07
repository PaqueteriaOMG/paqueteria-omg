import { Response } from 'express';
import { Pool } from 'mysql2/promise';
import { Paquete } from '../types';

export class PaquetesController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
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

      let query = `
        SELECT p.*, p.paqu_id AS id, c.clie_nombre as cliente_nombre 
        FROM Paquetes p 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE p.paqu_activo = 1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM Paquetes p WHERE p.paqu_activo = 1';
      const params: any[] = [];

      if (estado) {
        query += ' AND p.paqu_estado = ?';
        countQuery += ' AND p.paqu_estado = ?';
        params.push(estado);
      }

      if (search) {
        query += ' AND (p.paqu_numero_seguimiento LIKE ? OR p.paqu_descripcion LIKE ? OR c.clie_nombre LIKE ?)';
        countQuery += ' AND EXISTS (SELECT 1 FROM Clientes c2 WHERE c2.clie_id = p.paqu_cliente_id AND (p.paqu_numero_seguimiento LIKE ? OR p.paqu_descripcion LIKE ? OR c2.clie_nombre LIKE ?))';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY p.paqu_created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await this.db.execute(query, params);
      const [countRows] = await this.db.execute(countQuery, params.slice(0, -2));
      
      const total = (countRows as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows as Paquete[],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error al obtener paquetes:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      
      const [rows] = await this.db.execute(`
        SELECT p.*, p.paqu_id AS id, c.clie_nombre as cliente_nombre, c.clie_email as cliente_email, c.clie_telefono as cliente_telefono
        FROM Paquetes p 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE p.paqu_id = ? AND p.paqu_activo = 1
      `, [id]);
      const paquetes = rows as any[];

      if (paquetes.length === 0) {
        res.status(404).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      // Obtener historial del paquete
      const [historial] = await this.db.execute(
        'SELECT * FROM HistorialPaquetes WHERE hipa_paquete_id = ? ORDER BY hipa_fecha_cambio DESC',
        [id]
      );

      const paquete = paquetes[0];
      paquete.historial = historial;

      res.json(paquete);
    } catch (error) {
      console.error('Error al obtener paquete:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getByTracking(req: any, res: Response) {
    try {
      const { numero } = req.params;
      
      const [rows] = await this.db.execute(`
        SELECT p.*, p.paqu_id AS id, c.clie_nombre as cliente_nombre, c.clie_email as cliente_email, c.clie_telefono as cliente_telefono
        FROM Paquetes p 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE (p.paqu_numero_seguimiento = ? OR p.paqu_codigo_rastreo = ?) AND p.paqu_activo = 1
      `, [numero, numero]);
      const paquetes = rows as any[];

      if (paquetes.length === 0) {
        res.status(404).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      // Obtener historial del paquete
      const [historial] = await this.db.execute(
         'SELECT * FROM HistorialPaquetes WHERE hipa_paquete_id = ? ORDER BY hipa_fecha_cambio DESC',
         [paquetes[0].id]
       );

      const paquete = paquetes[0];
      paquete.historial = historial;

      res.json(paquete);
    } catch (error) {
      console.error('Error al obtener paquete por número de seguimiento:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
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

      // Verificar que el cliente existe
      const [clienteExists] = await this.db.execute(
        'SELECT clie_id AS id FROM Clientes WHERE clie_id = ? AND clie_activo = 1',
        [cliente_id]
      );
      
      if ((clienteExists as any[]).length === 0) {
        res.status(400).json({
          error: 'Cliente no encontrado'
        });
        return;
      }

      // Generar número de seguimiento único
      let numero_seguimiento: string | undefined;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        numero_seguimiento = this.generateTrackingNumber();
        const [existing] = await this.db.execute(
          'SELECT paqu_id AS id FROM Paquetes WHERE paqu_numero_seguimiento = ? OR paqu_codigo_rastreo = ?',
          [numero_seguimiento, numero_seguimiento]
        );
        isUnique = (existing as any[]).length === 0;
        attempts++;
      }

      if (!isUnique || !numero_seguimiento) {
        res.status(500).json({
          error: 'Error al generar número de seguimiento único'
        });
        return;
      }

      // Generar código público único
      let public_code: string | undefined;
      let isPublicUnique = false;
      let publicAttempts = 0;
      while (!isPublicUnique && publicAttempts < 10) {
        public_code = this.generatePublicCode();
        const [existingPublic] = await this.db.execute(
          'SELECT paqu_id AS id FROM Paquetes WHERE paqu_codigo_rastreo_publico = ?',
          [public_code]
        );
        isPublicUnique = (existingPublic as any[]).length === 0;
        publicAttempts++;
      }
      if (!isPublicUnique || !public_code) {
        res.status(500).json({ error: 'Error al generar código de rastreo público' });
        return;
      }

      const [result] = await this.db.execute(`
        INSERT INTO Paquetes (
          paqu_numero_seguimiento, paqu_codigo_rastreo, paqu_codigo_rastreo_publico, paqu_cliente_id, paqu_descripcion, paqu_peso, paqu_dimensiones, 
          paqu_valor_declarado, paqu_direccion_origen, paqu_direccion_destino, paqu_estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
      `, [numero_seguimiento, numero_seguimiento, public_code, cliente_id, descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino]);

      const insertId = (result as any).insertId;
      
      // Crear entrada en historial
      await this.db.execute(
         'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, NULL, "pendiente", "Paquete creado", ?)',
         [insertId, req.user?.id || null]
       );
      
      const [newPaquete] = await this.db.execute(
        'SELECT p.*, p.paqu_id AS id FROM Paquetes p WHERE p.paqu_id = ?',
        [insertId]
      );

      res.status(201).json((newPaquete as Paquete[])[0]);
    } catch (error) {
      console.error('Error al crear paquete:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino } = req.body;

      // Verificar si el paquete existe
      const [existingPaquete] = await this.db.execute(
        'SELECT * FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1',
        [id]
      );
      
      if ((existingPaquete as any[]).length === 0) {
        res.status(404).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      const paquete = (existingPaquete as any[])[0];
      
      // No permitir actualizar paquetes entregados
      if (paquete.paqu_estado === 'entregado') {
        res.status(400).json({
          error: 'No se puede actualizar un paquete entregado'
        });
        return;
      }

      await this.db.execute(`
        UPDATE Paquetes SET 
          paqu_descripcion = ?, paqu_peso = ?, paqu_dimensiones = ?, paqu_valor_declarado = ?, 
          paqu_direccion_origen = ?, paqu_direccion_destino = ?, paqu_updated_at = CURRENT_TIMESTAMP 
        WHERE paqu_id = ?
      `, [descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino, id]);

      const [updatedPaquete] = await this.db.execute(
        'SELECT p.*, p.paqu_id AS id FROM Paquetes p WHERE p.paqu_id = ?',
        [id]
      );

      res.json((updatedPaquete as Paquete[])[0]);
    } catch (error) {
      console.error('Error al actualizar paquete:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.body;

      // Verificar si el paquete existe
      const [existingPaquete] = await this.db.execute(
        'SELECT * FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1',
        [id]
      );
      
      if ((existingPaquete as any[]).length === 0) {
        res.status(404).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      const paquete = (existingPaquete as any[])[0];
      const estadoAnterior = paquete.paqu_estado as string;

      // Validación de máquina de estados
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

      // Actualizar estado del paquete
      await this.db.execute(
        'UPDATE Paquetes SET paqu_estado = ?, paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?',
        [estado, id]
      );

      // Crear entrada en historial
      await this.db.execute(
         'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
         [id, estadoAnterior, estado, comentario || `Estado cambiado a ${estado}` , req.user?.id || null]
       );

      const [updatedPaquete] = await this.db.execute(
        'SELECT p.*, p.paqu_id AS id FROM Paquetes p WHERE p.paqu_id = ?',
        [id]
      );

      res.json((updatedPaquete as Paquete[])[0]);
    } catch (error) {
      console.error('Error al actualizar estado del paquete:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Creación masiva de paquetes (bulk)
  async bulkCreate(req: any, res: Response) {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      res.status(400).json({ error: 'Se requiere un arreglo items con al menos 1 elemento' });
      return;
    }

    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      const createdIds: number[] = [];

      for (const item of items) {
        const { cliente_id, descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino } = item;

        // Verificar cliente
        const [clienteExists] = await conn.execute(
          'SELECT clie_id AS id FROM Clientes WHERE clie_id = ? AND clie_activo = 1',
          [cliente_id]
        );
        if ((clienteExists as any[]).length === 0) {
          throw new Error(`Cliente ${cliente_id} no encontrado`);
        }

        // Generar número de seguimiento único
        let numero_seguimiento: string | undefined;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          numero_seguimiento = this.generateTrackingNumber();
          const [existing] = await conn.execute(
            'SELECT paqu_id AS id FROM Paquetes WHERE paqu_numero_seguimiento = ? OR paqu_codigo_rastreo = ?',
            [numero_seguimiento, numero_seguimiento]
          );
          isUnique = (existing as any[]).length === 0;
          attempts++;
        }
        if (!isUnique || !numero_seguimiento) {
          throw new Error('No fue posible generar un número de seguimiento único');
        }

        // Generar código público único
        let public_code: string | undefined;
        let isPublicUnique = false;
        let publicAttempts = 0;
        while (!isPublicUnique && publicAttempts < 10) {
          public_code = this.generatePublicCode();
          const [existingPublic] = await conn.execute(
            'SELECT paqu_id AS id FROM Paquetes WHERE paqu_codigo_rastreo_publico = ?',
            [public_code]
          );
          isPublicUnique = (existingPublic as any[]).length === 0;
          publicAttempts++;
        }
        if (!isPublicUnique || !public_code) {
          throw new Error('No fue posible generar un código público único');
        }

        const [result] = await conn.execute(
          `INSERT INTO Paquetes (
            paqu_numero_seguimiento, paqu_codigo_rastreo, paqu_codigo_rastreo_publico, paqu_cliente_id, paqu_descripcion, paqu_peso, paqu_dimensiones,
            paqu_valor_declarado, paqu_direccion_origen, paqu_direccion_destino, paqu_estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
          [numero_seguimiento, numero_seguimiento, public_code, cliente_id, descripcion, peso, dimensiones, valor_declarado, direccion_origen, direccion_destino]
        );

        const insertId = (result as any).insertId as number;
        createdIds.push(insertId);

        await conn.execute(
          'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, NULL, "pendiente", "Paquete creado (bulk)", ?)',
          [insertId, req.user?.id || null]
        );
      }

      await conn.commit();

      const [rows] = await this.db.execute(
        `SELECT p.*, p.paqu_id AS id FROM Paquetes p WHERE p.paqu_id IN (${createdIds.map(() => '?').join(',')})`,
        [...createdIds]
      );

      res.status(201).json(rows as Paquete[]);
    } catch (error: any) {
      await conn.rollback();
      console.error('Error en creación masiva de paquetes:', error);
      res.status(400).json({ error: error?.message || 'Error al crear paquetes en bulk' });
    } finally {
      conn.release();
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
      const [rows] = await this.db.execute(
        `SELECT p.*, p.paqu_id AS id, c.clie_nombre as cliente_nombre
         FROM Paquetes p LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id
         WHERE p.paqu_id = ? AND p.paqu_activo = 1`,
        [id]
      );
      const paquetes = rows as any[];
      if (paquetes.length === 0) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }
      const svg = this.buildLabelSVG(paquetes[0]);
      // Devolver SVG como string dentro de JSON para mantener el envelope estándar
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
  
      // Verificar existencia del paquete activo
      const [pkgRows] = await this.db.execute('SELECT paqu_id AS id FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1', [id]);
      if ((pkgRows as any[]).length === 0) {
        res.status(404).json({ error: 'Paquete no encontrado' });
        return;
      }
  
      const [historial] = await this.db.execute(
        'SELECT * FROM HistorialPaquetes WHERE hipa_paquete_id = ? ORDER BY hipa_fecha_cambio DESC',
        [id]
      );
  
      res.json(historial);
    } catch (error) {
      console.error('Error al obtener historial del paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si el paquete existe
      const [existingPaquete] = await this.db.execute(
        'SELECT * FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1',
        [id]
      );
      
      if ((existingPaquete as any[]).length === 0) {
        res.status(404).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      const paquete = (existingPaquete as any[])[0];
      
      // No permitir eliminar paquetes en tránsito o entregados
      if (paquete.paqu_estado === 'en_transito' || paquete.paqu_estado === 'entregado') {
        res.status(400).json({
          error: 'No se puede eliminar un paquete en tránsito o entregado'
        });
        return;
      }

      // Verificar si el paquete está asociado a un envío
      const [associatedShipment] = await this.db.execute(
         'SELECT 1 FROM EnviosPaquetes WHERE enpa_paquete_id = ? LIMIT 1',
         [id]
       );
      
      if ((associatedShipment as any[]).length > 0) {
        res.status(400).json({
          error: 'No se puede eliminar un paquete asociado a un envío'
        });
        return;
      }

      // Soft delete
      await this.db.execute(
        'UPDATE Paquetes SET paqu_activo = 0, paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?',
        [id]
      );

      res.json({
        message: 'Paquete eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar paquete:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Endpoint público: rastreo por código público
  async getByPublicCode(req: any, res: Response) {
    try {
      const { code } = req.params;
      const [rows] = await this.db.execute(
        `SELECT 
        p.paqu_id AS id,
        p.paqu_codigo_rastreo_publico,
        p.paqu_estado,
        p.paqu_created_at,
        p.paqu_updated_at,
        (
        SELECT e.envi_fecha_envio_estimada 
        FROM Envios e 
        WHERE e.envi_activo = 1 
        AND (
        e.envi_paquete_id = p.paqu_id 
        OR EXISTS (
        SELECT 1 FROM EnviosPaquetes ep 
        WHERE ep.enpa_envio_id = e.envi_id AND ep.enpa_paquete_id = p.paqu_id
        )
        )
        ORDER BY e.envi_updated_at DESC
        LIMIT 1
        ) AS eta
        FROM Paquetes p 
        WHERE p.paqu_codigo_rastreo_publico = ? AND p.paqu_activo = 1`,
       [code]
     );
     const list = rows as any[];
     if (list.length === 0) {
       res.status(404).json({ error: 'Paquete no encontrado' });
       return;
     }
      const pkg = list[0];
      const [historial] = await this.db.execute(
        'SELECT hipa_estado_nuevo, hipa_comentario, hipa_fecha_cambio FROM HistorialPaquetes WHERE hipa_paquete_id = ? ORDER BY hipa_fecha_cambio DESC',
        [pkg.id]
      );
      const events = (historial as any[]).map(h => ({
        status: h.hipa_estado_nuevo,
        comment: h.hipa_comentario,
        date: h.hipa_fecha_cambio
      }));

      res.json({
        code: pkg.paqu_codigo_rastreo_publico,
        status: pkg.paqu_estado,
        created_at: pkg.paqu_created_at,
        updated_at: pkg.paqu_updated_at,
        eta: pkg.eta ?? null,
        history: events
      });
    } catch (error) {
      console.error('Error en rastreo público:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}