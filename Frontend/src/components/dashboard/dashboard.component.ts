import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { PackageService } from "../../services/package.service";
import {
  Package,
  PackageListResponse,
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
    this.packages$ = this.packageService.getPackages().pipe(
      map(response => response.data.data)
    );
    this.stats$ = this.packageService.getPackageStats();
  }

  ngOnInit() {
    console.log(
      this.packages$.subscribe((respuesta) => {
        for (const packagexd of respuesta) {
          // packagexd.status = PackageStatus[packagexd.status];
          console.log(packagexd);
        }
      })
    );
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
    this.router.navigate(["/paquetes/nuevo"]);
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
