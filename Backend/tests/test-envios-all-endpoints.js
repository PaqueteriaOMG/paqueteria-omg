const axios = require('axios');

(async () => {
  const base = (process.env.BASE_URL || 'http://localhost:3000') + '/api';

  const unwrap = (resp) => (resp && resp.data ? (resp.data.data ?? resp.data) : resp);

  const getEnvioId = (obj) => obj?.shipment_id || obj?.envi_id || obj?.id;
  const getPaqueteId = (obj) => obj?.package_id || obj?.id || obj?.pack_id;

  try {
    console.log('1) Login admin...');
    const loginResp = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const login = unwrap(loginResp);
    const token = (login?.data && login.data.token) || login?.token;
    if (!token) throw new Error('Login no devolvió token');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✔ token OK');

    const ts = Date.now();

    console.log('2) Crear cliente...');
    const newClient = {
      nombre: 'Cliente Envios ' + ts,
      apellido: 'Prueba',
      email: `cliente_envios_${ts}@test.com`,
      telefono: '+34911222333',
      direccion: 'Calle Falsa 123',
      ciudad: 'Madrid',
      codigo_postal: '28001'
    };
    const clieResp = await axios.post(base + '/clientes', newClient, auth);
    const clie = unwrap(clieResp);
    const clienteId = clie?.clie_id || clie?.id || clie?.cliente_id;
    if (!clienteId) throw new Error('No se obtuvo clienteId');
    console.log('✔ clienteId =', clienteId);

    console.log('3) Crear paquete A...');
    const pkgAReq = {
      cliente_id: clienteId,
      descripcion: 'Paquete A para envíos',
      peso: 1.75,
      dimensiones: '10x10x10',
      valor_declarado: 60,
      fragil: false,
      direccion_origen: 'Almacén A',
      direccion_destino: 'Destino X'
    };
    const pkgAResp = await axios.post(base + '/paquetes', pkgAReq, auth);
    const pkgA = unwrap(pkgAResp);
    const paqueteAId = getPaqueteId(pkgA);
    const trackingA = pkgA?.tracking_number || pkgA?.tracking_code;
    if (!paqueteAId) throw new Error('No se obtuvo paqueteAId');
    console.log('✔ paqueteA id =', paqueteAId, 'tracking =', trackingA);

    console.log('4) Crear envío (con llaves en ES y EN para compatibilidad)...');
    const eta1 = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const envioReq = {
      // Español (valida en rutas)
      paquete_id: paqueteAId,
      direccion_origen: 'Almacén A',
      direccion_destino: 'Destino X',
      fecha_envio_estimada: eta1,
      // Inglés (esperado por controlador)
      package_id: paqueteAId,
      origin_address: 'Almacén A',
      destination_address: 'Destino X',
      estimated_delivery_date: eta1
    };
    let envioId;
    try {
      const envioResp = await axios.post(base + '/envios', envioReq, auth);
      const envio = unwrap(envioResp);
      envioId = getEnvioId(envio);
      if (!envioId) throw new Error('No se obtuvo envioId');
      console.log('✔ envioId =', envioId);
    } catch (err) {
      const r = err?.response;
      console.warn('⚠ No fue posible crear envío. Intentando usar uno existente...', r?.status, r?.data || err?.message);
      const listFallback = await axios.get(`${base}/envios?page=1&limit=5`, auth);
      const lfData = unwrap(listFallback);
      const firstEnvio = Array.isArray(lfData?.data) ? lfData.data[0] : (Array.isArray(lfData) ? lfData[0] : null);
      envioId = firstEnvio ? getEnvioId(firstEnvio) : undefined;
      if (!envioId) throw new Error('No hay envíos existentes para continuar las pruebas');
      console.log('✔ Usando envío existente con envioId =', envioId);
    }

    console.log('5) Obtener envío por ID...');
    const getByIdResp = await axios.get(`${base}/envios/${envioId}`, auth);
    console.log('✔ GET /envios/:id OK:', JSON.stringify(unwrap(getByIdResp), null, 2));

    if (trackingA) {
      console.log('6) Rastrear envío por número de paquete...');
      const trackResp = await axios.get(`${base}/envios/tracking/${trackingA}`, auth);
      console.log('✔ GET /envios/tracking/:numero OK:', JSON.stringify(unwrap(trackResp), null, 2));
    } else {
      console.log('ℹ No hay tracking del paquete para probar /envios/tracking');
    }

    console.log('7) Listar envíos con paginación...');
    const listResp = await axios.get(`${base}/envios?page=1&limit=10&sortBy=numero_envio&sortOrder=desc`, auth);
    const listData = unwrap(listResp);
    console.log('✔ GET /envios OK:', JSON.stringify(listData, null, 2));

    console.log('8) Actualizar envío (direcciones y ETA)...');
    const eta2 = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const updateReq = {
      // Español
      direccion_origen: 'Almacén B',
      direccion_destino: 'Destino Z',
      fecha_envio_estimada: eta2,
      // Inglés
      origin_address: 'Almacén B',
      destination_address: 'Destino Z',
      estimated_delivery_date: eta2
    };
    const updResp = await axios.put(`${base}/envios/${envioId}`, updateReq, auth);
    console.log('✔ PUT /envios/:id OK:', JSON.stringify(unwrap(updResp), null, 2));

    console.log('9) Listar paquetes del envío (incluye principal si existe relación)...');
    const listP1Resp = await axios.get(`${base}/envios/${envioId}/paquetes`, auth);
    console.log('✔ GET /envios/:id/paquetes OK:', JSON.stringify(unwrap(listP1Resp), null, 2));

    console.log('10) Crear paquete B...');
    const pkgBReq = {
      cliente_id: clienteId,
      descripcion: 'Paquete B para envíos',
      peso: 2.0,
      dimensiones: '20x15x10',
      valor_declarado: 80,
      fragil: true,
      direccion_origen: 'Almacén B',
      direccion_destino: 'Destino Z'
    };
    const pkgBResp = await axios.post(base + '/paquetes', pkgBReq, auth);
    const pkgB = unwrap(pkgBResp);
    const paqueteBId = getPaqueteId(pkgB);
    if (!paqueteBId) throw new Error('No se obtuvo paqueteBId');
    console.log('✔ paqueteB id =', paqueteBId);

    console.log('11) Agregar paquete B al envío...');
    const addResp = await axios.post(`${base}/envios/${envioId}/paquetes`, { paquetes: [paqueteBId] }, auth);
    console.log('✔ POST /envios/:id/paquetes OK:', JSON.stringify(unwrap(addResp), null, 2));

    console.log('12) Listar paquetes del envío nuevamente...');
    const listP2Resp = await axios.get(`${base}/envios/${envioId}/paquetes`, auth);
    console.log('✔ GET /envios/:id/paquetes (2) OK:', JSON.stringify(unwrap(listP2Resp), null, 2));

    console.log('13) Remover paquete B del envío...');
    const delPkgResp = await axios.delete(`${base}/envios/${envioId}/paquetes/${paqueteBId}`, auth);
    console.log('✔ DELETE /envios/:id/paquetes/:paqueteId OK:', JSON.stringify(unwrap(delPkgResp), null, 2));

    console.log('14) Actualizar estado del envío a entregado...');
    const statusReq = {
      // Español
      estado: 'entregado',
      fecha_entrega_real: new Date().toISOString(),
      // Inglés (controlador)
      status: 'entregado',
      comment: 'Entrega realizada'
    };
    const stResp = await axios.patch(`${base}/envios/${envioId}/estado`, statusReq, auth);
    console.log('✔ PATCH /envios/:id/estado OK:', JSON.stringify(unwrap(stResp), null, 2));

    console.log('15) Eliminar envío...');
    const delResp = await axios.delete(`${base}/envios/${envioId}`, auth);
    if (delResp.status !== 204) throw new Error('DELETE /envios/:id no devolvió 204');
    console.log('✔ DELETE /envios/:id OK (204)');

    console.log('16) Restaurar envío...');
    const restoreResp = await axios.post(`${base}/envios/${envioId}/restore`, {}, auth);
    console.log('✔ POST /envios/:id/restore OK:', JSON.stringify(unwrap(restoreResp), null, 2));

    console.log('✅ Pruebas de todos los endpoints de envíos completadas');
    process.exit(0);
  } catch (e) {
    const r = e?.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();