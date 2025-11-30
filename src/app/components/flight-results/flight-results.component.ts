import { Component } from '@angular/core';

@Component({
  selector: 'app-flight-results',
  templateUrl: './flight-results.component.html',
  styleUrls: ['./flight-results.component.scss']
})
export class FlightResultsComponent {
  flights = [
    {
      flightNumber: 'TU101',
      origin: 'Tunis',
      destination: 'Paris',
      departure: new Date('2025-10-12T08:00:00'),
      duration: '2h 30m',
      seats: 12,
      price: 420
    },
    {
      flightNumber: 'TU202',
      origin: 'Tunis',
      destination: 'Rome',
      departure: new Date('2025-10-13T14:30:00'),
      duration: '1h 50m',
      seats: 7,
      price: 350
    }
  ];

  bookFlight(flight: any): void {
    // TODO: Naviguer vers la page de paiement ou réservation
    alert('Réservation du vol ' + flight.flightNumber);
  }

  backToSearch(): void {
    // TODO: Naviguer vers la page de recherche
    alert('Retour à la recherche de vols');
  }
}
