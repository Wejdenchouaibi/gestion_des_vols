import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'client';
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = 'http://localhost:5000/api';
  private token: string | null = null;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      this.currentUserSubject.next(JSON.parse(savedUser));
      this.token = savedToken;
    }
  }

  login(username: string, password: string): Observable<{ success: boolean; user?: User; token?: string; message: string }> {
    return this.http.post<{ success: boolean; user?: User; token?: string; message: string }>(
      `${this.apiUrl}/login`,
      { username, password }
    ).pipe(
      tap(response => {
        if (response.success && response.user && response.token) {
          this.currentUserSubject.next(response.user);
          this.token = response.token;
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'client';
  }): Observable<{ success: boolean; user?: User; token?: string; message: string }> {
    return this.http.post<{ success: boolean; user?: User; token?: string; message: string }>(
      `${this.apiUrl}/register`,
      userData
    ).pipe(
      tap(response => {
        if (response.success && response.user && response.token) {
          this.currentUserSubject.next(response.user);
          this.token = response.token;
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  validateToken(): Observable<{ success: boolean; user?: User; message: string }> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    });
    return this.http.get<{ success: boolean; user?: User; message: string }>(
      `${this.apiUrl}/validate-token`,
      { headers }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        } else {
          this.logout();
        }
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.token = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.token;
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null && this.token !== null;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  isClient(): boolean {
    return this.currentUserSubject.value?.role === 'client';
  }
}