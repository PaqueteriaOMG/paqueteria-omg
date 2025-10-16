// Helpers HTTP sencillos para GET y POST usando fetch
// Pensados para que cualquiera pueda usarlos sin conocer Angular HttpClient.

export type HttpResult<T = any> = T;

// Desempaqueta respuestas del backend que vengan como { success, data }
function unwrap<T = any>(body: any): HttpResult<T> {
  if (body && typeof body === 'object') {
    if ('data' in body) return body.data as T;
    if ('success' in body && body.success === true && 'data' in body) return body.data as T;
  }
  return body as T;
}

// Intenta parsear JSON, con fallback a texto
async function parseBody(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch {}
  }
  try { return await res.text(); } catch { return null; }
}

// Construye un mensaje de error amigable
function buildErrorMessage(res: Response, body: any): string {
  const statusMsg = `HTTP ${res.status}`;
  if (body && typeof body === 'object') {
    const msg = body.error || body.message || body.msg;
    if (msg) return `${statusMsg}: ${msg}`;
  }
  if (typeof body === 'string' && body.trim().length) return `${statusMsg}: ${body}`;
  return statusMsg;
}

// Agrega Authorization si viene token
function withAuth(headers: Record<string, string>, token?: string) {
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// GET simple: pasa URL y opcionalmente token
export async function httpGet<T = any>(url: string, token?: string): Promise<HttpResult<T>> {
  const headers = withAuth({ 'Accept': 'application/json' }, token);
  const res = await fetch(url, { method: 'GET', headers });
  const body = await parseBody(res);
  if (!res.ok) throw new Error(buildErrorMessage(res, body));
  return unwrap<T>(body);
}

// POST simple: pasa URL, datos (JSON) y opcionalmente token
export async function httpPost<T = any>(url: string, data?: any, token?: string): Promise<HttpResult<T>> {
  const headers = withAuth({ 'Accept': 'application/json', 'Content-Type': 'application/json' }, token);
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data ?? {}) });
  const body = await parseBody(res);
  if (!res.ok) throw new Error(buildErrorMessage(res, body));
  return unwrap<T>(body);
}

/*
Uso rápido:

import { httpGet, httpPost } from './services/http-helpers';

// GET sin token
const paquetes = await httpGet('http://localhost:3000/api/paquetes');

// POST con token
const token = 'mi-token-jwt';
const nuevoCliente = await httpPost('http://localhost:3000/api/clientes', {
  nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com', telefono: '600000000', direccion: 'Calle 1', ciudad: 'Madrid', codigo_postal: '28001'
}, token);

*/