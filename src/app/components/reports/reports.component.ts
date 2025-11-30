import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, AfterViewInit {
  periodForm: FormGroup;
  reports: any = {};
  private apiUrl = 'http://localhost:5000/api/reports';
  flightsChart: Chart | null = null;
  destinationsChart: Chart | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {
    Chart.register(...registerables);
    this.periodForm = this.fb.group({
      period: ['this_month']
    });
  }

  ngOnInit() {
    if (this.authService.isAdmin()) {
      this.loadReports();
    } else {
      console.error('Access denied: User is not an admin');
    }
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  loadReports(): void {
    const period = this.periodForm.value.period;
    this.http.get<{ success: boolean; reports: any }>(
      `${this.apiUrl}?period=${period}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.reports = response.reports;
          this.renderCharts();
        }
      },
      error: (error) => {
        console.error('Error loading reports:', error);
      }
    });
  }

  applyPeriod(): void {
    this.loadReports();
  }

  renderCharts(): void {
    // Destroy existing charts to prevent canvas reuse errors
    if (this.flightsChart) {
      this.flightsChart.destroy();
    }
    if (this.destinationsChart) {
      this.destinationsChart.destroy();
    }

    // Flights per Month Chart (Bar)
    const flightsCanvas = document.getElementById('flightsChart') as HTMLCanvasElement;
    if (flightsCanvas) {
      this.flightsChart = new Chart(flightsCanvas, {
        type: 'bar',
        data: {
          labels: this.reports.flights_per_month?.map((item: any) => item.month) || [],
          datasets: [{
            label: 'Nombre de vols',
            data: this.reports.flights_per_month?.map((item: any) => item.count) || [],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Nombre de vols'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Mois'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    // Destination Distribution Chart (Pie)
    const destinationsCanvas = document.getElementById('destinationsChart') as HTMLCanvasElement;
    if (destinationsCanvas) {
      this.destinationsChart = new Chart(destinationsCanvas, {
        type: 'pie',
        data: {
          labels: this.reports.destination_distribution?.map((item: any) => item.destination) || [],
          datasets: [{
            label: 'Vols par destination',
            data: this.reports.destination_distribution?.map((item: any) => item.count) || [],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    }
  }
}