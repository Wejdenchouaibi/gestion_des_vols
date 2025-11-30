import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-crew-management',
  templateUrl: './crew-management.component.html',
  styleUrls: ['./crew-management.component.scss']
})
export class CrewManagementComponent implements OnInit {
  crews: any[] = [];
  showCrewModal = false;
  editingCrew: any = null;
  crewForm: FormGroup;
  filterForm: FormGroup;
  private apiUrl = 'http://localhost:5000/api/crews';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.crewForm = this.fb.group({
      name: ['', Validators.required],
      mainRole: ['', Validators.required],
      available: [true, Validators.required],
      members: ['', Validators.required]
    });

    this.filterForm = this.fb.group({
      name: [''],
      mainRole: [''],
      available: ['']
    });
  }

  ngOnInit() {
    if (this.authService.isAdmin()) {
      this.loadCrews();
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

  loadCrews(): void {
    const filters = this.filterForm.value;
    const params = new URLSearchParams();
    if (filters.name) params.append('name', filters.name);
    if (filters.mainRole) params.append('mainRole', filters.mainRole);
    if (filters.available) params.append('available', filters.available);

    this.http.get<{ success: boolean; crews: any[] }>(
      `${this.apiUrl}?${params.toString()}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.crews = response.crews;
        }
      },
      error: (error) => {
        console.error('Error loading crews:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadCrews();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadCrews();
  }

  openCrewModal() {
    this.editingCrew = null;
    this.crewForm.reset({ available: true });
    this.showCrewModal = true;
  }

  closeCrewModal() {
    this.showCrewModal = false;
    this.editingCrew = null;
  }

  saveCrew() {
    if (this.crewForm.invalid) return;

    const formValue = this.crewForm.value;
    const membersArray = formValue.members.split(',').map((m: string) => m.trim()).filter((m: string) => m);
    const crewData = { ...formValue, members: membersArray };

    if (this.editingCrew) {
      this.updateCrew(crewData);
    } else {
      this.addCrew(crewData);
    }
  }

  addCrew(crew: any) {
    this.http.post<{ success: boolean; crew: any; message: string }>(
      this.apiUrl,
      crew,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.crews.push(response.crew);
          this.closeCrewModal();
        }
      },
      error: (error) => {
        console.error('Error adding crew:', error);
      }
    });
  }

  updateCrew(crew: any) {
    this.http.put<{ success: boolean; crew: any; message: string }>(
      `${this.apiUrl}/${this.editingCrew._id}`,
      crew,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          Object.assign(this.editingCrew, response.crew);
          this.closeCrewModal();
        }
      },
      error: (error) => {
        console.error('Error updating crew:', error);
      }
    });
  }

  deleteCrew(crew: any) {
    if (confirm('Supprimer cet équipage ?')) {
      this.http.delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/${crew._id}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.crews = this.crews.filter(c => c._id !== crew._id);
          }
        },
        error: (error) => {
          console.error('Error deleting crew:', error);
        }
      });
    }
  }

  editCrew(crew: any) {
    this.editingCrew = crew;
    this.crewForm.patchValue({
      ...crew,
      members: crew.members.join(', ')
    });
    this.showCrewModal = true;
  }
}