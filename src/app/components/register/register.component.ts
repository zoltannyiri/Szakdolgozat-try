import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: ''
  };

  successMessage = '';
  errorMessage = '';
  passwordError = '';
  errors: any = {};
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

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
    this.passwordError = '';
    this.errors = {};
    this.isLoading = true;

    const { username, email, password, confirmPassword, country } = this.registerData;

    if (password !== confirmPassword) {
      this.passwordError = 'A jelszavak nem egyeznek.';
      this.isLoading = false;
      return;
    }

    this.authService.register(username, email, password, country).subscribe({
      next: (response) => {
        this.autoLoginAfterRegister(username, password);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error?.errors) {
          this.errors = err.error.errors;
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Hiba történt. Próbáld újra.';
        }
      }
    });
  }

  private autoLoginAfterRegister(username: string, password: string) {
    this.authService.loginWithCredentials(username, '', password).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Sikeres regisztráció! Átirányítás...';

        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.successMessage = 'Sikeres regisztráció! Kérlek jelentkezz be.';
        this.registerData = {
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          country: ''
        };
      }
    });
  }
}