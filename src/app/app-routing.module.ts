import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ClientDashboardComponent } from './components/client-dashboard/client-dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { SearchFlightComponent } from './search-flight/search-flight.component';
import { FlightResultsComponent } from './components/flight-results/flight-results.component';
import { BookingFormComponent } from './components/booking-form/booking-form.component';
import { PaymentComponent } from './components/payment/payment.component';
import { FlightsManagementComponent } from './components/flights-management/flights-management.component';
import { PlanesManagementComponent } from './components/planes-management/planes-management.component';
import { CrewManagementComponent } from './components/crew-management/crew-management.component';
import { ReportsComponent } from './components/reports/reports.component';
import { AuthGuard, AdminGuard, ClientGuard } from './guards/auth.guard';
import { ManageReservationsComponent } from './components/manage-reservations/manage-reservations.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'home', component: HomeComponent
  },
  { path: 'reservations/manage', component: ManageReservationsComponent },
  {
    path: 'client/dashboard',
    component: ClientDashboardComponent,
    canActivate: [ClientGuard],
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [AdminGuard],
  },
  {
    path: 'search-flight',
    component: SearchFlightComponent,
  },
  {
    path: 'flight-results',
    component: FlightResultsComponent,
  },
  {
    path: 'booking',
    component: BookingFormComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'payment',
    component: PaymentComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'admin/flights',
    component: FlightsManagementComponent,
    canActivate: [AdminGuard],
  },
  {
    path: 'admin/planes',
    component: PlanesManagementComponent,
    canActivate: [AdminGuard],
  },
  {
    path: 'admin/crew',
    component: CrewManagementComponent,
    canActivate: [AdminGuard],
  },
  {
    path: 'admin/reports',
    component: ReportsComponent,
    canActivate: [AdminGuard],
  },
  { path: '**', redirectTo: '/' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
