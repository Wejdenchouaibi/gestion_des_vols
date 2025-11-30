import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  currentUser: User | null = null;
  
  myBookings = [
    {
      id: 1,
      flightNumber: 'TU101',
      destination: 'Paris',
      departure: '2024-01-15 08:00',
      return: '2024-01-20 18:30',
      status: 'Confirmé',
      price: 450
    },
    {
      id: 2,
      flightNumber: 'TU202',
      destination: 'Londres',
      departure: '2024-02-10 14:30',
      return: '2024-02-15 16:45',
      status: 'En attente',
      price: 380
    }
  ];

  upcomingFlights = [
    {
      id: 1,
      flightNumber: 'TU101',
      destination: 'Paris',
      departure: '2024-01-15 08:00',
      gate: 'A12',
      seat: '12B'
    },
    {
      id: 2,
      flightNumber: 'TU303',
      destination: 'Rome',
      departure: '2024-01-25 20:15',
      gate: 'B8',
      seat: '8A'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser || this.currentUser.role !== 'client') {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  searchFlights(): void {
    this.router.navigate(['/search-flight']);
  }

  viewBooking(bookingId: number): void {
    // TODO: Implement booking details view
    console.log('View booking:', bookingId);
  }

  cancelBooking(bookingId: number): void {
    // TODO: Implement booking cancellation
    console.log('Cancel booking:', bookingId);
  }

  checkIn(flightId: number): void {
    // TODO: Implement check-in functionality
    console.log('Check-in for flight:', flightId);
  }
}