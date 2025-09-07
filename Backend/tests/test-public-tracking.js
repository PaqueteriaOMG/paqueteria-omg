const axios = require('axios');

(async () => {
  const base = 'http://localhost:3000/api';
  try {
    console.log('1) Login admin...');
    const { data: login } = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const token = (login.data && login.data.token) || login.token;
    if (!token) throw new Error('No se obtuvo token de login');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✔ token OK');

    const ts = Date.now();

    console.log('2) Crear cliente para la prueba...');
    const newClient = {
      nombre: 'Cliente Tracking ' + ts,
      apellido: 'Public',
      email: `cliente${ts}@tracking.test`,
      telefono: '+34910000000',
      direccion: 'Calle Testing 1',
      ciudad: 'Madrid',
      codigo_postal: '28001'
    };
    const { data: clie } = await axios.post(base + '/clientes', newClient, auth);
    const clieObj = clie?.data || clie;
    const clienteId = clieObj?.clie_id || clieObj?.id || clieObj?.cliente_id;
    if (!clienteId) throw new Error('No se obtuvo clienteId');
    console.log('✔ clienteId =', clienteId);

    console.log('3) Crear paquete (debe generar código público)...');
    const pkgReq = {
      cliente_id: clienteId,
      descripcion: 'Paquete tracking público',
      peso: 1.25,
      dimensiones: '10x10x10',
      valor_declarado: 20,
      direccion_origen: 'Almacén Central',
      direccion_destino: 'Destino Test',
      fragil: false
    };
    const { data: pkgResp } = await axios.post(base + '/paquetes', pkgReq, auth);
    const pkg = pkgResp?.data || pkgResp;
    const publicCode = pkg?.paqu_codigo_rastreo_publico || pkg?.codigo_rastreo_publico;
    if (!publicCode) throw new Error('El paquete no retornó paqu_codigo_rastreo_publico');
    console.log('✔ Código público =', publicCode);

    console.log('4) Consultar endpoint público sin autenticación...');
    const { data: pub } = await axios.get(base + `/paquetes/public/track/${encodeURIComponent(publicCode)}`);
    const pubObj = pub?.data || pub;
    // Validaciones básicas de la respuesta pública
    if (!pubObj || pubObj.code !== publicCode) throw new Error('La respuesta pública no contiene el código esperado');
    if (typeof pubObj.status !== 'string') throw new Error('La respuesta pública no contiene status válido');
    if (!Array.isArray(pubObj.history)) throw new Error('La respuesta pública no contiene history como array');
    console.log('✔ Respuesta pública OK:', JSON.stringify(pubObj, null, 2));

    console.log('5) Consultar un código inexistente (debe dar 404)...');
    const fake = publicCode + '-X';
    let got404 = false;
    try {
      await axios.get(base + `/paquetes/public/track/${encodeURIComponent(fake)}`);
    } catch (e) {
      got404 = e?.response?.status === 404;
    }
    if (!got404) throw new Error('Se esperaba 404 para código inexistente');
    console.log('✔ 404 para código inexistente OK');

    console.log('Test de tracking público completado con éxito');
    process.exit(0);
  } catch (e) {
    const r = e.response;
    console.error('ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();