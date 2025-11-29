import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

declare global {
  interface Window { google: any; }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  loginData = {
    username: '',
    password: ''
  };
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) { }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const { username, password } = this.loginData;

    this.authService.loginWithCredentials(username, '', password).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Sikeres bejelentkezés!';
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Hibás felhasználónév vagy jelszó.';
      }
    });
  }

  ngAfterViewInit(): void {
    const init = () => {
      const btn = document.getElementById('googleBtn');
      if (!window.google || !btn) {
        setTimeout(init, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => this.onGoogleCredential(resp),
        ux_mode: 'popup',
        auto_select: false,
      });

      window.google.accounts.id.renderButton(btn, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 280,
        logo_alignment: 'left',
        locale: 'hu'
      });

    };
    init();
  }

  private onGoogleCredential(resp: any) {
    const idToken: string | undefined = resp?.credential;
    if (!idToken) return;

    this.errorMessage = '';
    this.isLoading = true;

    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Google login error:', err);
        this.errorMessage = err?.error?.message || 'Google bejelentkezés sikertelen.';
      }
    });
  }
}