import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-search-flight',
  templateUrl: './search-flight.component.html',
  styleUrls: ['./search-flight.component.scss']
})
export class SearchFlightComponent implements OnInit {
  search = {
    from: '',
    to: '',
    date: '',
    passengers: 1,
    price: 0,
    class: '',
    company: '',
    duration: 0,
    escales: ''
  };

  results: any[] = [];
  departures: string[] = [];
  arrivals: string[] = [];
  private apiUrl = 'http://localhost:5000/api/flights';
  private citiesUrl = 'http://localhost:5000/api/cities';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.loadCities();
  }

  loadCities(): void {
    this.http.get<{ success: boolean; cities: { departures: string[]; arrivals: string[] } }>(this.citiesUrl)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.departures = response.cities.departures;
            this.arrivals = response.cities.arrivals;
          }
        },
        error: (error) => {
          console.error('Error loading cities:', error);
          alert('Erreur lors du chargement des villes.');
        }
      });
  }

  searchFlights() {
    if (this.search.from && this.search.to && this.search.date) {
      const params = new URLSearchParams();
      if (this.search.from) params.append('departure', this.search.from);
      if (this.search.to) params.append('arrival', this.search.to);
      if (this.search.date) params.append('date', this.search.date);
      if (this.search.price) params.append('price', this.search.price.toString());
      if (this.search.class) params.append('class', this.search.class);
      if (this.search.company) params.append('company', this.search.company);
      if (this.search.duration) params.append('duration', this.search.duration.toString());
      if (this.search.escales) params.append('escales', this.search.escales);

      this.http.get<{ success: boolean; flights?: any[]; message?: string }>(`${this.apiUrl}?${params.toString()}`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.results = response.flights ?? [];
              this.router.navigate(['/flights/results'], { state: { results: this.results } });
            } else {
              this.results = [];
              alert(response.message ?? 'Erreur lors de la recherche de vols.');
            }
          },
          error: (error) => {
            console.error('Error searching flights:', error);
            this.results = [];
            alert('Erreur lors de la recherche de vols.');
          }
        });
    } else {
      alert('Veuillez remplir les champs obligatoires (départ, arrivée, date).');
    }
  }

  onConnect() {
    alert('Fonctionnalité de connexion en cours de développement.');
    // this.router.navigate(['/user/dashboard']);
  }

  bookFlight(flight: any) {
    this.router.navigate(['/booking'], { state: { flight } });
  }
}