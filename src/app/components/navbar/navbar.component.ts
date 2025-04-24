import { Component, HostListener, TemplateRef } from '@angular/core';
import { CommonModule, NgIfContext } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { RegisterComponent } from '../register/register.component';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

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
  isSidebarOpen = false;
  userName : string = '';
  userData: any = null;
  showNotifications = false;
  notifications: any[] = [];
  unreadNotificationsCount = 0;

  private subscription: Subscription;
loggedInView: TemplateRef<NgIfContext<boolean>> | null | undefined;
profileMenuOpen: any;

  constructor(public authService: AuthService, private notificationService: NotificationService, private router: Router) {
    this.subscription = this.authService.isLoggedIn$.subscribe(
      (loggedIn) => {
        this.isLoggedIn = loggedIn;
        if (loggedIn) {
          this.userName = this.authService.getUsernameFromToken() || '';
        }
      }
    );

    // Értesítések frissítése bejelentkezéskor
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      if (loggedIn) {
        this.loadNotifications();
        // Frissítés minden 60 másodpercben
        setInterval(() => this.loadNotifications(), 60000);
      }
    });
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

  @HostListener('document:click', ['$event'])
  closeSidebar(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar') && !target.closest('.menu-button')) {
      this.isSidebarOpen = false;
    }
  }

  logout() {
    this.authService.logout();
    this.showProfileMenu = false;
    this.isSidebarOpen = false;
  }


  toggleNotifications() {
    if (!this.authService.isLoggedIn()) {
      console.warn('Cannot show notifications - user not logged in');
      return;
    }
    
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    if (!this.authService.isLoggedIn()) {
      return;
    }
  
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response && response.success && Array.isArray(response.data)) {
          this.notifications = response.data.map((n: any) => ({
            ...n,
            // Biztosítsd, hogy a user objektum létezik
            message: n.message || (n.user?.username ? `${n.user.username} kommentelt` : 'Valaki kommentelt'),
            createdAt: new Date(n.createdAt)
          }));
          this.unreadNotificationsCount = this.notifications.filter(n => !n.read).length;
        }
      },
      error: (err) => console.error('Hiba:', err)
    });
  }


  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.unreadNotificationsCount = 0;
      },
      error: (err) => console.error('Error marking notifications as read:', err)
    });
  }

  handleNotificationClick(notification: any) {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe();
    }
  
    // Navigálás a loop részletekhez
    if (notification.type === 'comment' || notification.type === 'download') {
      this.router.navigate(['/loop-detail', notification.relatedItemId]).catch(err => {
        console.error('Navigációs hiba:', err);
      });
    }
    
    this.showNotifications = false;
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
