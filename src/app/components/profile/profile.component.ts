import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';  // Az URL paraméterek kezeléséhez
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  userData: any = null;
  errorMessage = '';
  activeTab: string = 'general';
  aboutMe: string = '';
  isCurrentUser: boolean = false; // A bejelentkezett felhasználó egyezik-e a profil tulajdonosával
  isEditing: boolean = false; // Szerkesztési mód
  originalAboutMe: string = ''; // Eredeti About Me szöveg (visszavonáshoz)
  usernameFromUrl: string = ''; // Az URL-ben szereplő felhasználónév

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute // URL paraméterek lekérése
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
        const username = params.get('username');

        if (username) {
            // Fetch profile by username
            this.http.get(`${environment.apiUrl}/api/profile/${username}`, {
                headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
            }).subscribe({
                next: (response: any) => {
                    this.userData = response.user;
                    this.isCurrentUser = this.authService.getUserId() === this.userData._id;
                    this.originalAboutMe = this.userData?.aboutMe || '';
                    this.aboutMe = this.userData?.aboutMe || '';
                },
                error: (err: any) => {
                    this.errorMessage = 'Could not load profile data';
                }
            });
        } else {
            // Fetch logged-in user's profile
            this.http.get(`${environment.apiUrl}/api/profile`, {
                headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
            }).subscribe({
                next: (response: any) => {
                    this.userData = response.user;
                    this.isCurrentUser = this.authService.getUserId() === this.userData._id;
                    this.originalAboutMe = this.userData?.aboutMe || '';
                    this.aboutMe = this.userData?.aboutMe || '';
                },
                error: (err: any) => {
                    this.errorMessage = 'Could not load profile data';
                }
            });
        }
    });
}


  loadProfileData(): void {
    // Profil adatok betöltése az URL-ben szereplő felhasználónév alapján
    this.http.get(environment.apiUrl + '/api/profile/' + this.usernameFromUrl).subscribe({
      next: (response: any) => {
        this.userData = response.user;
        // Ellenőrizzük, hogy a bejelentkezett felhasználó egyezik-e a profil tulajdonosával
        const loggedInUserId = this.authService.getUserId();
        this.isCurrentUser = loggedInUserId === this.userData._id;
        this.originalAboutMe = this.userData.aboutMe || ''; // Eredeti szöveg mentése
        this.aboutMe = this.userData.aboutMe || ''; // Inicializáljuk az aboutMe változót
      },
      error: (err: any) => {
        console.error('Failed to fetch profile:', err);
        this.errorMessage = 'Could not load profile data';
      }
    });}

  // Szerkesztés indítása
  startEditing() {
    this.isEditing = true;
  }

  // About Me mentése
  saveAboutMe() {
    const updatedData = { aboutMe: this.aboutMe };
    this.http.put(`${environment.apiUrl}/api/profile`, updatedData, {
        headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
    }).subscribe({
        next: () => {
            this.isEditing = false;
        },
        error: (err: any) => {
            console.error('Failed to update profile:', err);
        }
    });
}


  // Szerkesztés visszavonása
  cancelEditing() {
    this.aboutMe = this.originalAboutMe; // Visszaállítjuk az eredeti szöveget
    this.isEditing = false;
  }

  // Dinamikus avatar háttérszín generálása
  getAvatarColor(username: string): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
    const firstLetter = username.charAt(0).toUpperCase(); // Felhasználónév első betűje
    const colorIndex = firstLetter.charCodeAt(0) % colors.length; // Szín kiválasztása
    return colors[colorIndex];
  }

  // Felhasználó nevének kezdőbetűi
  getInitials(username: string): string {
    const names = username.split(' '); // Név részekre bontása
    if (names.length > 1) {
      return names[0].charAt(0) + names[1].charAt(0); // Első két betű
    }
    return names[0].charAt(0); // Csak az első betű
  }

  onLogout() {
    this.authService.logout();
  }
}
