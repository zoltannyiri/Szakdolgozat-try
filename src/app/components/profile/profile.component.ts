import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
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
  isCurrentUser: boolean = false;
  isEditing: boolean = false;
  originalAboutMe: string = '';
  usernameFromUrl: string = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const username = params.get('username');

      if (username) {
        this.http.get(`${environment.apiUrl}/api/profile/${username}`, {
          headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
        }).subscribe({
          next: (response: any) => {
            this.userData = response.user;
            this.isCurrentUser = this.authService.getUserId() === this.userData._id;
            this.originalAboutMe = this.userData?.aboutMe || '';
            this.aboutMe = this.userData?.aboutMe || '';
          },
          error: () => {
            this.errorMessage = 'Could not load profile data';
          }
        });
      } else {
        this.http.get(`${environment.apiUrl}/api/profile`, {
          headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
        }).subscribe({
          next: (response: any) => {
            this.userData = response.user;
            this.isCurrentUser = this.authService.getUserId() === this.userData._id;
            this.originalAboutMe = this.userData?.aboutMe || '';
            this.aboutMe = this.userData?.aboutMe || '';
          },
          error: () => {
            this.errorMessage = 'Could not load profile data';
          }
        });
      }
    });
  }

  loadProfileData(): void {
    this.http.get(environment.apiUrl + '/api/profile/' + this.usernameFromUrl).subscribe({
      next: (response: any) => {
        this.userData = response.user;
        const loggedInUserId = this.authService.getUserId();
        this.isCurrentUser = loggedInUserId === this.userData._id;
        this.originalAboutMe = this.userData.aboutMe || '';
        this.aboutMe = this.userData.aboutMe || '';
      },
      error: () => {
        this.errorMessage = 'Could not load profile data';
      }
    });
  }

  startEditing() {
    this.isEditing = true;
  }

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

  cancelEditing() {
    this.aboutMe = this.originalAboutMe;
    this.isEditing = false;
  }

  getAvatarColor(username: string): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
    const firstLetter = username.charAt(0).toUpperCase();
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  }

  getInitials(username: string): string {
    const names = username.split(' ');
    if (names.length > 1) {
      return names[0].charAt(0) + names[1].charAt(0);
    }
    return names[0].charAt(0);
  }

  onLogout() {
    this.authService.logout();
  }

  startChatWithUser() {
    if (this.userData?._id) {
      this.router.navigate(['/chat'], {
        queryParams: { userId: this.userData._id }
      });
    }
  }
}
