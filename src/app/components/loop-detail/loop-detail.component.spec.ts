import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoopDetailComponent } from './loop-detail.component';

describe('LoopDetailComponent', () => {
  let component: LoopDetailComponent;
  let fixture: ComponentFixture<LoopDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoopDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
