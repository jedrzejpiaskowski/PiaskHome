import { Injectable } from '@angular/core';
import { Auth, authState, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { doc, docData, DocumentReference, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from 'src/models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null | undefined>;

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    this.user$ = authState(this.auth).pipe(
      switchMap((user) => {
        // Logged in
        if (user) {
          return docData(doc(this.firestore, `users/${user.uid}`) as DocumentReference<User>);
        } else {
          // Logged out
          return of(null);
        }
      })
    );
  }

  async googleSignin() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    if (credential && credential.user) {
      return this.updateUserData(credential.user);
    }
  }

  public updateShortName(user: User) {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const data = {
      shortName: user.shortName,
    } as User;
    return setDoc(userRef, data, { merge: true });
  }

  private updateUserData(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
    if (!user) return;

    // Sets user data to firestore on login
    const userRef = doc(this.firestore, `users/${user.uid}`);

    getDoc(userRef).then((savedUser) => {
      const data = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      } as User;
      const savedData = savedUser?.data();
      if (!savedData || !savedData['shortName']) {
        data.shortName = data.displayName;
      }
      setDoc(userRef, data, { merge: true });
    });
  }

  async signOut() {
    await signOut(this.auth);
    this.router.navigate(['/']);
  }
}
