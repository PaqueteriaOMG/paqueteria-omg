const axios = require('axios');

(async () => {
  const base = (process.env.BASE_URL || 'http://localhost:3000') + '/api';

  const unwrap = (resp) => (resp && resp.data ? resp.data : resp);

  try {
    console.log('1) Login admin...');
    const loginResp = await axios.post(base + '/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    const loginEnv = unwrap(loginResp);
    const adminToken = (loginEnv?.data && loginEnv.data.token) || loginEnv?.token;
    if (!adminToken) throw new Error('No admin token');
    const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log('✔ Admin login OK');

    console.log('2) Obtener perfil del admin (para probar borrado propio)...');
    const { data: meResp } = await axios.get(base + '/usuarios/me/profile', adminAuth);
    const me = unwrap(meResp);
    const adminId = me?.id || me?.usua_id;
    if (!adminId) throw new Error('No admin id from profile');
    console.log('✔ Admin id =', adminId);

    const ts = Date.now();
    const userEmail1 = `user${ts}@crud.test`;
    const userEmail2 = `user${ts}+upd@crud.test`;
    const userEmail3 = `user${ts}+me@crud.test`;
    const initialPassword = 'Str0ng$Pass-Init';
    const changedPassword = 'Str0ng$Pass-Changed';

    console.log('3) Crear usuario (admin only) ...');
    const createBody = { nombre: 'Usuario CRUD', email: userEmail1, password: initialPassword, rol: 'empleado' };
    const { data: createResp } = await axios.post(base + '/usuarios', createBody, adminAuth);
    const created = unwrap(createResp);
    const userId = created?.id || created?.usua_id;
    if (!userId) throw new Error('User creation did not return id');
    console.log('✔ User created id =', userId);

    console.log('4) Listar usuarios (admin) ...');
    const { data: listResp } = await axios.get(base + '/usuarios', adminAuth);
    const listEnv = unwrap(listResp);
    const rows = listEnv?.data || listEnv;
    if (!Array.isArray(rows)) throw new Error('GET /usuarios did not return array');
    console.log('✔ Users listed, count =', rows.length);

    console.log('5) Obtener usuario por ID (admin) ...');
    const { data: getResp } = await axios.get(base + `/usuarios/${userId}`, adminAuth);
    const got = unwrap(getResp);
    if ((got?.id || got?.usua_id) !== userId) throw new Error('GET by id mismatch');
    console.log('✔ User fetched');

    console.log('6) Actualizar usuario (admin can change rol) ...');
    const updBody = { nombre: 'Usuario CRUD Upd', email: userEmail2, rol: 'cliente' };
    const { data: updResp } = await axios.put(base + `/usuarios/${userId}`, updBody, adminAuth);
    const upd = unwrap(updResp);
    if ((upd?.email || upd?.usua_email) !== userEmail2) throw new Error('PUT did not update email');
    console.log('✔ User updated');

    console.log('7) Login con el usuario para probar endpoints de perfil...');
    const { data: loginUser } = await axios.post(base + '/auth/login', { email: userEmail2, password: initialPassword });
    const loginUserEnv = unwrap(loginUser);
    const userToken = (loginUserEnv?.data && loginUserEnv.data.token) || loginUserEnv?.token;
    if (!userToken) throw new Error('User login failed');
    const userAuth = { headers: { Authorization: `Bearer ${userToken}` } };
    console.log('✔ User login OK');

    console.log('8) Obtener perfil propio /usuarios/me/profile ...');
    const { data: me2Resp } = await axios.get(base + '/usuarios/me/profile', userAuth);
    const me2 = unwrap(me2Resp);
    if ((me2?.id || me2?.usua_id) !== userId) throw new Error('me.profile does not match user');
    console.log('✔ Me profile OK');

    console.log('9) Actualizar perfil propio (nombre/email) ...');
    const meUpdBody = { nombre: 'Usuario CRUD Me', email: userEmail3 };
    const { data: meUpdResp } = await axios.patch(base + '/usuarios/me/profile', meUpdBody, userAuth);
    const meUpd = unwrap(meUpdResp);
    if ((meUpd?.email || meUpd?.usua_email) !== userEmail3) throw new Error('me.profile update failed');
    console.log('✔ Me profile updated');

    console.log('10) Cambiar contraseña propia ...');
    const { data: chPwdResp } = await axios.patch(base + `/usuarios/${userId}/password`, {
      current_password: initialPassword,
      new_password: changedPassword
    }, userAuth);
    console.log('✔ Password change OK:', JSON.stringify(unwrap(chPwdResp), null, 2));

    console.log('11) Login con contraseña cambiada ...');
    const { data: loginUser2 } = await axios.post(base + '/auth/login', { email: userEmail3, password: changedPassword });
    const loginUser2Env = unwrap(loginUser2);
    const userToken2 = (loginUser2Env?.data && loginUser2Env.data.token) || loginUser2Env?.token;
    if (!userToken2) throw new Error('Login after password change failed');
    console.log('✔ Login after password change OK');

    console.log('12) Desactivar usuario (DELETE, admin only)...');
    const { data: delResp } = await axios.delete(base + `/usuarios/${userId}`, adminAuth);
    console.log('✔ User deactivated:', JSON.stringify(unwrap(delResp), null, 2));

    console.log('13) Login con usuario desactivado debe fallar ...');
    let got401Deactivated = false;
    try {
      await axios.post(base + '/auth/login', { email: userEmail3, password: changedPassword });
    } catch (e) {
      got401Deactivated = e?.response?.status === 401;
    }
    if (!got401Deactivated) throw new Error('Expected 401 login for deactivated user');
    console.log('✔ Login rejected for deactivated user');

    console.log('14) Restaurar usuario (admin) ...');
    const { data: resResp } = await axios.patch(base + `/usuarios/${userId}/restore`, {}, adminAuth);
    const resEnv = unwrap(resResp);
    if ((resEnv?.id || resEnv?.usua_id) !== userId) throw new Error('Restore did not return user');
    console.log('✔ User restored');

    console.log('15) Intentar borrar al propio admin (debe fallar con 400) ...');
    let got400SelfDel = false;
    try {
      await axios.delete(base + `/usuarios/${adminId}`, adminAuth);
    } catch (e) {
      got400SelfDel = e?.response?.status === 400;
    }
    if (!got400SelfDel) throw new Error('Expected 400 when deleting own admin account');
    console.log('✔ Self-delete protected');

    console.log('✅ Usuarios CRUD/perfil tests completed successfully');
    process.exit(0);
  } catch (e) {
    const r = e?.response;
    console.error('❌ ERROR', r?.status, r?.data || e.message);
    process.exit(1);
  }
})();