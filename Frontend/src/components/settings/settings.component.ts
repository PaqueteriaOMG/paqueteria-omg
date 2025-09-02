import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, AppSettings, NotificationSettings, GeneralSettings } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "settings.component.html",
  styleUrls: ["settings.component.css"]
})
export class SettingsComponent {
  notificationSettings: NotificationSettings;
  generalSettings: GeneralSettings;
  selectedTheme: 'light' | 'dark';
  saveStatus: { type: 'success' | 'error', message: string } | null = null;
  private autoSaveTimeout: any;

  constructor(private settingsService: SettingsService) {
    const settings = this.settingsService.getSettings();
    this.notificationSettings = { ...settings.notifications };
    this.generalSettings = { ...settings.general };
    this.selectedTheme = settings.theme;

    // Request notification permission if push notifications are enabled
    if (this.notificationSettings.pushNotifications) {
      this.settingsService.requestNotificationPermission();
    }
  }

  selectTheme(theme: string) {
    this.selectedTheme = theme as 'light' | 'dark';
    this.settingsService.updateSettings({ theme: this.selectedTheme });
    this.showSaveStatus('success', 'Tema actualizado');
  }

  onNotificationChange() {
    this.autoSave();
    
    // Request permission if push notifications are enabled
    if (this.notificationSettings.pushNotifications) {
      this.settingsService.requestNotificationPermission();
    }
  }

  onSettingChange() {
    this.autoSave();
  }

  private autoSave() {
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout for auto-save
    this.autoSaveTimeout = setTimeout(() => {
      this.saveSettings(false);
    }, 1000);
  }

  saveSettings(showMessage: boolean = true) {
    try {
      this.settingsService.updateSettings({
        notifications: this.notificationSettings,
        general: this.generalSettings,
        theme: this.selectedTheme
      });
      
      if (showMessage) {
        this.showSaveStatus('success', 'Configuración guardada exitosamente');
        this.settingsService.showNotification('Configuración actualizada', 'success');
      }
    } catch (error) {
      this.showSaveStatus('error', 'Error al guardar la configuración');
    }
  }

  resetSettings() {
    if (confirm('¿Estás seguro de que deseas restaurar la configuración por defecto?')) {
      this.settingsService.resetSettings();
      const settings = this.settingsService.getSettings();
      this.notificationSettings = { ...settings.notifications };
      this.generalSettings = { ...settings.general };
      this.selectedTheme = settings.theme;
      this.showSaveStatus('success', 'Configuración restaurada');
    }
  }

  private showSaveStatus(type: 'success' | 'error', message: string) {
    this.saveStatus = { type, message };
    setTimeout(() => {
      this.saveStatus = null;
    }, 3000);
  }

  ngOnDestroy() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }
}