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
import { HttpClient } from "@angular/common/http";
import {
  Package,
  PackageStatus,
  PackageStats,
  CreatePackageRequest,
  ClientGroup,
} from "../models/package.model";
import { ApiEnvelope, User } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class PackageService {
  private packagesSubject = new BehaviorSubject<Package[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public packages$ = this.packagesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  private baseUrl = "http://localhost:3000";
  
  constructor(private http: HttpClient) {}
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

  getPackages(): Observable<Package[]> {
    this.loadingSubject.next(true);
    return this.http
      .get<ApiEnvelope<any[]>>(`${this.baseUrl}/api/paquetes`)
      .pipe(
        map((res) => res.data.map(pkg => this.mapPackageFromBackend(pkg))),
        tap((packages) => {
          this.packagesSubject.next(packages);
          this.loadingSubject.next(false);
        })
      );
  }
  async ngOnInit() {
    this.getPackageById("1").subscribe(paquete => {
      console.log("Primer paquete:");
      console.log(paquete);
    });
  }

  getPackageById(id: string): Observable<Package | undefined> {
    return this.http.get<ApiEnvelope<Package>>(`${this.baseUrl}/api/paquetes/${id}`)
      .pipe(
        map(res => {
          if (!res.data) return undefined;
          
          console.log('Datos del paquete recibidos del servidor:', res.data);
          
          // Asegurarse de que las fechas estén en el formato correcto y que todos los campos estén presentes
          return {
            ...res.data,
            estimated_delivery: res.data.estimated_delivery ? new Date(res.data.estimated_delivery).toISOString() : '',
            actual_delivery: res.data.actual_delivery ? new Date(res.data.actual_delivery).toISOString() : undefined,
            created_at: new Date(res.data.created_at).toISOString(),
            updated_at: new Date(res.data.updated_at).toISOString(),
            quantity: res.data.quantity || 1,
            notes: res.data.notes || ''
          };
        })
      );
  }

  getPackageStats(): Observable<PackageStats> {
    // Si no hay paquetes cargados, primero obtenemos los paquetes del servidor
    if (this.packagesSubject.value.length === 0) {
      return this.getPackages().pipe(
        map(packages => {
          return {
            total: packages.length,
            pending: packages.filter((p) => p.status === PackageStatus.PENDING).length,
            in_transit: packages.filter((p) => p.status === PackageStatus.IN_TRANSIT).length,
            delivered: packages.filter((p) => p.status === PackageStatus.DELIVERED).length,
            returned: packages.filter((p) => p.status === PackageStatus.RETURNED).length,
          };
        })
      );
    }
    
    // Si ya hay paquetes cargados, usamos los datos del subject
    const packages = this.packagesSubject.value;
    const stats: PackageStats = {
      total: packages.length,
      pending: packages.filter((p) => p.status === PackageStatus.PENDING).length,
      in_transit: packages.filter((p) => p.status === PackageStatus.IN_TRANSIT).length,
      delivered: packages.filter((p) => p.status === PackageStatus.DELIVERED).length,
      returned: packages.filter((p) => p.status === PackageStatus.RETURNED).length,
    };
    return of(stats);
  }

  createPackage(request: CreatePackageRequest): Observable<Package> {
    this.loadingSubject.next(true);
    return this.http.post<ApiEnvelope<any>>(`${this.baseUrl}/api/paquetes`, request)
      .pipe(
        map(res => this.mapPackageFromBackend(res.data)),
        tap((newPackage) => {
          // Agregar el nuevo paquete a la lista local
          const currentPackages = this.packagesSubject.value;
          this.packagesSubject.next([...currentPackages, newPackage]);
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Error al crear el paquete:', error);
          this.loadingSubject.next(false);
          return throwError(() => error);
        })
      );
  }

  updatePackage(id: string, updates: Partial<Package>): Observable<Package> {
    this.loadingSubject.next(true);
    
    // Asegurarse de que los campos quantity, estimated_delivery y notes se incluyan en la actualización
    console.log('Actualizando paquete con ID:', id);
    console.log('Datos de actualización:', updates);
    
    return this.http.put<ApiEnvelope<Package>>(`${this.baseUrl}/api/paquetes/${id}`, updates)
      .pipe(
        map(res => {
          console.log('Respuesta del servidor:', res);
          return res.data;
        }),
        tap(updatedPkg => {
          const currentPackages = this.packagesSubject.value;
          const index = currentPackages.findIndex(p => p.id === id);
          if (index !== -1) {
            const newPackages = [...currentPackages];
            newPackages[index] = {
              ...currentPackages[index],
              ...updatedPkg
            };
            this.packagesSubject.next(newPackages);
          }
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Error al actualizar el paquete:', error);
          this.loadingSubject.next(false);
          return throwError(() => error);
        })
      );
  }

  deletePackage(id: string): Observable<boolean> {
    this.loadingSubject.next(true);
    
    return this.http.delete<ApiEnvelope<any>>(`${this.baseUrl}/api/paquetes/${id}`)
      .pipe(
        map(res => res.success || true),
        tap(() => {
          // Actualizar la lista local inmediatamente
          const currentPackages = this.packagesSubject.value;
          const filteredPackages = currentPackages.filter((p) => p.id !== id);
          this.packagesSubject.next(filteredPackages);
          this.loadingSubject.next(false);
          
          // Opcional: recargar desde el servidor para asegurar consistencia
          // this.getPackages().subscribe();
        }),
        catchError(error => {
          console.error('Error al eliminar el paquete:', error);
          this.loadingSubject.next(false);
          return throwError(() => error);
        })
      );
  }

  trackPackage(trackingNumber: string): Observable<Package> {
    return this.http.get<ApiEnvelope<any>>(`${this.baseUrl}/api/paquetes/tracking/${trackingNumber}`)
      .pipe(
        map(res => this.mapPackageFromBackend(res.data)),
        catchError(error => {
          console.error('Error al rastrear el paquete:', error);
          return throwError(() => new Error('Paquete no encontrado o error en el servidor.'));
        })
      );
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

  // Función para mapear los datos del backend al modelo del frontend
  private mapPackageFromBackend(backendPackage: any): Package {
    return {
      id:
        backendPackage.paqu_id?.toString() ||
        backendPackage.package_id?.toString() ||
        backendPackage.id?.toString() ||
        "",
      tracking_number:
        backendPackage.pack_tracking_number ||
        backendPackage.tracking_code ||
        backendPackage.tracking_number ||
        "",
      sender_name:
        backendPackage.pack_sender_name || backendPackage.sender_name || "",
      sender_email:
        backendPackage.pack_sender_email || backendPackage.sender_email || "",
      sender_phone:
        backendPackage.pack_sender_phone || backendPackage.sender_phone || "",
      sender_address:
        backendPackage.pack_sender_address ||
        backendPackage.sender_address ||
        "",
      recipient_name:
        backendPackage.pack_recipient_name ||
        backendPackage.recipient_name ||
        "",
      recipient_email:
        backendPackage.pack_recipient_email ||
        backendPackage.recipient_email ||
        "",
      recipient_phone:
        backendPackage.pack_recipient_phone ||
        backendPackage.recipient_phone ||
        "",
      recipient_address:
        backendPackage.pack_recipient_address ||
        backendPackage.recipient_address ||
        "",
      weight:
        parseFloat(backendPackage.pack_weight || backendPackage.weight) || 0,
      dimensions:
        backendPackage.pack_dimensions || backendPackage.dimensions || "",
      description:
        backendPackage.pack_description || backendPackage.description || "",
      quantity: parseInt(backendPackage.quantity) || 1,
      status: this.mapStatus(
        backendPackage.pack_status || backendPackage.status
      ),
      created_at:
        backendPackage.pack_created_at || backendPackage.created_at || "",
      updated_at:
        backendPackage.pack_updated_at || backendPackage.updated_at || "",
      estimated_delivery:
        backendPackage.estimated_delivery_date ||
        backendPackage.pack_estimated_delivery || 
        backendPackage.estimated_delivery || 
        backendPackage.eta ||
        "",
      actual_delivery:
        backendPackage.pack_actual_delivery || 
        backendPackage.actual_delivery || 
        undefined,
      notes: backendPackage.notes || "",
    };
  }

  // Mapear el estado del backend al enum PackageStatus
  private mapStatus(status: string): PackageStatus {
    const statusMap: Record<string, PackageStatus> = {
      pending: PackageStatus.PENDING,
      in_transit: PackageStatus.IN_TRANSIT,
      delivered: PackageStatus.DELIVERED,
      returned: PackageStatus.RETURNED,
    };

    return statusMap[status?.toLowerCase()] || PackageStatus.PENDING;
  }
}
