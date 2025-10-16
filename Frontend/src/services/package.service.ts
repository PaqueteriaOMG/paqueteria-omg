import { Injectable } from "@angular/core";
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  tap,
  throwError,
  } from "rxjs";
import { from } from "rxjs";
// Nota: este servicio usa fetch helpers en lugar de HttpClient
import {
  Package,
  PackageStatus,
  PackageStats,
  CreatePackageRequest,
  ClientGroup,
} from "../models/package.model";
import { ApiEnvelope, User } from "./auth.service";
import { httpGet } from "./http-helpers";

@Injectable({
  providedIn: "root",
})
export class PackageService {
  private packagesSubject = new BehaviorSubject<Package[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public packages$ = this.packagesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  private baseUrl = "http://localhost:3000";
  constructor() {}
  /*constructor() {
    this.loadMockData();
  }

  private loadMockData(): void {
    const mockPackages: Package[] = [
      {
        id: '1',
        tracking_number: 'PKG001234',
        sender_name: 'Juan Pérez',
        sender_email: 'juan@email.com',
        sender_phone: '+56912345678',
        sender_address: 'Av. Providencia 123, Santiago',
        recipient_name: 'María González',
        recipient_email: 'maria@email.com',
        recipient_phone: '+56987654321',
        recipient_address: 'Av. Las Condes 456, Las Condes',
        weight: 2.5,
        dimensions: '30x20x15 cm',
        description: 'Libros académicos',
        quantity: 3,
        status: PackageStatus.IN_TRANSIT,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Frágil - Manejar con cuidado'
      },
      {
        id: '2',
        tracking_number: 'PKG001235',
        sender_name: 'Ana Silva',
        sender_email: 'ana@email.com',
        sender_phone: '+56911111111',
        sender_address: 'Av. Vitacura 789, Vitacura',
        recipient_name: 'Carlos López',
        recipient_email: 'carlos@email.com',
        recipient_phone: '+56922222222',
        recipient_address: 'Av. Las Condes 456, Las Condes',
        weight: 1.2,
        dimensions: '25x15x10 cm',
        description: 'Ropa deportiva',
        quantity: 2,
        status: PackageStatus.DELIVERED,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        actual_delivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        tracking_number: 'PKG001236',
        sender_name: 'Ana Silva',
        sender_email: 'ana@email.com',
        sender_phone: '+56911111111',
        sender_address: 'Av. Vitacura 789, Vitacura',
        recipient_name: 'Carlos López',
        recipient_email: 'carlos@email.com',
        recipient_phone: '+56922222222',
        recipient_address: 'Av. Las Condes 456, Las Condes',
        weight: 0.5,
        dimensions: '20x20x20 cm',
        description: 'Pelota de fútbol',
        quantity: 1,
        status: PackageStatus.DELIVERED,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        actual_delivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        tracking_number: 'PKG001237',
        sender_name: 'Diego Morales',
        sender_email: 'diego@email.com',
        sender_phone: '+56933333333',
        sender_address: 'Av. Maipú 147, Maipú',
        recipient_name: 'Sofía Ramírez',
        recipient_email: 'sofia@email.com',
        recipient_phone: '+56944444444',
        recipient_address: 'Av. San Bernardo 258, San Bernardo',
        weight: 0.8,
        dimensions: '20x20x5 cm',
        description: 'Documentos importantes',
        quantity: 1,
        status: PackageStatus.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Entrega urgente'
      }
    ];

    this.packagesSubject.next(mockPackages);
  }*/

  /*getPackages(): Observable<
    Package[]
  > {
    this.loadingSubject.next(true);
    return this.http
      .get<ApiEnvelope<Package[]>>(`${this.baseUrl}/api/paquetes`, {
        withCredentials: true,
      })
      .pipe(
        map((res) => res.data), // asumiendo que tu API responde con un "data"
        tap((packages) => {
          this.packagesSubject.next(packages);
          this.loadingSubject.next(false);
        })
      );
  }*/
  getPackages(): Observable<Package[]> {
    const token = localStorage.getItem("access_token");
    return from(httpGet<Package[]>(`${this.baseUrl}/api/paquetes`, token!));
  }
  async ngOnInit() {
    const paquete = await this.getPackageById("1").toPromise();
    console.log("Primer paquete:");
    console.log(paquete);
  }

  getPackageById(id: string): Observable<Package | undefined> {
    const token = localStorage.getItem("access_token");
    return from(httpGet<Package>(`${this.baseUrl}/api/paquetes/${id}`, token!));
  }

  getPackageStats(): Observable<PackageStats> {
    const packages = this.packagesSubject.value;
    const stats: PackageStats = {
      total: packages.length,
      pending: packages.filter((p) => p.status === PackageStatus.PENDING)
        .length,
      in_transit: packages.filter((p) => p.status === PackageStatus.IN_TRANSIT)
        .length,
      delivered: packages.filter((p) => p.status === PackageStatus.DELIVERED)
        .length,
      returned: packages.filter((p) => p.status === PackageStatus.RETURNED)
        .length,
    };
    return of(stats);
  }

  createPackage(request: CreatePackageRequest): Observable<Package> {
    this.loadingSubject.next(true);

    const newPackage: Package = {
      id: Date.now().toString(),
      tracking_number: `PKG${Date.now().toString().slice(-6)}`,
      ...request,
      status: PackageStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTimeout(() => {
      const currentPackages = this.packagesSubject.value;
      this.packagesSubject.next([...currentPackages, newPackage]);
      this.loadingSubject.next(false);
    }, 1000);

    return of(newPackage);
  }

  updatePackage(id: string, updates: Partial<Package>): Observable<Package> {
    this.loadingSubject.next(true);

    setTimeout(() => {
      const currentPackages = this.packagesSubject.value;
      const index = currentPackages.findIndex((p) => p.id === id);

      if (index !== -1) {
        const updatedPackage = {
          ...currentPackages[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const updatedPackages = [...currentPackages];
        updatedPackages[index] = updatedPackage;
        this.packagesSubject.next(updatedPackages);
      }

      this.loadingSubject.next(false);
    }, 800);

    const package_ = this.packagesSubject.value.find((p) => p.id === id);
    return of({
      ...package_!,
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  deletePackage(id: string): Observable<boolean> {
    this.loadingSubject.next(true);

    setTimeout(() => {
      const currentPackages = this.packagesSubject.value;
      const filteredPackages = currentPackages.filter((p) => p.id !== id);
      this.packagesSubject.next(filteredPackages);
      this.loadingSubject.next(false);
    }, 500);

    return of(true);
  }

  searchPackages(query: string): Observable<Package[]> {
    const packages = this.packagesSubject.value;
    const filtered = packages.filter(
      (p) =>
        p.tracking_number.toLowerCase().includes(query.toLowerCase()) ||
        p.sender_name.toLowerCase().includes(query.toLowerCase()) ||
        p.recipient_name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
    );
    return of(filtered);
  }

  filterByStatus(status: PackageStatus): Observable<Package[]> {
    const packages = this.packagesSubject.value;
    const filtered = packages.filter((p) => p.status === status);
    return of(filtered);
  }

  getClientGroups(): Observable<ClientGroup[]> {
    const packages = this.packagesSubject.value;
    const groups = new Map<string, ClientGroup>();

    packages.forEach((pkg) => {
      const key = `${pkg.recipient_name}-${pkg.recipient_address}-${
        pkg.estimated_delivery.split("T")[0]
      }`;

      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.packages.push(pkg);
        group.total_packages++;
        group.total_products += pkg.quantity;
      } else {
        groups.set(key, {
          client_name: pkg.recipient_name,
          client_email: pkg.recipient_email,
          client_address: pkg.recipient_address,
          delivery_date: pkg.estimated_delivery,
          packages: [pkg],
          total_packages: 1,
          total_products: pkg.quantity,
        });
      }
    });

    return of(Array.from(groups.values()));
  }
}
