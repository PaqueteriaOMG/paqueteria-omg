import { Response } from 'express';
import { Pool } from 'mysql2/promise';

export class EnviosController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const estado = req.query.estado;
      const search = req.query.search || '';

      let query = `
        SELECT e.*, p.paqu_numero_seguimiento AS numero_seguimiento, c.clie_nombre as cliente_nombre 
        FROM Envios e 
        LEFT JOIN Paquetes p ON e.envi_paquete_id = p.paqu_id 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE e.envi_activo = 1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM Envios e WHERE e.envi_activo = 1';
      const params: any[] = [];

      if (estado) {
        query += ' AND e.envi_estado = ?';
        countQuery += ' AND e.envi_estado = ?';
        params.push(estado);
      }

      if (search) {
        query += ' AND (p.paqu_numero_seguimiento LIKE ? OR c.clie_nombre LIKE ? OR e.envi_direccion_destino LIKE ?)';
        countQuery += ' AND EXISTS (SELECT 1 FROM Paquetes p2 LEFT JOIN Clientes c2 ON p2.paqu_cliente_id = c2.clie_id WHERE p2.paqu_id = e.envi_paquete_id AND (p2.paqu_numero_seguimiento LIKE ? OR c2.clie_nombre LIKE ? OR e.envi_direccion_destino LIKE ?))';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY e.envi_created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await this.db.execute(query, params);
      const [countRows] = await this.db.execute(countQuery, params.slice(0, -2));

      const total = (countRows as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error al obtener envíos:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getById(req: any, res: Response) {
    try {
      const { id } = req.params;

      const [rows] = await this.db.execute(`
        SELECT e.*, p.paqu_numero_seguimiento AS numero_seguimiento, p.paqu_descripcion as paquete_descripcion, c.clie_nombre as cliente_nombre, c.clie_email as cliente_email
        FROM Envios e 
        LEFT JOIN Paquetes p ON e.envi_paquete_id = p.paqu_id 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE e.envi_id = ? AND e.envi_activo = 1
      `, [id]);
      const envios = rows as any[];

      if (envios.length === 0) {
        res.status(404).json({
          error: 'Envío no encontrado'
        });
        return;
      }

      res.json(envios[0]);
    } catch (error) {
      console.error('Error al obtener envío:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getByTracking(req: any, res: Response) {
    try {
      const { numero } = req.params;

      const [rows] = await this.db.execute(`
        SELECT e.*, p.paqu_numero_seguimiento AS numero_seguimiento, p.paqu_descripcion as paquete_descripcion, c.clie_nombre as cliente_nombre, c.clie_email as cliente_email
        FROM Envios e 
        LEFT JOIN Paquetes p ON e.envi_paquete_id = p.paqu_id 
        LEFT JOIN Clientes c ON p.paqu_cliente_id = c.clie_id 
        WHERE p.paqu_numero_seguimiento = ? AND e.envi_activo = 1
      `, [numero]);
      const envios = rows as any[];

      if (envios.length === 0) {
        res.status(404).json({
          error: 'Envío no encontrado'
        });
        return;
      }

      res.json(envios[0]);
    } catch (error) {
      console.error('Error al obtener envío por número de seguimiento:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async create(req: any, res: Response) {
    try {
      const { paquete_id, direccion_origen, direccion_destino, fecha_envio_estimada } = req.body;

      // Verificar que el paquete existe
      const [paqueteExists] = await this.db.execute(
        'SELECT paqu_id AS id, paqu_estado AS estado FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1',
        [paquete_id]
      );

      if ((paqueteExists as any[]).length === 0) {
        res.status(400).json({
          error: 'Paquete no encontrado'
        });
        return;
      }

      const paquete = (paqueteExists as any[])[0];
      if (paquete.estado !== 'pendiente') {
        res.status(400).json({
          error: 'Solo se pueden crear envíos para paquetes en estado pendiente'
        });
        return;
      }

      const [result] = await this.db.execute(`
        INSERT INTO Envios (envi_paquete_id, envi_direccion_origen, envi_direccion_destino, envi_estado, envi_fecha_envio_estimada)
        VALUES (?, ?, ?, 'en_transito', ?)
      `, [paquete_id, direccion_origen, direccion_destino, (fecha_envio_estimada ?? null)]);

      const insertId = (result as any).insertId;

      // Actualizar estado del paquete a en_transito
      await this.db.execute(
        'UPDATE Paquetes SET paqu_estado = ?, paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?',
        ['en_transito', paquete_id]
      );

      // Registrar en historial del paquete
      await this.db.execute(
        'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
        [paquete_id, 'pendiente', 'en_transito', 'Creación de envío', req.user?.id || null]
      );

      // Asociar paquete al envío en la tabla puente
      try {
        await this.db.execute(
        'INSERT IGNORE INTO EnviosPaquetes (enpa_envio_id, enpa_paquete_id) VALUES (?, ?)',
           [insertId, paquete_id]
        );
      } catch (e) {
        // Ignorar errores no críticos de duplicado
      }

      const [created] = await this.db.execute('SELECT * FROM Envios WHERE envi_id = ?', [insertId]);
      res.status(201).json((created as any[])[0]);
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

      const [existingEnvio] = await this.db.execute('SELECT * FROM Envios WHERE envi_id = ? AND envi_activo = 1', [id]);
      const envios = existingEnvio as any[];
      if (envios.length === 0) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }

      const envio = envios[0];
      if (envio.estado === 'entregado' || envio.estado === 'cancelado') {
        res.status(400).json({ error: 'No se puede editar un envío entregado o cancelado' });
        return;
      }

      const conn = await this.db.getConnection();
      try {
        await conn.beginTransaction();

        // Reasignación de paquete (opcional)
        if (paquete_id && paquete_id !== envio.paquete_id) {
          const [newPkgRows] = await conn.execute('SELECT paqu_id AS id, paqu_estado AS estado FROM Paquetes WHERE paqu_id = ? AND paqu_activo = 1', [paquete_id]);
          const newPkgs = newPkgRows as any[];
          if (newPkgs.length === 0) {
            throw new Error('Paquete destino no encontrado');
          }
          if (newPkgs[0].estado !== 'pendiente') {
            throw new Error('Solo se puede reasignar a un paquete en estado pendiente');
          }

          // Revertir paquete anterior a pendiente
          await conn.execute('UPDATE Paquetes SET paqu_estado = "pendiente", paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [envio.paquete_id]);
          await conn.execute('INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)', [envio.paquete_id, envio.estado, 'pendiente', 'Reasignación de envío: paquete liberado', req.user?.id || null]);

          // Marcar nuevo paquete en tránsito
          await conn.execute('UPDATE Paquetes SET paqu_estado = "en_transito", paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [paquete_id]);
          await conn.execute('INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)', [paquete_id, 'pendiente', 'en_transito', 'Reasignación de envío: paquete asignado', req.user?.id || null]);
        }

        // Construir SET dinámico para actualización de campos
        const fields: string[] = [];
        const values: any[] = [];
        if (direccion_origen !== undefined) { fields.push('envi_direccion_origen = ?'); values.push(direccion_origen); }
        if (direccion_destino !== undefined) { fields.push('envi_direccion_destino = ?'); values.push(direccion_destino); }
        if (fecha_envio_estimada !== undefined) { fields.push('envi_fecha_envio_estimada = ?'); values.push(fecha_envio_estimada); }
        if (paquete_id && paquete_id !== envio.paquete_id) { fields.push('envi_paquete_id = ?'); values.push(paquete_id); }

        if (fields.length > 0) {
          fields.push('envi_updated_at = CURRENT_TIMESTAMP');
          const sql = `UPDATE Envios SET ${fields.join(', ')} WHERE envi_id = ?`;
          values.push(id);
          await conn.execute(sql, values);
        }

        await conn.commit();

        const [updated] = await this.db.execute('SELECT * FROM Envios WHERE envi_id = ?', [id]);
        res.json((updated as any[])[0]);
      } catch (err: any) {
        await conn.rollback();
        console.error('Error al actualizar envío:', err);
        res.status(400).json({ error: err?.message || 'Error al actualizar envío' });
      } finally {
        conn.release();
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

      // Verificar si el envío existe
      const [existingEnvio] = await this.db.execute(
        'SELECT * FROM Envios WHERE envi_id = ? AND envi_activo = 1',
        [id]
      );

      if ((existingEnvio as any[]).length === 0) {
        res.status(404).json({
          error: 'Envío no encontrado'
        });
        return;
      }

      const envio = (existingEnvio as any[])[0];
      const estadoAnterior = envio.estado as string;

      // Validación de máquina de estados para envíos
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

      // Actualizar estado del envío
      await this.db.execute(
        'UPDATE Envios SET envi_estado = ?, envi_updated_at = CURRENT_TIMESTAMP WHERE envi_id = ?',
        [estado, id]
      );

      // Obtener todos los paquetes asociados (principal + tabla puente)
      const [mapRows] = await this.db.execute('SELECT enpa_paquete_id AS paquete_id FROM EnviosPaquetes WHERE enpa_envio_id = ?', [id]);
      const mapped = (mapRows as any[]).map(r => r.paquete_id).filter(Boolean);
      const idsSet = new Set<number>();
      if (envio.paquete_id) idsSet.add(Number(envio.paquete_id));
      for (const pid of mapped) idsSet.add(Number(pid));
      const paqueteIds = Array.from(idsSet);

      let paqueteEstado: string | null = null;
      if (estado === 'entregado') paqueteEstado = 'entregado';
      else if (estado === 'devuelto') paqueteEstado = 'devuelto';
      else if (estado === 'en_transito') paqueteEstado = 'en_transito';
      else if (estado === 'cancelado') paqueteEstado = 'pendiente';

      if (paqueteIds.length > 0 && paqueteEstado) {
        // Obtener estados actuales de paquetes
        const placeholders = paqueteIds.map(() => '?').join(',');
        const [pkgRows] = await this.db.execute(`SELECT paqu_id AS id, paqu_estado AS estado FROM Paquetes WHERE paqu_id IN (${placeholders})`, paqueteIds);
        const currentById = new Map<number, string>((pkgRows as any[]).map((r: any) => [Number(r.id), String(r.estado)]));

        for (const pid of paqueteIds) {
          await this.db.execute('UPDATE Paquetes SET paqu_estado = ?, paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [paqueteEstado, pid]);
          await this.db.execute(
            'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
            [pid, currentById.get(pid) || estadoAnterior, paqueteEstado, comentario || `Envío ${estado}`, req.user?.id || null]
          );
        }
      }

      const [updatedEnvio] = await this.db.execute(
        'SELECT * FROM Envios WHERE envi_id = ?',
        [id]
      );

      res.json((updatedEnvio as any[])[0]);
    } catch (error) {
      console.error('Error al actualizar estado del envío:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si el envío existe
      const [existingEnvio] = await this.db.execute(
        'SELECT * FROM Envios WHERE envi_id = ? AND envi_activo = 1',
        [id]
      );

      if ((existingEnvio as any[]).length === 0) {
        res.status(404).json({
          error: 'Envío no encontrado'
        });
        return;
      }

      const envio = (existingEnvio as any[])[0];

      // No permitir eliminar envíos entregados
      if (envio.estado === 'entregado') {
        res.status(400).json({
          error: 'No se puede eliminar un envío entregado'
        });
        return;
      }

      const conn = await this.db.getConnection();
      try {
        await conn.beginTransaction();

        // Soft delete del envío
        await conn.execute(
          'UPDATE Envios SET envi_activo = 0, envi_updated_at = CURRENT_TIMESTAMP WHERE envi_id = ?',
          [id]
        );

        // Obtener todos los paquetes asociados
        const [mapRows] = await conn.execute('SELECT enpa_paquete_id AS paquete_id FROM EnviosPaquetes WHERE enpa_envio_id = ?', [id]);
        const mapped = (mapRows as any[]).map(r => r.paquete_id).filter(Boolean);
        const idsSet = new Set<number>();
        if (envio.paquete_id) idsSet.add(Number(envio.paquete_id));
        for (const pid of mapped) idsSet.add(Number(pid));
        const paqueteIds = Array.from(idsSet);

        // Revertir estado de paquetes a pendiente y registrar historial
        if (paqueteIds.length > 0) {
          const placeholders = paqueteIds.map(() => '?').join(',');
          const [pkgRows] = await conn.execute(`SELECT paqu_id AS id, paqu_estado AS estado FROM Paquetes WHERE paqu_id IN (${placeholders})`, paqueteIds);
          const currentById = new Map<number, string>((pkgRows as any[]).map((r: any) => [Number(r.id), String(r.estado)]));

          for (const pid of paqueteIds) {
            await conn.execute('UPDATE Paquetes SET paqu_estado = "pendiente", paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [pid]);
            await conn.execute(
              'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
              [pid, currentById.get(pid) || envio.estado, 'pendiente', 'Envío eliminado (soft delete)', req.user?.id || null]
            );
          }
        }

        // Eliminar asociaciones de la tabla puente
        await conn.execute('DELETE FROM EnviosPaquetes WHERE enpa_envio_id = ?', [id]);

        await conn.commit();

        res.json({
          message: 'Envío eliminado exitosamente'
        });
      } catch (err) {
        await conn.rollback();
        console.error('Error al eliminar envío:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Error al eliminar envío:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Listar paquetes asociados a un envío
  async listPackages(req: any, res: Response) {
    try {
      const { id } = req.params;
      const [envRows] = await this.db.execute('SELECT envi_id AS id, envi_estado AS estado FROM Envios WHERE envi_id = ? AND envi_activo = 1', [id]);
      if ((envRows as any[]).length === 0) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
      }
      const [rows] = await this.db.execute(`
        SELECT p.* FROM EnviosPaquetes ep
        JOIN Paquetes p ON p.paqu_id = ep.enpa_paquete_id
        WHERE ep.enpa_envio_id = ? AND p.paqu_activo = 1
      `, [id]);
      res.json(rows);
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

      const conn = await this.db.getConnection();
      try {
        await conn.beginTransaction();
        const [envRows] = await conn.execute('SELECT envi_id, envi_estado FROM Envios WHERE envi_id = ? AND envi_activo = 1', [id]);
        const envs = envRows as any[];
        if (envs.length === 0) {
          res.status(404).json({ error: 'Envío no encontrado' });
          await conn.rollback();
          conn.release();
          return;
        }
        const envio = envs[0];
        if (['entregado','cancelado'].includes(envio.estado)) {
          throw new Error('No se puede modificar un envío entregado o cancelado');
        }

        // Validar paquetes
        const placeholders = paquetes.map(() => '?').join(',');
        const [pkgRows] = await conn.execute(`SELECT paqu_id AS id, paqu_estado AS estado FROM Paquetes WHERE paqu_id IN (${placeholders}) AND paqu_activo = 1`, paquetes);
        const found = pkgRows as any[];
        if (found.length !== paquetes.length) {
          throw new Error('Uno o más paquetes no existen o no están activos');
        }
        for (const p of found) {
          if (p.estado !== 'pendiente') {
            throw new Error('Todos los paquetes deben estar en estado pendiente');
          }
        }

        // Insertar asociaciones (ignorar duplicados)
        for (const pid of paquetes) {
          await conn.execute('INSERT IGNORE INTO EnviosPaquetes (enpa_envio_id, enpa_paquete_id) VALUES (?, ?)', [id, pid]);
          // Ajustar estado si el envío ya está en tránsito
          if (envio.estado === 'en_transito') {
            await conn.execute('UPDATE Paquetes SET paqu_estado = "en_transito", paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [pid]);
            await conn.execute(
              'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
              [pid, 'pendiente', 'en_transito', 'Paquete agregado al envío', req.user?.id || null]
            );
          }
        }

        await conn.commit();
        res.status(201).json({ message: 'Paquetes agregados al envío' });
      } catch (err: any) {
        await conn.rollback();
        console.error('Error al agregar paquetes al envío:', err);
        res.status(400).json({ error: err?.message || 'Error al agregar paquetes' });
      } finally {
        conn.release();
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
      const conn = await this.db.getConnection();
      try {
        await conn.beginTransaction();
        const [envRows] = await conn.execute('SELECT envi_id AS id, envi_estado AS estado FROM Envios WHERE envi_id = ? AND envi_activo = 1', [id]);
        if ((envRows as any[]).length === 0) {
          res.status(404).json({ error: 'Envío no encontrado' });
          await conn.rollback();
          conn.release();
          return;
        }
        const envio = (envRows as any[])[0];
        if (['entregado','cancelado'].includes(envio.estado)) {
          throw new Error('No se puede modificar un envío entregado o cancelado');
        }

        const [exists] = await conn.execute('SELECT 1 FROM EnviosPaquetes WHERE enpa_envio_id = ? AND enpa_paquete_id = ?', [id, paqueteId]);
        if ((exists as any[]).length === 0) {
          throw new Error('El paquete no está asociado a este envío');
        }

        // Obtener estado actual del paquete para historial
        const [pkgRows] = await conn.execute('SELECT paqu_estado AS estado FROM Paquetes WHERE paqu_id = ?', [paqueteId]);
        const prevEstado = (pkgRows as any[])[0]?.estado ?? 'en_transito';

        await conn.execute('DELETE FROM EnviosPaquetes WHERE enpa_envio_id = ? AND enpa_paquete_id = ?', [id, paqueteId]);
        // Revertir paquete a pendiente
        await conn.execute('UPDATE Paquetes SET paqu_estado = "pendiente", paqu_updated_at = CURRENT_TIMESTAMP WHERE paqu_id = ?', [paqueteId]);
        await conn.execute(
          'INSERT INTO HistorialPaquetes (hipa_paquete_id, hipa_estado_anterior, hipa_estado_nuevo, hipa_comentario, hipa_usuario_id) VALUES (?, ?, ?, ?, ?)',
          [paqueteId, prevEstado, 'pendiente', 'Paquete removido del envío', req.user?.id || null]
        );

        await conn.commit();
        res.json({ message: 'Paquete removido del envío' });
      } catch (err: any) {
        await conn.rollback();
        console.error('Error al remover paquete del envío:', err);
        res.status(400).json({ error: err?.message || 'Error al remover paquete' });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Error general al remover paquete:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}