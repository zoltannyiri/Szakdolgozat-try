import { CommonModule, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})


export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // FormGroup létrehozása
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      // email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  // loginData = {
  //   username: '',
  //   email: '',
  //   password: ''
  // }
  // errorMessage: string = '';
  // constructor(private authService: AuthService, private router:Router) { }

  onLogin() {
    // console.log("Login gomb megnyomva!"); // Debug üzenet
    this.errorMessage = '';
  
    if (this.loginForm.invalid) {
      console.log("A form érvénytelen!", this.loginForm.value);
      return;
    }
  
    const { username, email, password } = this.loginForm.value;
    
    this.authService.login(username, email, password).subscribe({
      next: (response) => {
        console.log("Sikeres bejelentkezés:",
          // console.log(response); logolja a bejelentkezést konzolra
        );
        const token = response.token;
        localStorage.setItem('token', token);
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error("Hiba a bejelentkezés során:", err);
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
      },
    });
  }
  

  // onLogin() {
  //   this.errorMessage = '';
  //   const { username, email, password } = this.loginData;
  //   this.authService.login(username, email, password).subscribe({
  //     next:(response) => {
  //       const token = response.token;
  //       localStorage.setItem('token', token);

  //       this.router.navigate(['/profile']);

  //     },
  //     error:(err) => {
  //       this.errorMessage = err.errors?.message || 'Login failed. Please try again.';
  //     },
  //   });
  // }
}





  // commented at 03.11 19:00
  // loginForm: FormGroup;

  // constructor(
  //   private fb: FormBuilder,
  //   private authService: AuthService,
  //   private router: Router
  // ) {
  //   this.loginForm = this.fb.group({
  //     username: ['', Validators.required],
  //     password: ['', Validators.required]
  //   });
  // }

  // onSubmit() {
  //   if (this.loginForm.invalid) {
  //     return;
  //   }

  //   const { username, password } = this.loginForm.value;

  //   this.authService.login(username, password).subscribe({
  //     next: (res: { token: string }) => {
  //       localStorage.setItem('token', res.token);
  //       this.router.navigate(['/dashboard']);
  //     },
  //     error: (err: { error: { message: any } }) => alert(err.error.message)
  //   });
  // }
