import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './services/auth.interceptor';
import { canActivateAuth } from './services/auth.guard';
import { canActivateGuest } from './services/guest.guard';
import { HeaderComponent } from './components/header/header.component';
import { TrackingComponent } from './components/tracking/tracking.component';
import { ReportsComponent } from './components/reports/reports.component';
import { SettingsComponent } from './components/settings/settings.component';

// Componentes existentes
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PackageListComponent } from './components/package-list/package-list.component';
import { PackageFormComponent } from './components/package-form/package-form.component';

// Nuevos componentes de auth (standalone)
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [canActivateGuest] },
  { path: 'register', component: RegisterComponent, canActivate: [canActivateGuest] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [canActivateAuth] },
  // Rutas nuevas y alias para compatibilidad
  { path: 'packages', component: PackageListComponent, canActivate: [canActivateAuth] },
  { path: 'new-package', component: PackageFormComponent, canActivate: [canActivateAuth] },
  { path: 'edit-package/:id', component: PackageFormComponent, canActivate: [canActivateAuth] },
  { path: 'tracking', component: TrackingComponent, canActivate: [canActivateAuth] },
  { path: 'reports', component: ReportsComponent, canActivate: [canActivateAuth] },
  { path: 'settings', component: SettingsComponent, canActivate: [canActivateAuth] },
  // Rutas en español
  { path: 'paquetes', component: PackageListComponent, canActivate: [canActivateAuth] },
  { path: 'paquetes/nuevo', component: PackageFormComponent, canActivate: [canActivateAuth] },
  { path: '**', redirectTo: 'dashboard' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    <div class="app">
      <app-header></app-header>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app { min-height: 100vh; display: flex; flex-direction: column; }
    .main-content { flex: 1; background-color: var(--neutral-50); }
  `]
})
export class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
}).catch(err => console.error(err));