import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageReservationsComponent } from './manage-reservations.component';

describe('ManageReservationsComponent', () => {
  let component: ManageReservationsComponent;
  let fixture: ComponentFixture<ManageReservationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ManageReservationsComponent]
    });
    fixture = TestBed.createComponent(ManageReservationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
