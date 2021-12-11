import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HouseTasksComponent } from './house-tasks.component';

describe('HouseTasksComponent', () => {
  let component: HouseTasksComponent;
  let fixture: ComponentFixture<HouseTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HouseTasksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HouseTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
