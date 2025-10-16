import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PackageService } from '../../services/package.service';
import { Package, PackageStats, PackageStatus } from '../../models/package.model';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface MonthlyData {
  month: string;
  total: number;
  delivered: number;
  pending: number;
  in_transit: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "reports.component.html",
  styleUrls: ["reports.component.css"]
})
export class ReportsComponent implements OnInit {
  stats$: Observable<PackageStats>;
  packages$: Observable<Package[]>;
  monthlyData$: Observable<MonthlyData[]>;

  constructor(private packageService: PackageService) {
    this.stats$ = this.packageService.getPackageStats();
    this.packages$ = this.packageService.getPackages();
    
    this.monthlyData$ = this.packages$.pipe(
      map(packages => this.generateMonthlyData(packages))
    );
  }

  ngOnInit() {}

  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
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

  formatRelativeTime(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    return past.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  generateMonthlyData(packages: Package[]): MonthlyData[] {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      total: Math.floor(Math.random() * 20) + 5,
      delivered: Math.floor(Math.random() * 15) + 3,
      pending: Math.floor(Math.random() * 8) + 1,
      in_transit: Math.floor(Math.random() * 10) + 2
    }));
  }

  getMaxValue(data: MonthlyData[]): number {
    return Math.max(...data.map(d => Math.max(d.delivered, d.in_transit, d.pending)));
  }

  getBarHeight(value: number, maxValue: number): number {
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }
}