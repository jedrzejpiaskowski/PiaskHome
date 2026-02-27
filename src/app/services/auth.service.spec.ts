import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { of } from 'rxjs';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AngularFireAuth,
          useValue: {
            authState: of(null),
            signInWithPopup: () => Promise.resolve(null),
            signOut: () => Promise.resolve(),
          },
        },
        {
          provide: AngularFirestore,
          useValue: {
            doc: () => ({
              valueChanges: () => of(null),
              get: () => of({ data: () => null }),
              set: () => Promise.resolve(),
            }),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
          },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
