const axios = require('axios');

(async () => {
  const base = (process.env.BASE_URL || 'http://localhost:3000') + '/api';

  const unwrap = (resp) => (resp && resp.data ? resp.data : resp);

  function extractRefreshCookie(setCookieHeaders) {
    if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) return null;
    const entry = setCookieHeaders.find((c) => /^refreshToken=/.test(c));
    if (!entry) return null;
    // "refreshToken=<jwt>; Path=/; HttpOnly; SameSite=Lax" => take value up to semicolon
    const m = entry.match(/^refreshToken=([^;]+)/);
    return m ? m[1] : null;
  }

  try {
    console.log('1) Login admin to obtain access and refresh tokens...');
    const loginResp = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const loginEnv = unwrap(loginResp);
    const accessToken = (loginEnv?.data && loginEnv.data.token) || loginEnv?.token;
    if (!accessToken) throw new Error('Login did not return access token');
    const setCookies = loginResp.headers['set-cookie'];
    const refreshVal = extractRefreshCookie(setCookies);
    if (!refreshVal) throw new Error('No refreshToken cookie received from login');
    const refreshCookieHeader = `refreshToken=${refreshVal}`;
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    console.log('✔ Login OK');

    console.log('2) Check access token via /auth/check-access ...');
    const checkAccessResp = await axios.get(base + '/auth/check-access', auth);
    const checkAccessEnv = unwrap(checkAccessResp);
    const validAccess = (checkAccessEnv?.data && checkAccessEnv.data.valid) || checkAccessEnv?.valid || checkAccessEnv?.success;
    if (!validAccess) throw new Error('check-access did not confirm validity');
    console.log('✔ check-access valid');

    console.log('3) Verify token via /auth/verify (backward compat) ...');
    const verifyResp = await axios.get(base + '/auth/verify', auth);
    const verifyEnv = unwrap(verifyResp);
    const isValid = verifyEnv?.valid === true || (verifyEnv?.data && verifyEnv.data.valid === true);
    if (!isValid) throw new Error('verify did not return valid=true');
    console.log('✔ verify valid');

    console.log('4) Check refresh token via /auth/check ...');
    const checkRefreshResp = await axios.get(base + '/auth/check', { headers: { Cookie: refreshCookieHeader } });
    const checkRefreshEnv = unwrap(checkRefreshResp);
    const validRefresh = (checkRefreshEnv?.data && checkRefreshEnv.data.valid) || checkRefreshEnv?.valid;
    if (!validRefresh) throw new Error('Refresh check did not confirm validity');
    console.log('✔ refresh check valid');

    console.log('5) Refresh access token via /auth/refresh, expect rotation and new access token ...');
    const refreshResp = await axios.post(base + '/auth/refresh', {}, { headers: { Cookie: refreshCookieHeader } });
    const refreshEnv = unwrap(refreshResp);
    const newAccess = refreshEnv?.data?.accessToken || refreshEnv?.accessToken;
    if (!newAccess) throw new Error('refresh did not return accessToken');
    console.log('✔ refresh returned new access token');
    // update cookie header from response if cookie rotated
    const setCookies2 = refreshResp.headers['set-cookie'];
    const refreshVal2 = extractRefreshCookie(setCookies2) || refreshVal;
    const refreshCookieHeader2 = `refreshToken=${refreshVal2}`;

    console.log('6) Logout via /auth/logout using refresh cookie ...');
    const logoutResp = await axios.post(base + '/auth/logout', {}, { headers: { Cookie: refreshCookieHeader2 } });
    console.log('✔ logout OK:', JSON.stringify(unwrap(logoutResp), null, 2));

    console.log('7) Validate refresh now fails (revoked) ...');
    let got401Refresh = false;
    try {
      await axios.post(base + '/auth/refresh', {}, { headers: { Cookie: refreshCookieHeader2 } });
    } catch (e) {
      got401Refresh = e?.response?.status === 401;
    }
    if (!got401Refresh) throw new Error('Expected 401 after logout on refresh');
    console.log('✔ refresh rejected after logout');

    console.log('8) Validate /auth/check fails without cookie ...');
    let got401Check = false;
    try {
      await axios.get(base + '/auth/check');
    } catch (e) {
      got401Check = e?.response?.status === 401;
    }
    if (!got401Check) throw new Error('Expected 401 for /auth/check without cookie');
    console.log('✔ check rejected without cookie');

    console.log('✅ Auth check/refresh/logout tests completed successfully');
    process.exit(0);
  } catch (e) {
    const r = e?.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();