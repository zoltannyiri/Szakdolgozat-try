import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { inject } from "@angular/core";

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if(authService.isLoggedIn()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
}





// commented at 03.11 19:00
// import { Injectable } from '@angular/core';
// import { CanActivate, Router } from '@angular/router';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard implements CanActivate {
//   constructor(private router: Router) {}

//   canActivate(): boolean {
//     if (localStorage.getItem('token')) {
//       return true;
//     }
//     this.router.navigate(['/login']);
//     return false;
//   }
// }
