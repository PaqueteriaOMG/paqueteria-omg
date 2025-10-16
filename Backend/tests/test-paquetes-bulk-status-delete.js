const axios = require('axios');

(async () => {
  const base = (process.env.BASE_URL || 'http://localhost:3000') + '/api';
  const unwrap = (resp) => (resp && resp.data ? resp.data : resp);

  try {
    console.log('1) Login admin...');
    const { data: login } = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const loginEnv = unwrap(login);
    const token = (loginEnv?.data && loginEnv.data.token) || loginEnv?.token;
    if (!token) throw new Error('No admin token');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✔ Admin token OK');

    const ts = Date.now();

    console.log('2) Crear cliente...');
    const newClient = {
      nombre: 'Cliente Bulk ' + ts,
      apellido: 'Prueba',
      email: `cliente${ts}@bulk.test`,
      telefono: '+34910000000',
      direccion: 'Calle Bulk 123',
      ciudad: 'Madrid',
      codigo_postal: '28001'
    };
    const { data: clie } = await axios.post(base + '/clientes', newClient, auth);
    const clieObj = unwrap(clie);
    const clienteId = clieObj?.clie_id || clieObj?.id || clieObj?.cliente_id;
    if (!clienteId) throw new Error('No clienteId');
    console.log('✔ clienteId =', clienteId);

    console.log('3) Crear paquetes en bulk...');
    const bulkBody = {
      items: [
        {
          cliente_id: clienteId,
          descripcion: 'PKG A',
          peso: 1.2,
          dimensiones: '10x10x10',
          valor_declarado: 20,
          direccion_origen: 'Almacén 1',
          direccion_destino: 'Destino A'
        },
        {
          cliente_id: clienteId,
          descripcion: 'PKG B',
          peso: 2.3,
          dimensiones: '20x15x10',
          valor_declarado: 40,
          direccion_origen: 'Almacén 1',
          direccion_destino: 'Destino B'
        }
      ]
    };
    const { data: bulkResp } = await axios.post(base + '/paquetes/bulk', bulkBody, auth);
    const bulk = unwrap(bulkResp);
    if (!Array.isArray(bulk) || bulk.length < 2) throw new Error('Bulk did not create expected items');
    const pkgAId = bulk[0]?.id || bulk[0]?.package_id || bulk[0]?.pack_id;
    const pkgBId = bulk[1]?.id || bulk[1]?.package_id || bulk[1]?.pack_id;
    if (!pkgAId || !pkgBId) throw new Error('Bulk response missing ids');
    if (bulk.some((p) => p.status !== 'pendiente')) throw new Error('Bulk items must start pendiente');
    console.log('✔ Bulk created, ids:', pkgAId, pkgBId);

    console.log('4) Cambiar estado PKG A: pendiente -> en_transito ...');
    const { data: st1 } = await axios.patch(base + `/paquetes/${pkgAId}/estado`, { estado: 'en_transito' }, auth);
    const st1Obj = unwrap(st1);
    if ((st1Obj?.status || st1Obj?.estado) !== 'en_transito') throw new Error('State not en_transito');
    console.log('✔ A en_transito');

    console.log('5) Cambiar estado PKG A: en_transito -> devuelto ...');
    const { data: st2 } = await axios.patch(base + `/paquetes/${pkgAId}/estado`, { estado: 'devuelto' }, auth);
    const st2Obj = unwrap(st2);
    if ((st2Obj?.status || st2Obj?.estado) !== 'devuelto') throw new Error('State not devuelto');
    console.log('✔ A devuelto');

    console.log('6) Cambiar estado PKG A: devuelto -> pendiente ...');
    const { data: st3 } = await axios.patch(base + `/paquetes/${pkgAId}/estado`, { estado: 'pendiente' }, auth);
    const st3Obj = unwrap(st3);
    if ((st3Obj?.status || st3Obj?.estado) !== 'pendiente') throw new Error('State not pendiente');
    console.log('✔ A pendiente');

    console.log('7) Entregar PKG B: pendiente -> en_transito -> entregado ...');
    await axios.patch(base + `/paquetes/${pkgBId}/estado`, { estado: 'en_transito' }, auth);
    const { data: stB2 } = await axios.patch(base + `/paquetes/${pkgBId}/estado`, { estado: 'entregado' }, auth);
    const stB2Obj = unwrap(stB2);
    if ((stB2Obj?.status || stB2Obj?.estado) !== 'entregado') throw new Error('B not entregado');
    console.log('✔ B entregado');

    console.log('8) Intentar transición inválida desde entregado (debe 409) ...');
    let got409 = false;
    try {
      await axios.patch(base + `/paquetes/${pkgBId}/estado`, { estado: 'pendiente' }, auth);
    } catch (e) {
      got409 = e?.response?.status === 409;
    }
    if (!got409) throw new Error('Expected 409 on invalid transition from entregado');
    console.log('✔ Invalid transition rejected');

    console.log('9) Borrar PKG A (pendiente) ...');
    const { data: delResp } = await axios.delete(base + `/paquetes/${pkgAId}`, auth);
    console.log('✔ Deleted A:', JSON.stringify(unwrap(delResp), null, 2));

    console.log('10) Restaurar PKG A ...');
    const { data: resResp } = await axios.post(base + `/paquetes/${pkgAId}/restore`, {}, auth);
    const resObj = unwrap(resResp);
    const restored = (resObj?.data && resObj.data?.id) || resObj?.id || (resObj?.data && resObj.data?.paqu_id);
    if (!restored) throw new Error('Restore response missing id');
    console.log('✔ Restored A');

    console.log('✅ Paquetes bulk/status/delete/restore tests completed successfully');
    process.exit(0);
  } catch (e) {
    const r = e?.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();