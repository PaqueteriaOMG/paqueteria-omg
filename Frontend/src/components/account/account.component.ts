import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="account-container">
    <h2>Mi cuenta</h2>

    <div class="card">
      <div class="card-header">
        <h3>Perfil</h3>
        <p class="description">Actualiza tu nombre y correo</p>
      </div>
      <form (ngSubmit)="onSaveProfile()" #profileForm="ngForm" class="card-content">
        <label>Nombre</label>
        <input name="nombre" [(ngModel)]="nombre" type="text" required />

        <label>Correo</label>
        <input name="email" [(ngModel)]="email" type="email" required email />

        <button type="submit" [disabled]="saveLoading || !profileForm.form.valid">{{ saveLoading ? 'Guardando...' : 'Guardar cambios' }}</button>
        <p class="status success" *ngIf="saveMessage">{{ saveMessage }}</p>
        <p class="status error" *ngIf="saveError">{{ saveError }}</p>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Contraseña</h3>
        <p class="description">Cambia tu contraseña de acceso</p>
      </div>
      <form (ngSubmit)="onChangePassword()" #pwdForm="ngForm" class="card-content">
        <label>Contraseña actual</label>
        <input name="current" [(ngModel)]="currentPassword" type="password" required />

        <label>Nueva contraseña</label>
        <input name="new" [(ngModel)]="newPassword" type="password" required [pattern]="strongPwdRegex" />
        <small class="hint">Debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial</small>

        <label>Confirmar nueva contraseña</label>
        <input name="confirm" [(ngModel)]="confirmPassword" type="password" required />

        <button type="submit" [disabled]="pwdLoading">{{ pwdLoading ? 'Actualizando...' : 'Cambiar contraseña' }}</button>
        <p class="status success" *ngIf="pwdMessage">{{ pwdMessage }}</p>
        <p class="status error" *ngIf="pwdError">{{ pwdError }}</p>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .account-container{ max-width:720px;margin:24px auto;padding:0 16px; }
    h2{ margin-bottom:16px; }
    .card{ background:#fff;border:1px solid var(--neutral-200);border-radius:12px;margin-bottom:16px;box-shadow: var(--shadow-sm); }
    .card-header{ padding:16px;border-bottom:1px solid var(--neutral-200); }
    .card-header h3{ margin:0; }
    .card-header .description{ margin:4px 0 0;color:var(--neutral-600); }
    .card-content{ padding:16px; }
    label{ display:block;margin-top:12px;font-weight:600; }
    input{ width:100%;padding:10px;margin-top:6px;border:1px solid #d1d5db;border-radius:8px; }
    button{ margin-top:16px;padding:10px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer; }
    button[disabled]{ opacity:.6; cursor:not-allowed; }
    .hint{ display:block;color:var(--neutral-600);font-size:.875rem;margin-top:4px; }
    .status{ margin-top:10px; }
    .status.success{ color:#065f46; }
    .status.error{ color:#b91c1c; }
  `]
})
export class AccountComponent implements OnInit, OnDestroy {
  nombre = '';
  email = '';
  saveLoading = false;
  saveMessage: string | null = null;
  saveError: string | null = null;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwdLoading = false;
  pwdMessage: string | null = null;
  pwdError: string | null = null;

  strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  private sub?: Subscription;

  constructor(public auth: AuthService) {
    this.sub = this.auth.user$.subscribe((u: User | null) => {
      if (u) {
        this.nombre = u.nombre;
        this.email = u.email;
      }
    });
  }

  ngOnInit() {
    // sincronizar perfil al entrar a la página
    this.auth.getProfile().subscribe({ next: () => {}, error: () => {} });
  }

  onSaveProfile() {
    this.saveMessage = null; this.saveError = null; this.saveLoading = true;
    this.auth.updateProfile({ nombre: this.nombre, email: this.email }).subscribe({
      next: (u) => {
        this.saveLoading = false;
        this.saveMessage = 'Perfil actualizado correctamente';
      },
      error: (err) => {
        this.saveLoading = false;
        this.saveError = err?.message || 'No se pudo actualizar el perfil';
      }
    });
  }

  onChangePassword() {
    this.pwdMessage = null; this.pwdError = null; this.pwdLoading = true;
    if (this.newPassword !== this.confirmPassword) {
      this.pwdLoading = false;
      this.pwdError = 'Las contraseñas no coinciden';
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.pwdLoading = false;
        this.pwdMessage = res?.message || 'Contraseña actualizada correctamente';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.pwdLoading = false;
        this.pwdError = err?.message || 'No se pudo cambiar la contraseña';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}