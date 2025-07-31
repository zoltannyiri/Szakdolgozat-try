import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLoopsComponent } from './admin-loops.component';

describe('AdminLoopsComponent', () => {
  let component: AdminLoopsComponent;
  let fixture: ComponentFixture<AdminLoopsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoopsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLoopsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
