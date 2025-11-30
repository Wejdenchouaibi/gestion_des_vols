import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;
  stats = {
    totalFlights: 156,
    totalPassengers: 2847,
    totalRevenue: 125000,
    activeBookings: 89
  };

  dailyFlights = [
    { 
      id: 1, 
      flightNumber: 'TU101', 
      from: 'Paris', 
      to: 'Tunis', 
      time: '12h00', 
      status: 'À l\'heure',
      occupiedSeats: 180,
      totalSeats: 200
    },
    { 
      id: 2, 
      flightNumber: 'TU202', 
      from: 'Rome', 
      to: 'Madrid', 
      time: '15h00', 
      status: 'RETARDÉ',
      occupiedSeats: 150,
      totalSeats: 180
    },
    { 
      id: 3, 
      flightNumber: 'TU303', 
      from: 'Londres', 
      to: 'Tunis', 
      time: '18h30', 
      status: 'À l\'heure',
      occupiedSeats: 95,
      totalSeats: 120
    },
    { 
      id: 4, 
      flightNumber: 'TU404', 
      from: 'Tunis', 
      to: 'Paris', 
      time: '21h00', 
      status: 'En cours',
      occupiedSeats: 200,
      totalSeats: 200
    }
  ];

  recentFlights = [
    { id: 1, flightNumber: 'TU101', destination: 'Paris', departure: '08:00', status: 'On Time' },
    { id: 2, flightNumber: 'TU202', destination: 'Londres', departure: '14:30', status: 'Delayed' },
    { id: 3, flightNumber: 'TU303', destination: 'Rome', departure: '20:15', status: 'On Time' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToFlights(): void {
    this.router.navigate(['/admin/flights']);
  }

  navigateToPlanes(): void {
    this.router.navigate(['/admin/planes']);
  }

  navigateToCrew(): void {
    this.router.navigate(['/admin/crew']);
  }

  navigateToReports(): void {
    this.router.navigate(['/admin/reports']);
  }
  navigateToReservation(): void {
    this.router.navigate(['reservations/manage']);
  }
}