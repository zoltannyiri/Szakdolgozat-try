import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  registerForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    if (this.registerForm.get('password')?.value !== 
        this.registerForm.get('confirmPassword')?.value) {
      alert('A jelszavak nem egyeznek!');
      return;
    }

    const userData = {
      username: this.registerForm.get('username')?.value,
      password: this.registerForm.get('password')?.value
    };

    this.http.post('http://localhost:8000/api/register', userData)
      .subscribe({
        next: (response: any) => {
          alert('Sikeres regisztráció!');
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          if (error.status === 400) {
            alert('A felhasználónév már foglalt!');
          } else {
            alert('Hiba történt a regisztráció során!');
          }
        }
      });
  }

  get username() { return this.registerForm.get('username'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
}
