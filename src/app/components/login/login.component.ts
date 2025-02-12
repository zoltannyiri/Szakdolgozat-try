import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginObj: any = {
    username: '',
    password: ''
  };

  apiLoginObj: any = {
    "EmailId": "",
    "Password": ""
  };

  router = inject(Router);
  http = inject(HttpClient);

  onLogin() {
    debugger;
    // if (this.loginObj.username == 'admin' && this.loginObj.password == '1234') {
    //   this.router.navigateByUrl("admin");
    // } else {
    //   alert('wrong credentials');
    // }
  }
}
