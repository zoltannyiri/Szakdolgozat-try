import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { RegisterComponent } from '../register/register.component';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  // toggleProfileMenu() {
  //   throw new Error('Method not implemented.');
  // }

  menuOpen = false;
  showProfileMenu = false;
  isLoggedIn = false;
  userName : string = '';

  private subscription: Subscription;

  constructor(public authService: AuthService) {
    this.subscription = this.authService.isLoggedIn$.subscribe(
      (loggedIn) => {
        this.isLoggedIn = loggedIn;
        if (loggedIn) {
          this.userName = this.authService.getUsernameFromToken() || '';
        }
      }
    );
  }

  ngOnInit() {
    // Kényszerítjük az állapot ellenőrzését
    this.authService.checkToken();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
  }

  // Avatar háttérszínének generálása
  getAvatarColor(username: string): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
    const firstLetter = username.charAt(0).toUpperCase();
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  }

  // Felhasználó nevének kezdőbetűi
  getInitials(username: string): string {
    const names = username.split(' ');
    if (names.length > 1) {
      return names[0].charAt(0) + names[1].charAt(0);
    }
    return names[0].charAt(0);
  }

  logout() {
    this.authService.logout();
    this.showProfileMenu = false;
  }

  // ngOnInit(): void {
  //   document.addEventListener('DOMContentLoaded', () => {
  //     const burger = document.querySelectorAll('.navbar-burger');
  //     const menu = document.querySelectorAll('.navbar-menu');
  //     const close = document.querySelectorAll('.navbar-close');
  //     const backdrop = document.querySelectorAll('.navbar-backdrop');

  //     if (burger.length && menu.length) {
  //         burger.forEach((burgerElement) => {
  //             burgerElement.addEventListener('click', () => {
  //                 menu.forEach((menuElement) => {
  //                     menuElement.classList.toggle('hidden');
  //                 });
  //             });
  //         });
  //     }

  //     if (close.length) {
  //         close.forEach((closeElement) => {
  //             closeElement.addEventListener('click', () => {
  //                 menu.forEach((menuElement) => {
  //                     menuElement.classList.toggle('hidden');
  //                 });
  //             });
  //         });
  //     }
  //   });
  // }
}
