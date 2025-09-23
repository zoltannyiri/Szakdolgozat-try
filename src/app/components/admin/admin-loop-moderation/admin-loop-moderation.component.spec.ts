import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLoopModerationComponent } from './admin-loop-moderation.component';

describe('AdminLoopModerationComponent', () => {
  let component: AdminLoopModerationComponent;
  let fixture: ComponentFixture<AdminLoopModerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoopModerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLoopModerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
