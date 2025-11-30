import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

interface Promotion {
  id: number;
  destination: string;
  description: string;
  image: string;
  oldPrice: number;
  newPrice: number;
  discount: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  promotions: Promotion[] = [];

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.promotions = [
      {
        id: 1,
        destination: 'Paris',
        description: 'Découvrez la ville lumière avec nos offres spéciales',
        image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
        oldPrice: 450,
        newPrice: 320,
        discount: 29
      },
      {
        id: 2,
        destination: 'Rome',
        description: 'Explorez l\'histoire et la culture italienne',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
        oldPrice: 380,
        newPrice: 280,
        discount: 26
      },
      {
        id: 3,
        destination: 'Londres',
        description: 'Vivez l\'expérience londonienne authentique',
        image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
        oldPrice: 420,
        newPrice: 310,
        discount: 26
      },
      {
        id: 4,
        destination: 'Madrid',
        description: 'Plongez dans l\'art et la gastronomie espagnole',
        image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400',
        oldPrice: 350,
        newPrice: 250,
        discount: 29
      }
    ];
  }

  goToSearch(): void {
    this.router.navigate(['/search-flight']);
  }

  selectPromotion(promotion: Promotion): void {
    // Naviguer vers la recherche avec la destination pré-remplie
    this.router.navigate(['/search-flight'], { 
      queryParams: { 
        to: promotion.destination,
        departureDate: this.getNextWeekDate()
      } 
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private getNextWeekDate(): string {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
}