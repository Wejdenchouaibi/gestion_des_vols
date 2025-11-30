import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-flights-management',
  templateUrl: './flights-management.component.html',
  styleUrls: ['./flights-management.component.scss']
})
export class FlightsManagementComponent implements OnInit {
  flights: any[] = [];
  planes: string[] = ['Airbus A320', 'Boeing 737', 'ATR 72'];
  crews: string[] = ['Équipage 1', 'Équipage 2', 'Équipage 3'];
  showFlightModal = false;
  editingFlight: any = null;
  flightForm: FormGroup;
  filterForm: FormGroup;
  private apiUrl = 'http://localhost:5000/api/flights';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.flightForm = this.fb.group({
      number: ['', Validators.required],
      departure: ['', Validators.required],
      arrival: ['', Validators.required],
      plane: ['', Validators.required],
      crew: ['', Validators.required],
      schedule: ['', Validators.required],
      price: ['', Validators.required],
      promotion: [''],
      status: ['A l\'heure', Validators.required]
    });

    this.filterForm = this.fb.group({
      departure: [''],
      arrival: [''],
      status: [''],
      number: ['']
    });
  }

  ngOnInit() {
    if (this.authService.isAdmin()) {
      this.loadFlights();
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

  loadFlights(): void {
    const filters = this.filterForm.value;
    const params = new URLSearchParams();
    if (filters.departure) params.append('departure', filters.departure);
    if (filters.arrival) params.append('arrival', filters.arrival);
    if (filters.status) params.append('status', filters.status);
    if (filters.number) params.append('number', filters.number);

    this.http.get<{ success: boolean; flights: any[] }>(
      `${this.apiUrl}?${params.toString()}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.flights = response.flights;
        }
      },
      error: (error) => {
        console.error('Error loading flights:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadFlights();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadFlights();
  }

  openFlightModal() {
    this.editingFlight = null;
    this.flightForm.reset({ status: "A l'heure" });
    this.showFlightModal = true;
  }

  closeFlightModal() {
    this.showFlightModal = false;
    this.editingFlight = null;
  }

  saveFlight() {
    if (this.flightForm.invalid) return;

    const formValue = this.flightForm.value;
    if (this.editingFlight) {
      this.updateFlight(formValue);
    } else {
      this.addFlight(formValue);
    }
  }

  addFlight(flight: any) {
    this.http.post<{ success: boolean; flight: any; message: string }>(
      this.apiUrl,
      flight,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.flights.push(response.flight);
          this.closeFlightModal();
        }
      },
      error: (error) => {
        console.error('Error adding flight:', error);
      }
    });
  }

  updateFlight(flight: any) {
    this.http.put<{ success: boolean; flight: any; message: string }>(
      `${this.apiUrl}/${this.editingFlight._id}`,
      flight,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          Object.assign(this.editingFlight, response.flight);
          this.closeFlightModal();
        }
      },
      error: (error) => {
        console.error('Error updating flight:', error);
      }
    });
  }

  deleteFlight(flight: any) {
    if (confirm('Supprimer ce vol ?')) {
      this.http.delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/${flight._id}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.flights = this.flights.filter(f => f._id !== flight._id);
          }
        },
        error: (error) => {
          console.error('Error deleting flight:', error);
        }
      });
    }
  }

  editFlight(flight: any) {
    this.editingFlight = flight;
    this.flightForm.patchValue(flight);
    this.showFlightModal = true;
  }
}