import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messageService = inject(MessageService);

  success(detail: string, summary = 'Done'): void {
    this.messageService.add({ severity: 'success', summary, detail, life: 4000 });
  }

  info(detail: string, summary = 'Note'): void {
    this.messageService.add({ severity: 'info', summary, detail, life: 5000 });
  }

  warn(detail: string, summary = 'Heads up'): void {
    this.messageService.add({ severity: 'warn', summary, detail, life: 6000 });
  }

  error(detail: string, summary = 'Something went wrong'): void {
    this.messageService.add({ severity: 'error', summary, detail, life: 7000 });
  }
}
