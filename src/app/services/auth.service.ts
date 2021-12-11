import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { first, switchMap, take } from 'rxjs/operators';
import { User } from 'src/models/user';
import * as firebase from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null | undefined>;

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router
  ) {
    this.user$ = this.afAuth.authState.pipe(
      switchMap((user) => {
        // Logged in
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          // Logged out
          return of(null);
        }
      })
    );
  }

  async googleSignin() {
    const provider = new firebase.GoogleAuthProvider();
    const credential = await this.afAuth.signInWithPopup(provider);
    if (credential && credential.user) {
      return this.updateUserData(credential.user);
    }
  }

  public updateShortName(user: User) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    const data = {
      shortName: user.shortName,
    } as User;
    return userRef.set(data, { merge: true });
  }

  private updateUserData(user: User) {
    if (!user) return;

    // Sets user data to firestore on login
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );

    userRef
      .get()
      .pipe(first())
      .subscribe((savedUser) => {
        console.log(savedUser);
        const data = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        } as User;
        const savedData = savedUser?.data();
        if (!savedData || !savedData.shortName) {
          data.shortName = data.displayName;
        }
        userRef.set(data, { merge: true });
      });
  }

  async signOut() {
    await this.afAuth.signOut();
    this.router.navigate(['/']);
  }
}
