import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackageService } from '../../services/package.service';
import { Package, PackageStatus } from '../../models/package.model';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "tracking.component.html",
  styleUrls: ["tracking.component.css"]
})
export class TrackingComponent {
  trackingNumber = '';
  foundPackage: Package | null = null;
  searchPerformed = false;

  constructor(private packageService: PackageService) {}

  searchPackage() {
    if (!this.trackingNumber.trim()) return;

    this.searchPerformed = true;
    this.packageService.trackPackage(this.trackingNumber).subscribe({
      next: (pkg) => {
        this.foundPackage = pkg;
      },
      error: (err) => {
        console.error(err);
        this.foundPackage = null;
      }
    });
  }

  getStatusText(status: PackageStatus): string {
    const statusMap = {
      [PackageStatus.PENDING]: 'Pendiente',
      [PackageStatus.IN_TRANSIT]: 'En Tránsito',
      [PackageStatus.DELIVERED]: 'Entregado',
      [PackageStatus.RETURNED]: 'Devuelto'
    };
    return statusMap[status] || status;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  isStatusActive(status: string): boolean {
    if (!this.foundPackage) return false;
    return this.foundPackage.status === status;
  }

  isStatusCompleted(status: string): boolean {
    if (!this.foundPackage) return false;
    const statusOrder = ['pending', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(this.foundPackage.status);
    const checkIndex = statusOrder.indexOf(status);
    return currentIndex > checkIndex;
  }
}