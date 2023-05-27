import { Component, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { User } from 'src/models/user';
import { AuthService } from '../services/auth.service';
const googleLogoURL =
  'https://raw.githubusercontent.com/fireflysemantics/logo/master/Google.svg';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent {
  constructor(
    public auth: AuthService,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private title: Title
  ) {
    this.title.setTitle('Profil');
    this.matIconRegistry.addSvgIcon(
      'logo',
      this.domSanitizer.bypassSecurityTrustResourceUrl(googleLogoURL)
    );
  }

  logout() {
    this.auth.signOut();
  }

  updateName(user: User) {
    this.auth.updateShortName(user);
  }

  canUpdate(user: User): boolean {
    if (!user || !user.shortName) return false;
    return (
      user.shortName.length >= 4 && user.shortName.length <= 12
      //   && user.shortName.trim().length === 0
    );
  }
}
