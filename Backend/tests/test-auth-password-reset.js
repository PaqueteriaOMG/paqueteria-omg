const axios = require('axios');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

(async () => {
  const base = 'http://localhost:3000/api';
  const ts = Date.now();
  const email = `user${ts}@test.local`;
  const initialPassword = 'P4s$w0rd-Init!';
  const resetPassword = 'N3w$ecret-123!';
  const changedPassword = 'An0th3r$ecret-456!';

  function unwrap(resp) { return resp && resp.data ? resp.data : resp; }

  try {
    console.log('1) Registrar usuario (inactivo) ...');
    const registerBody = { nombre: 'Usuario Test', email, password: initialPassword, rol: 'admin' };
    const { data: reg } = await axios.post(base + '/auth/register', registerBody);
    const regEnv = unwrap(reg);
    const verificationToken = regEnv?.data?.verificationToken || regEnv?.verificationToken;
    if (!verificationToken) throw new Error('No se obtuvo verificationToken (asegúrate de NODE_ENV != production)');
    console.log('✔ Registro OK, token de verificación obtenido');

    console.log('2) Verificar email del usuario ...');
    const { data: ver } = await axios.post(base + '/auth/verify-email', { token: verificationToken });
    console.log('✔ Verificación OK:', JSON.stringify(unwrap(ver), null, 2));

    console.log('3) Login con el usuario verificado ...');
    const { data: login } = await axios.post(base + '/auth/login', { email, password: initialPassword });
    const loginEnv = unwrap(login);
    const accessToken = (loginEnv?.data && loginEnv.data.token) || loginEnv?.token;
    const user = (loginEnv?.data && loginEnv.data.user) || loginEnv?.user || {};
    if (!accessToken || !user?.id) throw new Error('Login no devolvió token o user.id');
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    console.log('✔ Login OK, userId =', user.id);

    console.log('4) Solicitar forgot-password ...');
    const { data: fp } = await axios.post(base + '/auth/forgot-password', { email });
    console.log('✔ Forgot enviado:', JSON.stringify(unwrap(fp), null, 2));

    console.log('5) Obtener tokenId desde la BD y firmar token de reset ...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'paqueteria_app'
    });
    // Buscar el último token para el usuario
    const [rows] = await conn.execute(
      'SELECT part_token_id AS token_id, part_user_id AS user_id, part_is_used AS is_used FROM PasswordResetTokens WHERE part_user_id = ? ORDER BY part_created_at DESC LIMIT 1',
      [user.id]
    );
    await conn.end();
    if (!rows || rows.length === 0) throw new Error('No se encontró PasswordResetToken para el usuario');
    const { token_id, user_id, is_used } = rows[0];
    if (is_used) throw new Error('El token más reciente ya está marcado como usado');
    const secret = process.env.RESET_TOKEN_SECRET || 'reset_secret';
    const token = jwt.sign({ tokenId: token_id, userId: user_id }, secret, { expiresIn: '1h' });
    console.log('✔ Token de reset firmado');

    console.log('6) Ejecutar reset-password con nueva contraseña ...');
    const { data: rp } = await axios.post(base + '/auth/reset-password', { token, newPassword: resetPassword });
    console.log('✔ Reset OK:', JSON.stringify(unwrap(rp), null, 2));

    console.log('7) Login con la contraseña nueva tras reset ...');
    const { data: login2 } = await axios.post(base + '/auth/login', { email, password: resetPassword });
    const login2Env = unwrap(login2);
    const token2 = (login2Env?.data && login2Env.data.token) || login2Env?.token;
    const user2 = (login2Env?.data && login2Env.data.user) || login2Env?.user || {};
    if (!token2 || !user2?.id) throw new Error('Login post-reset falló');
    const auth2 = { headers: { Authorization: `Bearer ${token2}` } };
    console.log('✔ Login post-reset OK');

    console.log('8) Cambiar contraseña vía /api/usuarios/{id}/password ...');
    const { data: chp } = await axios.patch(`${base}/usuarios/${user2.id}/password`, {
      current_password: resetPassword,
      new_password: changedPassword
    }, auth2);
    console.log('✔ Cambio de contraseña OK:', JSON.stringify(unwrap(chp), null, 2));

    console.log('9) Login con la contraseña cambiada ...');
    const { data: login3 } = await axios.post(base + '/auth/login', { email, password: changedPassword });
    const login3Env = unwrap(login3);
    const token3 = (login3Env?.data && login3Env.data.token) || login3Env?.token;
    if (!token3) throw new Error('Login final falló');
    console.log('✅ Flujo completo de registro, verificación, reset y cambio de contraseña OK');
  } catch (e) {
    const r = e?.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();