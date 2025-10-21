import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { PackageService } from "../../services/package.service";
import {
  Package,
  PackageStats,
  PackageStatus,
} from "../../models/package.model";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "dashboard.component.html",
  styleUrls: ["dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  packages$: Observable<Package[]>;
  stats$: Observable<PackageStats>;

  constructor(private packageService: PackageService, private router: Router) {
    this.packages$ = this.packageService.getPackages();
    this.stats$ = this.packageService.getPackageStats();
  }

  ngOnInit() {
    this.packages$.subscribe((respuesta) => {
      for (const packagexd of respuesta) {
        console.log(packagexd);
      }
    });

    this.stats$.subscribe((stats) => {
      console.log(stats);
    });
  }

  getStatusText(status: PackageStatus): string {
    const statusMap = {
      [PackageStatus.PENDING]: "Pendiente",
      [PackageStatus.IN_TRANSIT]: "En Tránsito",
      [PackageStatus.DELIVERED]: "Entregado",
      [PackageStatus.RETURNED]: "Devuelto",
    };
    return statusMap[status] || status;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }

  navigateToNewPackage() {
    this.router.navigate(["/new-package"]);
  }

  navigateToTracking() {
    this.router.navigate(["/tracking"]);
  }

  navigateToReports() {
    this.router.navigate(["/reports"]);
  }

  navigateToSettings() {
    this.router.navigate(["/settings"]);
  }
}
