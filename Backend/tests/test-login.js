const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Probando inicio de sesión...');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@paqueteria.com',
      password: 'admin123'
    });
    
    console.log('✅ Login exitoso!');
    console.log('📋 Respuesta:', JSON.stringify(response.data, null, 2));
    
    // Probar verificación de token
    const token = response.data.data.token;
    console.log('\n🔍 Probando verificación de token...');
    
    const verifyResponse = await axios.get('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token válido!');
    console.log('📋 Verificación:', JSON.stringify(verifyResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLogin();