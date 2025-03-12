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

  onLogout() {
    this.authService.logout();
  }
}
