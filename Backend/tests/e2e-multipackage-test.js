const axios = require('axios');

(async () => {
  const base = 'http://localhost:3000/api';
  try {
    console.log('1) Login...');
    const { data: login } = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const token = (login.data && login.data.token) || login.token; // soporta with/without envelope
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✔ token ok');

    const ts = Date.now();

    console.log('2) Crear cliente...');
    const newClient = {
      nombre: 'Cliente Test ' + ts,
      apellido: 'Prueba',
      email: `cliente${ts}@test.com`,
      telefono: '+34911222333',
      direccion: 'Calle Falsa 123',
      ciudad: 'Madrid',
      codigo_postal: '28001'
    };
    const { data: clie } = await axios.post(base + '/clientes', newClient, auth);
    const clieObj = clie?.data || clie; // des-encapsular
    const clienteId = clieObj?.clie_id || clieObj?.id || clieObj?.cliente_id;
    console.log('✔ clienteId =', clienteId);

    console.log('3) Crear paquete A...');
    const pkgAReq = {
      cliente_id: clienteId,
      descripcion: 'Paquete A',
      peso: 1.5,
      dimensiones: '10x10x10',
      valor_declarado: 50,
      fragil: false,
      direccion_origen: 'Almacén A',
      direccion_destino: 'Destino X'
    };
    const { data: pkgA } = await axios.post(base + '/paquetes', pkgAReq, auth);
    const pkgAObj = pkgA?.data || pkgA;
    const pkgAId = pkgAObj?.id || pkgAObj?.pack_id;
    console.log('✔ paqueteA id =', pkgAId);

    console.log('4) Crear paquete B...');
    const pkgBReq = {
      cliente_id: clienteId,
      descripcion: 'Paquete B',
      peso: 2.0,
      dimensiones: '20x15x10',
      valor_declarado: 80,
      fragil: true,
      direccion_origen: 'Almacén A',
      direccion_destino: 'Destino Y'
    };
    const { data: pkgB } = await axios.post(base + '/paquetes', pkgBReq, auth);
    const pkgBObj = pkgB?.data || pkgB;
    const pkgBId = pkgBObj?.id || pkgBObj?.pack_id;
    console.log('✔ paqueteB id =', pkgBId);

    console.log('5) Crear envío con paquete A como principal...');
    const envioReq = {
      paquete_id: pkgAId,
      direccion_origen: 'Almacén A',
      direccion_destino: 'Destino X'
    };
    const { data: envio } = await axios.post(base + '/envios', envioReq, auth);
    const envioObj = envio?.data || envio;
    const envioId = envioObj?.id || envioObj?.envi_id;
    console.log('✔ envioId =', envioId);

    console.log('6) Listar paquetes del envío (inicialmente vacío):');
    const { data: list1 } = await axios.get(`${base}/envios/${envioId}/paquetes`, auth);
    console.log('Paquetes iniciales:', list1?.data || list1);

    console.log('7) Agregar paquete B al envío...');
    const { data: add } = await axios.post(`${base}/envios/${envioId}/paquetes`, { paquetes: [pkgBId] }, auth);
    console.log('✔ add resp:', add?.data || add);

    console.log('8) Listar paquetes del envío nuevamente (debería incluir B):');
    const { data: list2 } = await axios.get(`${base}/envios/${envioId}/paquetes`, auth);
    console.log('Paquetes tras agregar:', list2?.data || list2);

    console.log('9) Quitar paquete B del envío...');
    const { data: del } = await axios.delete(`${base}/envios/${envioId}/paquetes/${pkgBId}`, auth);
    console.log('✔ delete resp:', del?.data || del);

    console.log('10) Listar paquetes del envío nuevamente (debería vaciarse):');
    const { data: list3 } = await axios.get(`${base}/envios/${envioId}/paquetes`, auth);
    console.log('Paquetes finales:', list3?.data || list3);

    console.log('✅ Flujo de prueba completo');
  } catch (e) {
    const r = e.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
  }
})();