import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Passenger {
  name: string;
  passport_number: string;
}

interface Reservation {
  _id: string;
  flight_id: string;
  passengers: number;
  passengers_details: Passenger[];
  class: string;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-manage-reservations',
  templateUrl: './manage-reservations.component.html',
  styleUrls: ['./manage-reservations.component.scss']
})
export class ManageReservationsComponent implements OnInit {
  reservations: Reservation[] = [];  // For list view
  reservation: Reservation | null = null;  // For single view
  flight: any = null;
  user: any = null;
  newPassenger: Passenger = { name: '', passport_number: '' };
  editingPassenger: Passenger | null = null;
  editingIndex: number | null = null;
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.checkUser();
    this.loadReservations();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  checkUser(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Veuillez vous connecter pour gérer les réservations.');
      this.router.navigate(['/login']);
      return;
    }
    this.http.get<{ success: boolean; user: any; message?: string }>(`${this.apiUrl}/validate-token`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.user;
        } else {
          localStorage.removeItem('token');
          this.user = null;
          alert('Session expirée. Veuillez vous reconnecter.');
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        localStorage.removeItem('token');
        this.user = null;
        alert('Erreur lors de la validation de la session.');
        this.router.navigate(['/login']);
      }
    });
  }

  loadReservations(): void {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (reservationId) {
      this.http.get<{ success: boolean; reservations: Reservation[]; message?: string }>(`${this.apiUrl}/reservations`, {
        headers: this.getHeaders()
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.reservation = response.reservations.find(r => r._id === reservationId) || null;
            if (this.reservation) {
              this.loadFlightDetails(this.reservation.flight_id);
            } else {
              alert('Réservation non trouvée.');
              this.router.navigate(['/user/dashboard']);
            }
          } else {
            alert(response.message || 'Erreur lors du chargement de la réservation.');
            this.router.navigate(['/user/dashboard']);
          }
        },
        error: (error) => {
          alert('Erreur lors du chargement de la réservation: ' + (error.error?.message || 'Erreur serveur'));
          this.router.navigate(['/user/dashboard']);
        }
      });
    } else {
      this.http.get<{ success: boolean; reservations: Reservation[]; message?: string }>(`${this.apiUrl}/reservations`, {
        headers: this.getHeaders()
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.reservations = response.reservations;
          } else {
            alert(response.message || 'Erreur lors du chargement des réservations.');
          }
        },
        error: (error) => {
          alert('Erreur lors du chargement des réservations: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
    }
  }

  loadFlightDetails(flightId: string): void {
    this.http.get<{ success: boolean; flights: any[]; message?: string }>(`${this.apiUrl}/flights?flight_id=${flightId}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.flights.length > 0) {
            this.flight = response.flights[0];
          } else {
            alert(response.message || 'Vol non trouvé.');
          }
        },
        error: (error) => {
          alert('Erreur lors du chargement des détails du vol: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
  }

  addPassenger(): void {
    if (!this.reservation) return;
    if (!this.newPassenger.name || !this.newPassenger.passport_number) {
      alert('Veuillez remplir tous les champs du passager.');
      return;
    }

    const newPassengerCount = this.reservation.passengers + 1;
    const passengersDetails = [...(this.reservation.passengers_details || []), this.newPassenger];

    this.http.get<{ success: boolean; flights: any[]; message?: string }>(`${this.apiUrl}/flights?flight_id=${this.reservation.flight_id}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.flights.length > 0) {
            const flight = response.flights[0];
            const availableSeats = flight.capacity - flight.passengers;
            if (newPassengerCount > availableSeats) {
              alert('Pas assez de sièges disponibles.');
              return;
            }

            const totalPrice = newPassengerCount * flight.price_numeric;
            const updatedReservation = {
              passengers: newPassengerCount,
              passengers_details: passengersDetails,
              class: this.reservation!.class,
              total_price: totalPrice
            };

            this.http.put<{ success: boolean; reservation: Reservation; message?: string }>(
              `${this.apiUrl}/reservations/${this.reservation!._id}`,
              updatedReservation,
              { headers: this.getHeaders() }
            ).subscribe({
              next: (response) => {
                if (response.success) {
                  this.reservation = response.reservation;
                  this.newPassenger = { name: '', passport_number: '' };
                  alert('Passager ajouté avec succès.');
                } else {
                  alert(response.message || 'Erreur lors de l\'ajout du passager.');
                }
              },
              error: (error) => {
                alert('Erreur lors de l\'ajout du passager: ' + (error.error?.message || 'Erreur serveur'));
              }
            });
          } else {
            alert('Vol non trouvé.');
          }
        },
        error: (error) => {
          alert('Erreur lors de la vérification des sièges: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
  }

  editPassenger(index: number): void {
    if (!this.reservation) return;
    this.editingPassenger = { ...this.reservation.passengers_details[index] };
    this.editingIndex = index;
  }

  updatePassenger(): void {
    if (!this.reservation || !this.editingPassenger || this.editingIndex === null) return;
    if (!this.editingPassenger.name || !this.editingPassenger.passport_number) {
      alert('Veuillez remplir tous les champs du passager.');
      return;
    }

    const passengersDetails = [...this.reservation.passengers_details];
    passengersDetails[this.editingIndex] = this.editingPassenger;

    const updatedReservation = {
      passengers: this.reservation.passengers,
      passengers_details: passengersDetails,
      class: this.reservation.class,
      total_price: this.reservation.total_price
    };

    this.http.put<{ success: boolean; reservation: Reservation; message?: string }>(
      `${this.apiUrl}/reservations/${this.reservation._id}`,
      updatedReservation,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.reservation = response.reservation;
          this.editingPassenger = null;
          this.editingIndex = null;
          alert('Passager modifié avec succès.');
        } else {
          alert(response.message || 'Erreur lors de la modification du passager.');
        }
      },
      error: (error) => {
        alert('Erreur lors de la modification du passager: ' + (error.error?.message || 'Erreur serveur'));
      }
    });
  }

  deletePassenger(index: number): void {
    if (!this.reservation) return;
    if (this.reservation.passengers <= 1) {
      alert('Une réservation doit avoir au moins un passager.');
      return;
    }

    const newPassengerCount = this.reservation.passengers - 1;
    const passengersDetails = this.reservation.passengers_details.filter((_, i) => i !== index);

    this.http.get<{ success: boolean; flights: any[]; message?: string }>(`${this.apiUrl}/flights?flight_id=${this.reservation.flight_id}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.flights.length > 0) {
            const flight = response.flights[0];
            const totalPrice = newPassengerCount * flight.price_numeric;

            const updatedReservation = {
              passengers: newPassengerCount,
              passengers_details: passengersDetails,
              class: this.reservation!.class,
              total_price: totalPrice
            };

            this.http.put<{ success: boolean; reservation: Reservation; message?: string }>(
              `${this.apiUrl}/reservations/${this.reservation!._id}`,
              updatedReservation,
              { headers: this.getHeaders() }
            ).subscribe({
              next: (response) => {
                if (response.success) {
                  this.reservation = response.reservation;
                  alert('Passager supprimé avec succès.');
                } else {
                  alert(response.message || 'Erreur lors de la suppression du passager.');
                }
              },
              error: (error) => {
                alert('Erreur lors de la suppression du passager: ' + (error.error?.message || 'Erreur serveur'));
              }
            });
          } else {
            alert('Vol non trouvé.');
          }
        },
        error: (error) => {
          alert('Erreur lors de la vérification du vol: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
  }

  cancelReservation(): void {
    if (!this.reservation) return;
    this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/reservations/${this.reservation._id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Réservation annulée avec succès.');
          this.router.navigate(['/user/dashboard']);
        } else {
          alert(response.message || 'Erreur lors de l\'annulation de la réservation.');
        }
      },
      error: (error) => {
        alert('Erreur lors de l\'annulation de la réservation: ' + (error.error?.message || 'Erreur serveur'));
      }
    });
  }

  viewReservation(id: string): void {
    this.router.navigate(['/reservations/manage', id]);
  }

  login(): void {
    this.router.navigate(['/login']);
  }
  user_dach(): void {
    this.router.navigate(['/user/dashboard']);
  }
  logout(): void {
    localStorage.removeItem('token');
    this.user = null;
    this.router.navigate(['/login']);
  }
}