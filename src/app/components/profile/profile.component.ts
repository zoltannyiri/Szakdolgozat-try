import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  userData: any = null;
  errorMessage = '';
  user: any;

  constructor(private authService: AuthService, private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get(environment.apiUrl+'/api/profile').subscribe({
      next: (response: any) => {
        this.userData = response.user;
      },
      error: (err: any) => {
        console.error('Failed to fetch profile:', err);
        this.errorMessage = 'Could not load profile data';
      }
    });
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
