import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'empleado' | 'cliente';
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: any;
}

export interface LoginData {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:3000/api';
  private tokenKey = 'access_token';
  private adminTokenKey = 'admin_token';

  private userSubject = new BehaviorSubject<User | null>(this.loadUser());
  user$ = this.userSubject.asObservable();
  isLoggedIn$ = this.user$.pipe(map(u => !!u));

  constructor(private http: HttpClient) {}

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) as User : null;
  }

  private saveSession(token: string, user: User) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  get token(): string | null { return localStorage.getItem(this.tokenKey); }
  get adminToken(): string | null { return localStorage.getItem(this.adminTokenKey); }

  setAdminToken(value: string) { localStorage.setItem(this.adminTokenKey, value); }
  clearAdminToken() { localStorage.removeItem(this.adminTokenKey); }

  login(email: string, password: string): Observable<User> {
    return this.http.post<ApiEnvelope<LoginData>>(`${this.baseUrl}/auth/login`, { email, password }, { withCredentials: true }).pipe(
      tap(res => this.saveSession(res.data.token, res.data.user)),
      map(res => res.data.user)
    );
  }

  register(nombre: string, email: string, password: string, rol: 'admin'|'empleado'|'cliente', admin_token?: string): Observable<any> {
    const body: any = { nombre, email, password, rol };
    if (admin_token) body.admin_token = admin_token; // reservado por si el backend lo usa
    return this.http.post<ApiEnvelope<any>>(`${this.baseUrl}/auth/register`, body, { withCredentials: true });
  }

  refresh(): Observable<string | null> {
    return this.http.post<ApiEnvelope<{ accessToken: string }>>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => localStorage.setItem(this.tokenKey, res.data.accessToken)),
      map(res => res.data.accessToken),
      catchError(() => of(null))
    );
  }

  logout(): Observable<void> {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('user');
        this.clearAdminToken();
        this.userSubject.next(null);
      }),
      map(() => void 0),
      catchError(() => {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('user');
        this.clearAdminToken();
        this.userSubject.next(null);
        return of(void 0);
      })
    );
  }

  // Forgot password: envía email para restablecer contraseña
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.baseUrl}/auth/forgot-password`, { email }, { withCredentials: true }).pipe(
      map(res => ({ message: res.data.message || 'Si el correo existe, recibirás instrucciones' }))
    );
  }

  // Reset password: usa token y nueva contraseña
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.baseUrl}/auth/reset-password`, { token, newPassword }, { withCredentials: true }).pipe(
      map(res => ({ message: res.data.message || 'Contraseña actualizada correctamente' }))
    );
  }

  // Verificar email: acepta token (POST para simplificar)
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.baseUrl}/auth/verify-email`, { token }, { withCredentials: true }).pipe(
      map(res => ({ message: res.data.message || 'Correo verificado exitosamente' }))
    );
  }
}