import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  deliveryUpdates: boolean;
  weeklyReports: boolean;
}

export interface GeneralSettings {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  timezone: string;
  language: string;
  dateFormat: string;
  itemsPerPage: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  general: GeneralSettings;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private defaultSettings: AppSettings = {
    theme: 'light',
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      deliveryUpdates: true,
      weeklyReports: false
    },
    general: {
      companyName: 'Mi Empresa de Envíos',
      contactEmail: 'contacto@empresa.com',
      contactPhone: '+56 9 1234 5678',
      address: 'Av. Principal 123, Santiago, Chile',
      timezone: 'America/Santiago',
      language: 'es',
      dateFormat: 'dd/mm/yyyy',
      itemsPerPage: 25
    }
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(this.loadSettings());
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.applyTheme(this.settingsSubject.value.theme);
  }

  private loadSettings(): AppSettings {
    const saved = localStorage.getItem('packageManagerSettings');
    if (saved) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      } catch {
        return this.defaultSettings;
      }
    }
    return this.defaultSettings;
  }

  getSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  updateSettings(settings: Partial<AppSettings>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings = {
      ...currentSettings,
      ...settings,
      notifications: settings.notifications ? 
        { ...currentSettings.notifications, ...settings.notifications } : 
        currentSettings.notifications,
      general: settings.general ? 
        { ...currentSettings.general, ...settings.general } : 
        currentSettings.general
    };

    this.settingsSubject.next(newSettings);
    localStorage.setItem('packageManagerSettings', JSON.stringify(newSettings));

    // Apply theme if changed
    if (settings.theme) {
      this.applyTheme(settings.theme);
    }
  }

  resetSettings(): void {
    this.settingsSubject.next(this.defaultSettings);
    localStorage.removeItem('packageManagerSettings');
    this.applyTheme(this.defaultSettings.theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Notification methods
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const settings = this.getSettings();
    
    if (settings.notifications.pushNotifications) {
      // Simple browser notification simulation
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('PackageManager', {
          body: message,
          icon: '/favicon.ico'
        });
      } else {
        // Fallback to console or custom notification system
        console.log(`${type.toUpperCase()}: ${message}`);
      }
    }
  }

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}