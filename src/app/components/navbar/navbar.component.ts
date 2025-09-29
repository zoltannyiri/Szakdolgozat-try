import { Component, HostListener, TemplateRef } from '@angular/core';
import { CommonModule, NgIfContext } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { RegisterComponent } from '../register/register.component';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, HttpClientModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('fadeInDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('100ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
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
  unreadMessagesCount: number = 0;

  socket: Socket | null = null;
  recentChats: any[] = [];
  showDropdown = false;
  showChatDropdown = false;
  currentUserId: string = '';

  // ---- admin flag ----
  isAdmin = false;

  private subscription: Subscription;
  loggedInView: TemplateRef<NgIfContext<boolean>> | null | undefined;
  profileMenuOpen: any;

  // constructor(public authService: AuthService, private notificationService: NotificationService, private router: Router) {
  //   this.subscription = this.authService.isLoggedIn$.subscribe(
  //     (loggedIn) => {
  //       this.isLoggedIn = loggedIn;
  //       if (loggedIn) {
  //         this.userName = this.authService.getUsernameFromToken() || '';
  //       }
  //     }
  //   );

  //   // Értesítések frissítése bejelentkezéskor
  //   this.authService.isLoggedIn$.subscribe(loggedIn => {
  //     if (loggedIn) {
  //       this.loadNotifications();
  //       // Frissítés minden 60 másodpercben
  //       setInterval(() => this.loadNotifications(), 60000);
  //     }
  //   });
  // }


  constructor(
    public authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private http: HttpClient
  ) {
    this.subscription = this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.authService.getUserProfile().subscribe({
          next: (res: any) => {
            this.userName = res.user?.username || '';
         
            this.isAdmin = (res.user?.role === 'admin') || this.readRoleFromToken() === 'admin';
            console.log('[NAVBAR] username from profile API:', this.userName);
          },
          error: (err) => {
            console.error('[NAVBAR] Failed to load profile:', err);
           
            this.isAdmin = this.readRoleFromToken() === 'admin';
          }
        });

        this.loadNotifications();
      } else {
        this.userName = '';
        this.notifications = [];
       
        this.isAdmin = false;
      }
    });

  }

  ngOnInit() {
    this.socket = io('http://localhost:3000');

    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.authService.getUserProfile().subscribe({
          next: (res: any) => {
            this.userName = res.user?.username || '';
            this.userData = res.user || {};
            this.currentUserId = res.user?._id;

            // ---- admin státusz frissítése ----
            this.isAdmin = (res.user?.role === 'admin') || this.readRoleFromToken() === 'admin';

           
            this.socket?.emit('joinRoom', this.currentUserId);

            
            this.socket?.on('receiveMessage', (message: any) => {
              if (message.senderId !== this.currentUserId) {
                this.unreadMessagesCount++;
              }
            });

            // Korábbi csevegések lekérése
            this.http.get(`${environment.apiUrl}/api/chats/summary`, {
              headers: { Authorization: `Bearer ${this.authService.getToken()}` }
            }).subscribe({
              next: (res: any) => {
                console.log('[Chats Summary]', res.chats);
                this.recentChats = res.chats.map((chat: any) => {
                  const isOwnMessage = chat.lastSenderId?.toString() === this.currentUserId;
                  return {
                    ...chat,
                    lastMessage: isOwnMessage ? `Te: ${chat.lastMessage}` : chat.lastMessage,
                    ui: {
                      avatarColor: this.getAvatarColor(chat.username),
                      initials: this.getInitials(chat.username)
                    }
                  };
                });
              },
              error: (err) => {
                console.error('Nem sikerült lekérni a csevegéseket:', err);
              }
            });
          },
          error: (err) => {
            console.error('[NAVBAR] Failed to load profile:', err);
            // fallback
            this.isAdmin = this.readRoleFromToken() === 'admin';
          }
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.socket?.disconnect();
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
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
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
    // ---- kilépéskor admin flag reset ----
    this.isAdmin = false;
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
            
            message: n.message || (n.user?.username ? `${n.user.username} kommentelt` : 'Valaki kommentelt'),
            createdAt: new Date(n.createdAt)
          }));
          this.unreadNotificationsCount = this.notifications.filter(n => !n.read).length;
        }
      },
      error: (err) => console.error('Hiba:', err)
    });
  }

  getNotificationIconClass(type: string): string {
    const classes: Record<string, string> = {
      'like': 'bg-red-100 text-red-600',
      'download': 'bg-green-100 text-green-600',
      'comment': 'bg-blue-100 text-blue-600',
      'follow': 'bg-purple-100 text-purple-600',
      'loop_approved': 'bg-emerald-100 text-emerald-700',
      'loop_rejected': 'bg-amber-100 text-amber-700',
      'loop_edited': 'bg-cyan-100 text-cyan-700' 
    };
    return classes[type] || 'bg-gray-100 text-gray-600';
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'like': 'bi bi-heart-fill',
      'download': 'bi bi-download',
      'comment': 'bi bi-chat-square-text-fill',
      'follow': 'bi bi-person-plus-fill',
      'loop_approved': 'bi bi-check-circle-fill',
      'loop_rejected': 'bi bi-x-circle-fill',
      'loop_edited': 'bi bi-pencil-square'  
    };
    return icons[type] || 'bi bi-bell-fill';
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

    // navigáció
    if (notification.type === 'comment' || notification.type === 'download') {
      this.router.navigate(['/loop-detail', notification.relatedItemId]).catch(err => {
        console.error('Navigációs hiba:', err);
      });
    }

    this.showNotifications = false;
  }

  //chat
  navigateToChat(userId: string) {
    this.router.navigate(['/chat'], { queryParams: { userId } });
  }

  toggleChatDropdown() {
    this.showChatDropdown = !this.showChatDropdown;
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

  // ---- JWT payload-ból role kiolvasása fallbackként ----
  private readRoleFromToken(): string | null {
    try {
      const token = (this.authService as any)?.getToken?.();
      if (!token) return null;
      const base64 = token.split('.')[1];
      if (!base64) return null;
      const payload = JSON.parse(atob(base64));
      // többféle backend payloadot is kezelünk
      return payload?.role || payload?.user?.role || null;
    } catch {
      return null;
    }
  }
}
