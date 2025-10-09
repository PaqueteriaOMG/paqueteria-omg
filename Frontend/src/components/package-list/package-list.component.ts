import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PackageService } from '../../services/package.service';
import { Package, PackageStatus } from '../../models/package.model';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

type GroupView = {
  key: string;
  title: string;           // Texto de cabecera del grupo
  clientName: string;      // Nombre del cliente (uso destinatario por defecto)
  dateISO: string;         // YYYY-MM-DD para la clave
  address: string;
  packages: Package[];
};

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: 'package-list.component.html',
  styleUrls: ['package-list.component.css']
})
export class PackageListComponent implements OnInit {
  packages$: Observable<Package[]>;
  filteredPackages$: Observable<Package[]>;
  groupedPackages$: Observable<GroupView[]>;
  searchQuery = '';
  selectedStatus = '';

  viewMode: 'individual' | 'grouped' = 'individual';

  expandedGroups: Set<string> = new Set<string>();

  // Exponer enum al template
  PackageStatus = PackageStatus;
  private searchSubject = new BehaviorSubject<string>('');
  private statusSubject = new BehaviorSubject<string>('');

  // NUEVO: feedback de copiado por paquete
  copiedPublicLink = new Set<string>();
  private apiBase = 'http://localhost:3000/api';

  constructor(
    private packageService: PackageService,
    private router: Router,
    private http: HttpClient
  ) {
    this.packages$ = this.packageService.getPackages().pipe(
      map(response => response.data.data)
    );

    this.filteredPackages$ = combineLatest([
      this.packages$,
      this.searchSubject.asObservable(),
      this.statusSubject.asObservable()
    ]).pipe(
      map(([packages, search, status]) => {
        let filtered = [...packages];

        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(p =>
            (p.tracking_number ?? '').toLowerCase().includes(q) ||
            (p.sender_name ?? '').toLowerCase().includes(q) ||
            (p.recipient_name ?? '').toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q)
          );
        }

        if (status) {
          filtered = filtered.filter(p => String(p.status) === status || (p.status as any) === status);
        }

        return filtered;
      })
    );

    this.groupedPackages$ = this.filteredPackages$.pipe(
      map(pkgs => this.toGroups(pkgs))
    );
  }

  ngOnInit(): void {}

  // Utilidad para usar como clave en el Set de copiado desde el template
  idKey(pkg: Package): string {
    const id = (pkg as any)?.id ?? (pkg as any)?.tracking_number ?? '';
    return String(id);
  }

  setViewMode(mode: 'individual' | 'grouped') {
    this.viewMode = mode;
  }

  toggleGroup(groupKey: string) {
    if (this.expandedGroups.has(groupKey)) {
      this.expandedGroups.delete(groupKey);
    } else {
      this.expandedGroups.add(groupKey);
    }
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.expandedGroups.has(groupKey);
  }

  private makeGroupKey(p: Package): string {
    const client = (p as any).client_id ?? p.recipient_name ?? p.sender_name ?? 'N/A';
    const dateISO = p.estimated_delivery ? this.toISODate(p.estimated_delivery) : '';
    const address = p.recipient_address ?? p.sender_address ?? '';
    return `${client}|${dateISO}|${address}`;
  }

  private toGroups(pkgs: Package[]): GroupView[] {
    const mapGroups = new Map<string, GroupView>();

    for (const p of pkgs) {
      const key = this.makeGroupKey(p);

      if (!mapGroups.has(key)) {
        const clientName = p.recipient_name ?? p.sender_name ?? 'Cliente';
        const dateISO = p.estimated_delivery ? this.toISODate(p.estimated_delivery) : '';
        const address = p.recipient_address ?? p.sender_address ?? '';
        const title = `${clientName} • ${this.formatDate(p.estimated_delivery)} • ${address}`;

        mapGroups.set(key, {
          key,
          title,
          clientName,
          dateISO,
          address,
          packages: []
        });

        this.expandedGroups.add(key);
      }

      mapGroups.get(key)!.packages.push(p);
    }

    return Array.from(mapGroups.values()).sort((a, b) =>
      a.dateISO.localeCompare(b.dateISO) ||
      a.clientName.localeCompare(b.clientName) ||
      a.address.localeCompare(b.address)
    );
  }

  trackByGroupKey = (_: number, g: GroupView) => g.key;

  trackByPackageId = (_: number, pkg: Package) => (pkg as any).id ?? (pkg as any).tracking_number;

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  onStatusChange() {
    this.statusSubject.next(this.selectedStatus);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.searchSubject.next('');
    this.statusSubject.next('');
  }

  navigateToNewPackage() {
    this.router.navigate(['/paquetes/nuevo']);
  }

  editPackage(id: string) {
    this.router.navigate(['/edit-package', id]);
  }

  // Helpers para evitar casts en el template
  editPackageByPkg(pkg: Package) {
    const id = (pkg as any)?.id;
    if (id != null) this.editPackage(String(id));
  }

  deletePackage(id: string) {
    if (confirm('¿Está seguro de que desea eliminar este paquete?')) {
      this.packageService.deletePackage(id).subscribe();
    }
  }

  deletePackageByPkg(pkg: Package) {
    const id = (pkg as any)?.id;
    if (id == null) return;
    this.deletePackage(String(id));
  }

  getStatusText(status: PackageStatus): string {
    const statusMap = {
      [PackageStatus.PENDING]: 'Pendiente',
      [PackageStatus.IN_TRANSIT]: 'En Tránsito',
      [PackageStatus.DELIVERED]: 'Entregado',
      [PackageStatus.RETURNED]: 'Devuelto'
    } as Record<string | number, string>;
    return statusMap[status as unknown as string] ?? String(status);
  }

  // NUEVO: construir y copiar enlace público
  async copyPublicLink(pkg: Package) {
    try {
      const id = (pkg as any).id;
      if (!id) {
        alert('No se encontró el ID del paquete para obtener el enlace público');
        return;
      }
      const resp = await this.http.get<any>(`${this.apiBase}/paquetes/${encodeURIComponent(String(id))}`).toPromise();
      const code = resp?.paqu_codigo_rastreo_publico || resp?.codigo_rastreo_publico || resp?.public_code;
      if (!code) {
        alert('Este paquete aún no tiene un código público disponible.');
        return;
      }
      const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
      const link = `${origin}/track/${encodeURIComponent(String(code))}`;
      await navigator.clipboard.writeText(link);
      this.copiedPublicLink.add(String(id));
      setTimeout(() => this.copiedPublicLink.delete(String(id)), 1500);
    } catch (e) {
      console.error(e);
      alert('No fue posible copiar el enlace público en este momento.');
    }
  }

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  private toISODate(date?: string): string {
    if (!date) return '';
    const d = new Date(date);
    // yyyy-mm-dd
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  }
}
