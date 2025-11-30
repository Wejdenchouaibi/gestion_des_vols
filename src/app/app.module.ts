import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchFlightComponent } from './search-flight/search-flight.component';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ClientDashboardComponent } from './components/client-dashboard/client-dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { FlightResultsComponent } from './components/flight-results/flight-results.component';
import { BookingFormComponent } from './components/booking-form/booking-form.component';
import { PaymentComponent } from './components/payment/payment.component';
import { FlightsManagementComponent } from './components/flights-management/flights-management.component';
import { PlanesManagementComponent } from './components/planes-management/planes-management.component';
import { CrewManagementComponent } from './components/crew-management/crew-management.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ManageReservationsComponent } from './components/manage-reservations/manage-reservations.component';

@NgModule({
  declarations: [
    AppComponent,
    SearchFlightComponent,
    LoginComponent,
    AdminDashboardComponent,
    ClientDashboardComponent,
    HomeComponent,
    FlightResultsComponent,
    BookingFormComponent,
    PaymentComponent,
    FlightsManagementComponent,
    PlanesManagementComponent,
    CrewManagementComponent,
    ReportsComponent,
    ManageReservationsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
