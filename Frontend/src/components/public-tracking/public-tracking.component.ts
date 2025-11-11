import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { PackageHistoryComponent } from '../package-history/package-history.component';
import { ActivatedRoute, Router } from '@angular/router';

interface PublicTrackingEvent {
  status: string;
  comment?: string | null;
  date: string;
}

interface PublicTrackingData {
  code: string;
  status: string;
  created_at: string;
  updated_at: string;
  eta: string | null;
  estimated_delivery_date?: string | null;
  history: PublicTrackingEvent[];
}

@Component({
  selector: 'app-public-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, PackageHistoryComponent],
  templateUrl: './public-tracking.component.html',
  styleUrls: ['./public-tracking.component.css']
})
export class PublicTrackingComponent {
  code = '';
  loading = false;
  error: 'not_found' | 'rate_limited' | 'unknown' | null = null;
  data: PublicTrackingData | null = null;
  shareCopied = false;

  private apiBase = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // Soporta deep-link via /track/:code o /track?code=
    this.route.paramMap.subscribe((params: any) => {
      const paramCode = params.get('code');
      const queryCode = this.route.snapshot.queryParamMap.get('code');
      const incoming = (paramCode || queryCode || '').trim();
      if (incoming && incoming !== this.code) {
        this.code = incoming;
        this.onSubmit();
      }
    });
  }

  onSubmit() {
    const trimmed = this.code.trim();
    if (!trimmed) return;
    this.loading = true;
    this.error = null;
    this.data = null;

    this.http.get<any>(`${this.apiBase}/paquetes/public/track/${encodeURIComponent(trimmed)}`)
      .subscribe({
        next: (resp) => {
          if (resp && resp.success && resp.data) {
            this.data = resp.data as PublicTrackingData;
            // Actualiza la URL para que sea compartible: /track/:code
            const currentParam = this.route.snapshot.paramMap.get('code');
            if (currentParam !== trimmed) {
              this.router.navigate(['/track', trimmed], { replaceUrl: false });
            }
          } else if (resp && (resp.error || resp.message)) {
            this.error = 'unknown';
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) this.error = 'not_found';
          else if (err.status === 429) this.error = 'rate_limited';
          else this.error = 'unknown';
        },
        complete: () => { this.loading = false; }
      });
  }

  get shareLink(): string {
    const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
    const trimmed = this.code.trim();
    if (!trimmed) return origin + '/track';
    return `${origin}/track/${encodeURIComponent(trimmed)}`;
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.shareLink);
      this.shareCopied = true;
      setTimeout(() => this.shareCopied = false, 1500);
    } catch {
      this.shareCopied = false;
    }
  }

  async share() {
    const url = this.shareLink;
    const title = 'Rastreo de paquete';
    const text = this.code ? `Seguimiento del paquete ${this.code}` : 'Seguimiento de paquete';
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url });
      } catch {
        // ignorar cancelaciones/errores del share nativo
      }
    } else {
      // fallback: copiar al portapapeles
      this.copyLink();
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') {
      return 'No disponible';
    }
    
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return 'No disponible';
      }
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'No disponible';
    }
  }
}