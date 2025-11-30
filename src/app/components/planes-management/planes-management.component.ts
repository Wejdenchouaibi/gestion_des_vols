import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-planes-management',
  templateUrl: './planes-management.component.html',
  styleUrls: ['./planes-management.component.scss']
})
export class PlanesManagementComponent implements OnInit {
  planes: any[] = [];
  showPlaneModal = false;
  editingPlane: any = null;
  planeForm: FormGroup;
  filterForm: FormGroup;
  private apiUrl = 'http://localhost:5000/api/planes';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.planeForm = this.fb.group({
      model: ['', Validators.required],
      registration: ['', Validators.required],
      capacity: [0, [Validators.required, Validators.min(1)]],
      available: [true, Validators.required]
    });

    this.filterForm = this.fb.group({
      model: [''],
      registration: [''],
      available: ['']
    });
  }

  ngOnInit() {
    if (this.authService.isAdmin()) {
      this.loadPlanes();
    } else {
      console.error('Access denied: User is not an admin');
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  loadPlanes(): void {
    const filters = this.filterForm.value;
    const params = new URLSearchParams();
    if (filters.model) params.append('model', filters.model);
    if (filters.registration) params.append('registration', filters.registration);
    if (filters.available) params.append('available', filters.available);

    this.http.get<{ success: boolean; planes: any[] }>(
      `${this.apiUrl}?${params.toString()}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.planes = response.planes;
        }
      },
      error: (error) => {
        console.error('Error loading planes:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadPlanes();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadPlanes();
  }

  openPlaneModal() {
    this.editingPlane = null;
    this.planeForm.reset({ available: true });
    this.showPlaneModal = true;
  }

  closePlaneModal() {
    this.showPlaneModal = false;
    this.editingPlane = null;
  }

  savePlane() {
    if (this.planeForm.invalid) return;

    const formValue = this.planeForm.value;
    if (this.editingPlane) {
      this.updatePlane(formValue);
    } else {
      this.addPlane(formValue);
    }
  }

  addPlane(plane: any) {
    this.http.post<{ success: boolean; plane: any; message: string }>(
      this.apiUrl,
      plane,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.planes.push(response.plane);
          this.closePlaneModal();
        }
      },
      error: (error) => {
        console.error('Error adding plane:', error);
      }
    });
  }

  updatePlane(plane: any) {
    this.http.put<{ success: boolean; plane: any; message: string }>(
      `${this.apiUrl}/${this.editingPlane._id}`,
      plane,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          Object.assign(this.editingPlane, response.plane);
          this.closePlaneModal();
        }
      },
      error: (error) => {
        console.error('Error updating plane:', error);
      }
    });
  }

  deletePlane(plane: any) {
    if (confirm('Supprimer cet avion ?')) {
      this.http.delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/${plane._id}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.planes = this.planes.filter(p => p._id !== plane._id);
          }
        },
        error: (error) => {
          console.error('Error deleting plane:', error);
        }
      });
    }
  }

  editPlane(plane: any) {
    this.editingPlane = plane;
    this.planeForm.patchValue(plane);
    this.showPlaneModal = true;
  }
}