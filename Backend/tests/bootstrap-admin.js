const axios = require('axios');

(async () => {
  const base = (process.env.BASE_URL || 'http://localhost:3000') + '/api';
  const email = process.env.ADMIN_EMAIL || 'admin@paqueteria.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const unwrap = (resp) => (resp && resp.data ? resp.data : resp);

  try {
    console.log(`→ Checking admin login at ${base} ...`);
    let loginResp;
    try {
      loginResp = await axios.post(base + '/auth/login', { email, password });
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 401 && status !== 404) throw e;
    }

    if (loginResp) {
      const env = unwrap(loginResp);
      const token = (env?.data && env.data.token) || env?.token;
      if (!token) throw new Error('Login response without token');
      console.log('✔ Admin already active, login OK');
      process.exit(0);
      return;
    }

    console.log('→ Admin login failed; attempting register + verify ...');
    const registerBody = { nombre: 'Administrador', email, password, rol: 'admin' };
    const { data: registerResp } = await axios.post(base + '/auth/register', registerBody);
    const regEnv = unwrap(registerResp);
    const verificationToken = regEnv?.verificationToken;
    if (!verificationToken) throw new Error('No verificationToken from register');
    console.log('✔ Registered admin (inactive). Verifying email ...');

    const { data: verifyResp } = await axios.post(base + '/auth/verify-email', { token: verificationToken });
    const verEnv = unwrap(verifyResp);
    if (!(verEnv?.message || (verEnv?.data && verEnv.data.message))) throw new Error('Email verification failed');
    console.log('✔ Email verified. Testing login ...');

    const { data: login2 } = await axios.post(base + '/auth/login', { email, password });
    const login2Env = unwrap(login2);
    const token2 = (login2Env?.data && login2Env.data.token) || login2Env?.token;
    if (!token2) throw new Error('Login after verify did not return token');
    console.log('✔ Admin ready.');
    process.exit(0);
  } catch (e) {
    const r = e?.response;
    console.error('❌ Admin bootstrap failed', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();