import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PackageService } from '../../services/package.service';
import { Package, PackageStatus, CreatePackageRequest } from '../../models/package.model';

@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "package-form.component.html",
  styleUrls: ["package-form.component.css"]
})
export class PackageFormComponent implements OnInit {
  isEditMode = false;
  isSubmitting = false;
  packageId: string | null = null;
  tomorrow: string;

  formData = {
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    sender_address: '',
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_address: '',
    weight: 0,
    dimensions: '',
    description: '',
    quantity: 1,
    estimated_delivery: '',
    notes: '',
    status: PackageStatus.PENDING
  };

  constructor(
    private packageService: PackageService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Set tomorrow as minimum delivery date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.tomorrow = tomorrow.toISOString().split('T')[0];
    this.formData.estimated_delivery = this.tomorrow;
  }

  ngOnInit() {
    this.packageId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.packageId;

    if (this.isEditMode && this.packageId) {
      this.loadPackage(this.packageId);
    }
  }

  loadPackage(id: string) {
    this.packageService.getPackageById(id).subscribe(package_ => {
      if (package_) {
        console.log('Paquete cargado para editar:', package_);
        // Convertir las fechas ISO a formato local para el input date
        let estimatedDeliveryDate = this.tomorrow;
        
        // Buscar la fecha estimada en diferentes campos del backend
        const estimatedDate = package_.estimated_delivery || 
                             (package_ as any).estimated_delivery_date || 
                             (package_ as any).eta;
        
        if (estimatedDate) {
          try {
            // Crear un objeto Date y ajustar por la zona horaria local
            const date = new Date(estimatedDate);
            // Obtener la fecha en formato YYYY-MM-DD para el input date
            estimatedDeliveryDate = date.getFullYear() + '-' + 
              String(date.getMonth() + 1).padStart(2, '0') + '-' + 
              String(date.getDate() + 1).padStart(2, '0');
          } catch (error) {
            console.error('Error al convertir fecha estimada:', error);
            estimatedDeliveryDate = this.tomorrow;
          }
        }

        this.formData = {
          sender_name: package_.sender_name || '',
          sender_email: package_.sender_email || '',
          sender_phone: package_.sender_phone || '',
          sender_address: package_.sender_address || '',
          recipient_name: package_.recipient_name || '',
          recipient_email: package_.recipient_email || '',
          recipient_phone: package_.recipient_phone || '',
          recipient_address: package_.recipient_address || '',
          weight: package_.weight || 0,
          dimensions: package_.dimensions || '',
          description: package_.description || '',
          quantity: package_.quantity || 1,
          estimated_delivery: estimatedDeliveryDate,
          notes: package_.notes || '',
          status: package_.status || PackageStatus.PENDING
        };
        console.log('Formulario inicializado con:', this.formData);
        console.log('Fecha estimada original (estimated_delivery):', package_.estimated_delivery);
        console.log('Fecha estimada original (estimated_delivery_date):', (package_ as any).estimated_delivery_date);
        console.log('Fecha estimada original (eta):', (package_ as any).eta);
        console.log('Fecha estimada encontrada:', estimatedDate);
        console.log('Fecha estimada convertida:', estimatedDeliveryDate);
      }
    });
  }

  onSubmit() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    const packageData = {
      sender_name: this.formData.sender_name,
      sender_email: this.formData.sender_email,
      sender_phone: this.formData.sender_phone,
      sender_address: this.formData.sender_address,
      recipient_name: this.formData.recipient_name,
      recipient_email: this.formData.recipient_email,
      recipient_phone: this.formData.recipient_phone,
      recipient_address: this.formData.recipient_address,
      weight: this.formData.weight,
      dimensions: this.formData.dimensions,
      description: this.formData.description,
      quantity: this.formData.quantity,
      estimated_delivery: new Date(this.formData.estimated_delivery).toISOString(),
      // notes: this.formData.notes, // Comentado temporalmente
      status: this.formData.status
    };
    
    // Asegurarse de que los campos quantity, estimated_delivery y notes se incluyan en la actualización
    console.log('Enviando datos de paquete:', packageData);

    if (this.isEditMode && this.packageId) {
      // Asegurarse de que los campos quantity, estimated_delivery estén explícitamente incluidos
      const updateData = {
        ...packageData,
        quantity: this.formData.quantity,
        estimated_delivery: new Date(this.formData.estimated_delivery).toISOString(),
        // notes: this.formData.notes // Comentado temporalmente
      };
      
      console.log('Datos de actualización:', updateData);
      
      this.packageService.updatePackage(this.packageId, updateData).subscribe({
        next: (updatedPackage) => {
          console.log('Paquete actualizado:', updatedPackage);
          this.router.navigate(['/paquetes']);
        },
        error: (error) => {
          console.error('Error al actualizar el paquete:', error);
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      const { status, ...createData } = packageData;
      this.packageService.createPackage(createData as CreatePackageRequest).subscribe({
        next: () => {
          this.router.navigate(['/paquetes']);
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/paquetes']);
  }

  isFormValid(form: NgForm): boolean {
    return form.form.valid && this.formData.weight > 0;
  }
}