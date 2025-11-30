import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Promotion {
  _id: string;
  destination: string;
  description: string;
  image: string;
  oldPrice: number;
  newPrice: number;
  discount: number;
}

interface Passenger {
  name: string;
  passport_number: string;
}

interface Reservation {
  _id?: string;
  flight_id: string;
  passengers: number;
  passengers_details: Passenger[];
  class: string;
  total_price?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.scss']
})
export class BookingFormComponent implements OnInit {
  promotions: Promotion[] = [];
  selectedFlight: any = null;
  reservation: Reservation = {
    flight_id: '',
    passengers: 1,
    passengers_details: [{ name: '', passport_number: '' }],
    class: 'economique'
  };
  user: any = null;
  isEditing = false;
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadPromotions();
    this.checkUser();
    this.checkFlightFromState();
    this.checkReservationFromQuery();
  }

  checkUser(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.get<{ success: boolean; user: any; message?: string }>(`${this.apiUrl}/validate-token`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.user = response.user;
          } else {
            localStorage.removeItem('token');
            this.user = null;
          }
        },
        error: () => {
          localStorage.removeItem('token');
          this.user = null;
        }
      });
    }
  }

  checkFlightFromState(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = (navigation?.extras?.state) as any;
    if (state && state['flight']) {
      const flight = state['flight'];
      this.selectedFlight = flight;
      this.reservation.flight_id = this.selectedFlight._id;
      this.reservation.class = this.selectedFlight.class;
      this.reservation.passengers_details = Array(this.reservation.passengers).fill({ name: '', passport_number: '' });
    }
  }

  checkReservationFromQuery(): void {
    this.route.queryParams.subscribe(params => {
      if (params['reservationId']) {
        this.isEditing = true;
        this.http.get<{ success: boolean; reservations: Reservation[]; message?: string }>(`${this.apiUrl}/reservations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).subscribe({
          next: (response) => {
            if (response.success) {
              const reservation = response.reservations.find(r => r._id === params['reservationId']);
              if (reservation) {
                this.reservation = { ...reservation };
                this.loadFlightDetails(reservation.flight_id);
              } else {
                alert('Réservation non trouvée.');
                this.router.navigate(['/booking']);
              }
            } else {
              alert(response.message || 'Erreur lors du chargement de la réservation.');
            }
          },
          error: (error) => {
            alert('Erreur lors du chargement de la réservation: ' + (error.error?.message || 'Erreur serveur'));
          }
        });
      }
    });
  }

  loadFlightDetails(flightId: string): void {
    this.http.get<{ success: boolean; flights: any[]; message?: string }>(`${this.apiUrl}/flights?flight_id=${flightId}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.flights.length > 0) {
            this.selectedFlight = response.flights[0];
          } else {
            alert(response.message || 'Vol non trouvé.');
          }
        },
        error: (error) => {
          alert('Erreur lors du chargement des détails du vol: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
  }

  loadPromotions(): void {
    this.http.get<{ success: boolean; promotions: Promotion[]; message?: string }>(`${this.apiUrl}/promotions`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.promotions = response.promotions;
          } else {
            alert(response.message || 'Erreur lors du chargement des promotions.');
          }
        },
        error: (error) => {
          alert('Erreur lors du chargement des promotions: ' + (error.error?.message || 'Erreur serveur'));
        }
      });
  }

  selectPromotion(promotion: Promotion): void {
    this.http.get<{ success: boolean; flights: any[]; message?: string }>(
      `${this.apiUrl}/flights?arrival=${promotion.destination}&date=${this.getNextWeekDate()}`
    ).subscribe({
      next: (response) => {
        if (response.success && response.flights.length > 0) {
          this.selectedFlight = response.flights[0];
          this.reservation.flight_id = this.selectedFlight._id;
          this.reservation.class = 'economique';
          this.reservation.passengers = 1;
          this.reservation.passengers_details = [{ name: '', passport_number: '' }];
        } else {
          alert('Aucun vol disponible pour cette promotion.');
          this.router.navigate(['/search-flight'], { 
            queryParams: { 
              to: promotion.destination,
              departureDate: this.getNextWeekDate()
            } 
          });
        }
      },
      error: (error) => {
        alert('Erreur lors de la recherche de vols pour la promotion: ' + (error.error?.message || 'Erreur serveur'));
      }
    });
  }

  updatePassengerDetails(): void {
    const currentLength = this.reservation.passengers_details.length;
    if (this.reservation.passengers > currentLength) {
      for (let i = currentLength; i < this.reservation.passengers; i++) {
        this.reservation.passengers_details.push({ name: '', passport_number: '' });
      }
    } else if (this.reservation.passengers < currentLength) {
      this.reservation.passengers_details = this.reservation.passengers_details.slice(0, this.reservation.passengers);
    }
  }

  createReservation(): void {
    if (!this.user) {
      alert('Veuillez vous connecter pour effectuer une réservation.');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.reservation.flight_id || !this.reservation.passengers || !this.reservation.class) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }
    if (this.reservation.passengers_details.length !== this.reservation.passengers) {
      alert('Le nombre de détails des passagers doit correspondre au nombre de passagers.');
      return;
    }
    for (const passenger of this.reservation.passengers_details) {
      if (!passenger.name || !passenger.passport_number) {
        alert('Chaque passager doit avoir un nom et un numéro de passeport.');
        return;
      }
    }

    this.http.post<{ success: boolean; reservation: Reservation; message?: string }>(
      `${this.apiUrl}/reservations`,
      this.reservation,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Réservation créée avec succès!');
          this.router.navigate(['/user/dashboard']);
        } else {
          alert(response.message || 'Erreur lors de la création de la réservation.');
        }
      },
      error: (error) => {
        alert('Erreur lors de la création de la réservation: ' + (error.error?.message || 'Erreur serveur'));
      }
    });
  }

  updateReservation(): void {
    if (!this.user) {
      alert('Veuillez vous connecter pour modifier une réservation.');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.reservation._id || !this.reservation.flight_id || !this.reservation.passengers || !this.reservation.class) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }
    if (this.reservation.passengers_details.length !== this.reservation.passengers) {
      alert('Le nombre de détails des passagers doit correspondre au nombre de passagers.');
      return;
    }
    for (const passenger of this.reservation.passengers_details) {
      if (!passenger.name || !passenger.passport_number) {
        alert('Chaque passager doit avoir un nom et un numéro de passeport.');
        return;
      }
    }

    this.http.put<{ success: boolean; reservation: Reservation; message?: string }>(
      `${this.apiUrl}/reservations/${this.reservation._id}`,
      this.reservation,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Réservation modifiée avec succès!');
          this.router.navigate(['/user/dashboard']);
        } else {
          alert(response.message || 'Erreur lors de la modification de la réservation.');
        }
      },
      error: (error) => {
        alert('Erreur lors de la modification de la réservation: ' + (error.error?.message || 'Erreur serveur'));
      }
    });
  }

  cancelReservation(): void {
    if (!this.user) {
      alert('Veuillez vous connecter pour annuler une réservation.');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.reservation._id) {
      alert('Aucune réservation sélectionnée.');
      return;
    }

    this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/reservations/${this.reservation._id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Réservation annulée avec succès!');
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

  private getNextWeekDate(): string {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Template helper: navigate to login page
  login(): void {
    this.router.navigate(['/login']);
  }

  // Template helper: logout user locally
  logout(): void {
    localStorage.removeItem('token');
    this.user = null;
    this.router.navigate(['/']);
  }
}