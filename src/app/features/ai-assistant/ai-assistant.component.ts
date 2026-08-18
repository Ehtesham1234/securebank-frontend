import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChatMessage, FinancialHealthStatus, FinancialSummary } from '../../core/models/ai.model';
import { AiChatService } from './ai-chat.service';

@Component({
  selector: 'sb-ai-assistant',
  standalone: true,
  imports: [CurrencyPipe, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-assistant.component.html',
})
export class AiAssistantComponent {
  private readonly aiChatService = inject(AiChatService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chatEnd') private chatEnd?: ElementRef<HTMLDivElement>;

  readonly messages = signal<ChatMessage[]>([]);
  readonly questionText = signal('');
  readonly streaming = signal(false);
  readonly streamError = signal<string | null>(null);

  readonly showSummary = signal(false);
  readonly summary = signal<FinancialSummary | null>(null);
  readonly summaryLoading = signal(false);

  onQuestionInput(event: Event): void {
    this.questionText.set((event.target as HTMLTextAreaElement).value);
  }

  /** Enter sends; Shift+Enter inserts a newline — standard chat-input
   *  convention. */
  onQuestionKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const question = this.questionText().trim();
    if (!question || this.streaming()) {
      return;
    }

    this.streamError.set(null);
    this.messages.update((list) => [
      ...list,
      { role: 'user', content: question },
      { role: 'assistant', content: '' },
    ]);
    this.questionText.set('');
    this.streaming.set(true);
    this.scrollToBottom();

    this.aiChatService
      .streamChat(question)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chunk) => {
          this.messages.update((list) => {
            const next = [...list];
            const lastIndex = next.length - 1;
            next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + chunk };
            return next;
          });
          this.scrollToBottom();
        },
        error: () => {
          this.streaming.set(false);
          this.streamError.set("The assistant didn't finish responding — try sending that again.");
        },
        complete: () => {
          this.streaming.set(false);
        },
      });
  }

  isEmptyStreamingReply(message: ChatMessage, index: number): boolean {
    return (
      this.streaming() &&
      index === this.messages().length - 1 &&
      message.role === 'assistant' &&
      message.content.length === 0
    );
  }

  healthSeverity(status: FinancialHealthStatus): 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'HEALTHY':
        return 'success';
      case 'CAUTION':
        return 'warn';
      case 'AT_RISK':
        return 'danger';
    }
  }

  toggleSummary(): void {
    this.showSummary.update((v) => !v);
    if (this.showSummary() && !this.summary() && !this.summaryLoading()) {
      this.loadSummary();
    }
  }

  private loadSummary(): void {
    this.summaryLoading.set(true);
    this.aiChatService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.summaryLoading.set(false);
      },
      error: () => this.summaryLoading.set(false),
    });
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      this.chatEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }
}