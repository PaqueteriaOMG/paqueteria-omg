import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="auth-container">
    <h2>Crear cuenta</h2>
    <form (ngSubmit)="onSubmit()" #f="ngForm" novalidate>
      <label>Nombre</label>
      <input name="nombre" [(ngModel)]="nombre" type="text" required />

      <label>Email</label>
      <input name="email" [(ngModel)]="email" type="email" required />

      <label>Contraseña</label>
      <input name="password" [(ngModel)]="password" type="password" required />

      <label>Rol</label>
      <select name="rol" [(ngModel)]="rol" required>
        <option value="cliente">Cliente</option>
        <option value="empleado">Empleado</option>
        <option value="admin">Admin</option>
      </select>

      <div *ngIf="rol === 'admin'">
        <label>Admin Token</label>
        <input name="admin_token" [(ngModel)]="admin_token" type="text" placeholder="token de administrador" />
      </div>

      <button type="submit" [disabled]="loading">Registrarme</button>
    </form>

    <p class="error" *ngIf="error">{{ error }}</p>
    <a routerLink="/login">Ya tengo cuenta</a>
  </div>
  `,
  styles: [`
    .auth-container{ max-width:420px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff; }
    h2{ margin-bottom:16px; }
    label{ display:block; margin-top:12px; font-weight:600; }
    input, select{ width:100%; padding:10px; margin-top:6px; border:1px solid #d1d5db; border-radius:8px; }
    button{ margin-top:16px; width:100%; padding:10px; background:#16a34a; color:#fff; border:none; border-radius:8px; cursor:pointer; }
    button[disabled]{ opacity:.6; cursor:not-allowed; }
    .error{ color:#b91c1c; margin-top:12px; }
  `]
})
export class RegisterComponent {
  nombre = '';
  email = '';
  password = '';
  rol: 'admin'|'empleado'|'cliente' = 'cliente';
  admin_token = '';

  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.nombre || !this.email || !this.password || !this.rol) return;
    this.loading = true;
    this.error = '';

    // guardar el admin_token en localStorage si lo proporciona
    if (this.admin_token) this.auth.setAdminToken(this.admin_token);

    this.auth.register(this.nombre, this.email, this.password, this.rol, this.admin_token || undefined).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.error = err?.error?.message || 'Error al registrar';
        this.loading = false;
      }
    });
  }
}