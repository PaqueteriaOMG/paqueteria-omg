import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PublicTrackingEvent {
  status: string;
  comment?: string | null;
  date: string;
}

@Component({
  selector: 'app-package-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-wrapper" *ngIf="viewHistory?.length; else noHistory">
      <ul class="timeline">
        <li class="timeline-item" *ngFor="let e of viewHistory; let i = index">
          <div class="marker" [class.completed]="i === 0" aria-hidden="true"></div>
          <div class="content">
            <div class="row">
              <span class="date">{{ formatDate(e.date) }}</span>
              <span class="status" [ngClass]="['status', 'status-' + normalizeStatus(e.status)]">
                {{ statusLabel(e.status) }}
              </span>
            </div>
            <div class="comment" *ngIf="e.comment">{{ e.comment }}</div>
          </div>
        </li>
      </ul>
    </div>
    <ng-template #noHistory>
      <div class="no-history">No hay eventos de historial aún.</div>
    </ng-template>
  `,
  styles: [`
    .history-wrapper { margin-top: 1rem; }
    /* Keep timeline geometry consistent using CSS variables */
    .timeline { list-style: none; margin: 0; padding: 0; position: relative; 
      --line-x: 1.25rem; /* position of vertical line from the UL left */
      --gap: 1rem;       /* gap between content and vertical line */
      --marker-size: 1rem; /* marker diameter */
      --marker-border: 3px; /* marker border width */
      padding-left: calc(var(--line-x) + var(--gap));
    }
    .timeline:before { content: ''; position: absolute; left: var(--line-x); top: .25rem; bottom: .25rem; width: 2px; background: var(--neutral-200, #e5e7eb); }
    .timeline-item { position: relative; padding-bottom: 1rem; }
    .timeline-item:last-child { padding-bottom: 0; }
    /* Place marker centered on the vertical line; since LI content starts after padding-left, we offset by -gap */
    .marker { position: absolute; left: calc(-1 * var(--gap) - var(--marker-size)/2); top: .25rem; width: var(--marker-size); height: var(--marker-size); border-radius: 999px; background: #fff; border: var(--marker-border) solid var(--neutral-300, #d1d5db); box-shadow: 0 0 0 4px #fff; }
    .marker.completed { border-color: var(--primary-600, #2563eb); }
    .content { background: #fff; border: 1px solid var(--neutral-200, #e5e7eb); border-radius: .75rem; padding: .75rem .9rem; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
    .date { color: var(--neutral-600, #4b5563); font-size: .875rem; }
    .status { font-size: .75rem; padding: .15rem .5rem; border-radius: 999px; border: 1px solid; line-height: 1.2; white-space: nowrap; text-transform: capitalize; }
    .status.status-pending { color: #92400e; background: #fff7ed; border-color: #fed7aa; }
    .status.status-in_transit, .status.status-in-transit { color: #1e3a8a; background: #eff6ff; border-color: #bfdbfe; }
    .status.status-delivered { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
    .status.status-returned { color: #7c2d12; background: #fef2f2; border-color: #fecaca; }
    .comment { margin-top: .5rem; color: var(--neutral-800, #1f2937); white-space: pre-wrap; }
    .no-history { padding: .75rem .9rem; border-radius: .5rem; background: #f9fafb; color: #6b7280; }

    @media (max-width: 640px) {
      .content { padding: .65rem .75rem; }
      .row { flex-direction: column; align-items: flex-start; gap: .25rem; }
    }
  `]
})
export class PackageHistoryComponent {
  @Input() history: PublicTrackingEvent[] | null | undefined = [];

  get viewHistory(): PublicTrackingEvent[] {
    const items = (this.history || []).slice();
    items.sort((a, b) => {
      const ta = new Date(a?.date || '').getTime();
      const tb = new Date(b?.date || '').getTime();
      const aInvalid = isNaN(ta);
      const bInvalid = isNaN(tb);
      if (aInvalid && bInvalid) return 0;
      if (aInvalid) return 1; // inválidos al final
      if (bInvalid) return -1;
      return tb - ta; // descendente
    });
    return items;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch { return dateStr || '-'; }
  }

  normalizeStatus(status?: string): string {
    const raw = (status || '').trim().toLowerCase();
    const map: Record<string, string> = {
      'pendiente': 'pending',
      'en tránsito': 'in_transit',
      'en transito': 'in_transit',
      'entregado': 'delivered',
      'devuelto': 'returned'
    };
    const key = map[raw] || raw;
    return key.replace(/\s+/g, '_');
  }

  statusLabel(status?: string): string {
    const key = this.normalizeStatus(status);
    switch (key) {
      case 'pending': return 'Pendiente';
      case 'in_transit': return 'En tránsito';
      case 'delivered': return 'Entregado';
      case 'returned': return 'Devuelto';
      default: return (status || 'Desconocido');
    }
  }
}