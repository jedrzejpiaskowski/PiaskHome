import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { Title } from '@angular/platform-browser';

import { HouseTasksComponent } from './house-tasks.component';

describe('HouseTasksComponent', () => {
  let component: HouseTasksComponent;
  let fixture: ComponentFixture<HouseTasksComponent>;

  beforeEach(async () => {
    const firestoreMock = {
      collection: () => ({
        valueChanges: () => of([]),
        add: () => Promise.resolve(),
        doc: () => ({
          update: () => Promise.resolve(),
        }),
      }),
    };

    await TestBed.configureTestingModule({
      declarations: [ HouseTasksComponent ],
      providers: [
        { provide: AngularFirestore, useValue: firestoreMock },
        { provide: AuthService, useValue: { user$: of(null) } },
        DateUtilityService,
        { provide: Title, useValue: { setTitle: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
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
