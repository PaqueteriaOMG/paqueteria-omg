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
    sender_name: 'Juan Pérez',
    sender_email: 'juan.perez@email.com',
    sender_phone: '+56 9 1234 5678',
    sender_address: 'Av. Providencia 1234, Providencia, Santiago, Chile',
    recipient_name: 'María González',
    recipient_email: 'maria.gonzalez@email.com',
    recipient_phone: '+56 9 8765 4321',
    recipient_address: 'Calle Las Flores 567, Las Condes, Santiago, Chile',
    weight: 2.5,
    dimensions: '30x20x15 cm',
    description: 'Documentos importantes',
    quantity: 1,
    estimated_delivery: '',
    notes: 'Entregar en horario de oficina',
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
        this.formData = {
          sender_name: package_.sender_name,
          sender_email: package_.sender_email,
          sender_phone: package_.sender_phone,
          sender_address: package_.sender_address,
          recipient_name: package_.recipient_name,
          recipient_email: package_.recipient_email,
          recipient_phone: package_.recipient_phone,
          recipient_address: package_.recipient_address,
          weight: package_.weight,
          dimensions: package_.dimensions,
          description: package_.description,
          quantity: package_.quantity,
          estimated_delivery: package_.estimated_delivery.split('T')[0],
          notes: package_.notes || '',
          status: package_.status
        };
      }
    });
  }

  onSubmit() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    const packageData = {
      ...this.formData,
      estimated_delivery: new Date(this.formData.estimated_delivery).toISOString()
    };

    if (this.isEditMode && this.packageId) {
      this.packageService.updatePackage(this.packageId, packageData).subscribe({
        next: () => {
          this.router.navigate(['/paquetes']);
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