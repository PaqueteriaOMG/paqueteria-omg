import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="auth-container">
    <h2>Iniciar sesión</h2>
    <form (ngSubmit)="onSubmit()" #f="ngForm" novalidate>
      <label>Email</label>
      <input name="email" [(ngModel)]="email" type="email" required />

      <label>Contraseña</label>
      <input name="password" [(ngModel)]="password" type="password" required />

      <button type="submit" [disabled]="loading">Entrar</button>
    </form>

    <p class="error" *ngIf="error">{{ error }}</p>
    <a routerLink="/register">Crear cuenta</a>
  </div>
  `,
  styles: [`
    .auth-container{ max-width:420px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff; }
    h2{ margin-bottom:16px; }
    label{ display:block; margin-top:12px; font-weight:600; }
    input{ width:100%; padding:10px; margin-top:6px; border:1px solid #d1d5db; border-radius:8px; }
    button{ margin-top:16px; width:100%; padding:10px; background:#2563eb; color:#fff; border:none; border-radius:8px; cursor:pointer; }
    button[disabled]{ opacity:.6; cursor:not-allowed; }
    .error{ color:#b91c1c; margin-top:12px; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.message || 'Error al iniciar sesión';
        this.loading = false;
      }
    });
  }
}