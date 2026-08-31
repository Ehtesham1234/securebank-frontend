import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse, PageResponse } from '../../core/models/api-response.model';
import { UserResponse } from '../../core/models/auth.model';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);

  private readonly usersSignal = signal<UserResponse[]>([]);
  readonly users = this.usersSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly loadingMoreSignal = signal(false);
  readonly loadingMore = this.loadingMoreSignal.asReadonly();

  private readonly hasMoreSignal = signal(false);
  readonly hasMore = this.hasMoreSignal.asReadonly();

  private currentPage = 0;
  private currentSearch = '';

  /** Resets to page 0 with a fresh (optional) search term — an empty or
   *  omitted term returns every user, same as the backend's own
   *  ":search IS NULL OR :search = ''" handling. */
  refresh(search = ''): void {
    this.loadingSignal.set(true);
    this.currentPage = 0;
    this.currentSearch = search;
    this.fetchPage(0, search).subscribe({
      next: (page) => {
        this.usersSignal.set(page.content);
        this.hasMoreSignal.set(!page.last);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  loadMore(): void {
    const nextPage = this.currentPage + 1;
    this.loadingMoreSignal.set(true);
    this.fetchPage(nextPage, this.currentSearch).subscribe({
      next: (page) => {
        this.usersSignal.update((list) => [...list, ...page.content]);
        this.currentPage = nextPage;
        this.hasMoreSignal.set(!page.last);
        this.loadingMoreSignal.set(false);
      },
      error: () => this.loadingMoreSignal.set(false),
    });
  }

  getById(id: number): Observable<UserResponse> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${BASE}${API.adminUsers.byId(id)}`)
      .pipe(map((res) => res.data));
  }

  private fetchPage(page: number, search: string): Observable<PageResponse<UserResponse>> {
    const params: Record<string, string> = { page: page.toString() };
    if (search) {
      params['search'] = search;
    }
    return this.http
      .get<ApiResponse<PageResponse<UserResponse>>>(`${BASE}${API.adminUsers.list}`, { params })
      .pipe(map((res) => res.data));
  }
}