import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerData = {
    username: '',
    email: '',
    password: '',
    country: '',
    confirmPassword: '',
  }
  successMessage: string = '';
  errorMessage: string = '';
  constructor(private authService: AuthService) { }

  countries: string[] = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon",
    "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominican Republic", "Ecuador", "Egypt",
    "El Salvador", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
    "Ghana", "Greece", "Guatemala", "Guinea", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Latvia",
    "Lebanon", "Libya", "Lithuania", "Luxembourg", "Malaysia", "Maldives", "Mali", "Malta", "Mexico", "Moldova",
    "Monaco", "Mongolia", "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
    "Nigeria", "Norway", "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Singapore",
    "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
    "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine",
    "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  onRegister() {
    this.errorMessage = '';
    this.successMessage = '';
    const { username, email, password, confirmPassword, country } = this.registerData;
    if (password != confirmPassword) {
      this.errorMessage = 'Passwords do not match!';
      return
    }
    this.authService.register(username, email, password, country).subscribe({
      next:() => {
        this.successMessage = 'Registration successful!';

        this.registerData = {username: '', email: '', password: '', confirmPassword: '', country: ''};
      },
      error:(err) => {
        this.errorMessage = err.errors?.message || 'Register failed. Please try again.';
      },
    });
  }
}






// commented at 03.11 19:00
// export class RegisterComponent implements OnInit {
//   registerForm = new FormGroup({
//     username: new FormControl('', [Validators.required, Validators.minLength(3)]),
//     password: new FormControl('', [Validators.required, Validators.minLength(6)]),
//     confirmPassword: new FormControl('', [Validators.required])
//   });

//   constructor(
//     private http: HttpClient,
//     private router: Router
//   ) {}

//   ngOnInit(): void {}

//   onSubmit(): void {
//     if (this.registerForm.invalid) {
//       return;
//     }

//     if (this.registerForm.get('password')?.value !== 
//         this.registerForm.get('confirmPassword')?.value) {
//       alert('A jelszavak nem egyeznek!');
//       return;
//     }

//     const userData = {
//       username: this.registerForm.get('username')?.value,
//       password: this.registerForm.get('password')?.value
//     };

//     this.http.post('http://localhost:8000/api/register', userData)
//       .subscribe({
//         next: (response: any) => {
//           alert('Sikeres regisztráció!');
//           this.router.navigate(['/login']);
//         },
//         error: (error: any) => {
//           if (error.status === 400) {
//             alert('A felhasználónév már foglalt!');
//           } else {
//             alert('Hiba történt a regisztráció során!');
//           }
//         }
//       });
//   }

//   get username() { return this.registerForm.get('username'); }
//   get password() { return this.registerForm.get('password'); }
//   get confirmPassword() { return this.registerForm.get('confirmPassword'); }
// }
