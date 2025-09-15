import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';


declare global {
  interface Window { google: any; }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';

    const { username, password } = this.loginData;

    this.authService.loginWithCredentials(username, '', password).subscribe({
      next: () => {
        this.successMessage = 'Sikeres bejelentkezés!';
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Hibás felhasználónév vagy jelszó.';
      }
    });
  }

  ngAfterViewInit(): void {
    const init = () => {
      const btn = document.getElementById('googleBtn');
      if (!window.google || !btn) { setTimeout(init, 100); return; }

      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => this.onGoogleCredential(resp),
        ux_mode: 'popup',
        auto_select: false,
      });

      window.google.accounts.id.renderButton(btn, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 280,
        logo_alignment: 'left',
      });

    };
    init();
  }

  private onGoogleCredential(resp: any) {
    const idToken: string | undefined = resp?.credential;
    if (!idToken) return;

    this.errorMessage = '';
    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        console.error('Google login error:', err);
        this.errorMessage = err?.error?.message || 'Google bejelentkezés sikertelen.';
      }
    });
  }
}



// import { CommonModule } from '@angular/common';
// import { Component } from '@angular/core';
// import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router, RouterModule } from '@angular/router';
// import { AuthService } from '../../services/auth.service';

// @Component({
//   selector: 'app-login',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.scss']
// })
// export class LoginComponent {
//   loginForm: FormGroup;
//   errorMessage: string = '';
//   isLoading: boolean = false;

//   constructor(
//     private fb: FormBuilder,
//     private authService: AuthService,
//     private router: Router
//   ) {
//     this.loginForm = this.fb.group({
//       username: ['', [Validators.required]],
//       password: ['', [Validators.required, Validators.minLength(6)]]
//     });
//   }

//   onLogin() {
//     this.errorMessage = '';
    
//     if (this.loginForm.invalid) {
//       this.markFormGroupTouched(this.loginForm);
//       return;
//     }

//     this.isLoading = true;
//     const { username, password } = this.loginForm.value;

//     this.authService.loginWithCredentials(username, '', password).subscribe({
//       next: (response) => {
//         this.isLoading = false;
//         this.router.navigate(['/profile']);
//       },
//       error: (err) => {
//         this.isLoading = false;
//         console.error('Login error:', err);
//         this.errorMessage = this.getErrorMessage(err);
//       }
//     });
//   }

//   private markFormGroupTouched(formGroup: FormGroup) {
//     Object.values(formGroup.controls).forEach(control => {
//       control.markAsTouched();
//       if (control instanceof FormGroup) {
//         this.markFormGroupTouched(control);
//       }
//     });
//   }

//   private getErrorMessage(error: any): string {
//     if (error.status === 401) {
//       return 'Hibás felhasználónév vagy jelszó';
//     }
//     if (error.error?.message) {
//       return error.error.message;
//     }
//     return 'Bejelentkezési hiba történt. Kérlek próbáld újra később.';
//   }

  

//   // onLogin() {
//   //   this.errorMessage = '';
//   //   const { username, email, password } = this.loginData;
//   //   this.authService.login(username, email, password).subscribe({
//   //     next:(response) => {
//   //       const token = response.token;
//   //       localStorage.setItem('token', token);

//   //       this.router.navigate(['/profile']);

//   //     },
//   //     error:(err) => {
//   //       this.errorMessage = err.errors?.message || 'Login failed. Please try again.';
//   //     },
//   //   });
//   // }
// }





//   // commented at 03.11 19:00
//   // loginForm: FormGroup;

//   // constructor(
//   //   private fb: FormBuilder,
//   //   private authService: AuthService,
//   //   private router: Router
//   // ) {
//   //   this.loginForm = this.fb.group({
//   //     username: ['', Validators.required],
//   //     password: ['', Validators.required]
//   //   });
//   // }

//   // onSubmit() {
//   //   if (this.loginForm.invalid) {
//   //     return;
//   //   }

//   //   const { username, password } = this.loginForm.value;

//   //   this.authService.login(username, password).subscribe({
//   //     next: (res: { token: string }) => {
//   //       localStorage.setItem('token', res.token);
//   //       this.router.navigate(['/dashboard']);
//   //     },
//   //     error: (err: { error: { message: any } }) => alert(err.error.message)
//   //   });
//   // }
