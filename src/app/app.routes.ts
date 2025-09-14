import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { HomeComponent } from './components/home/home.component';
// import { AdminComponent } from './components/admin/admin.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { LoopsComponent } from './components/loops/loops.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ProfileComponent } from './components/profile/profile.component';
import { LoopDetailComponent } from './components/loop-detail/loop-detail.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { ChatComponent } from './components/chat/chat.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminLoopsComponent } from './components/admin/admin-loops/admin-loops.component';
import { AdminCommentsComponent } from './components/admin/admin-comments/admin-comments.component';
import { AdminReportsComponent } from './components/admin/admin-reports/admin-reports.component';
// import { VerifyComponent } from './components/verify/verify.component';

export const routes: Routes = [
    {'path': '', component: HomeComponent},
    {'path': 'layout', component: LayoutComponent},
    {'path': 'home', component: HomeComponent},
    // {'path': 'admin', component: AdminComponent},
    {'path': 'register', component: RegisterComponent},
    {'path': 'login', component: LoginComponent},
    {'path': 'loops', component: LoopsComponent},
    {'path': 'forgot-password', component: ForgotPasswordComponent},
    {'path': 'profile', component: ProfileComponent},
    {'path': 'profile/:username', component: ProfileComponent },
    {'path': 'loop-detail/:id', component: LoopDetailComponent},
    {'path': 'favorites', component: FavoritesComponent},
    {'path': 'chat', component: ChatComponent},
    {'path': 'verify', loadComponent: () => import('./components/verify/verify.component').then(m => m.VerifyComponent) },
    {'path': 'admin', component: AdminLayoutComponent, children: [
                                                                    { path: 'dashboard', component: AdminDashboardComponent },
                                                                    { path: 'users', component: AdminUsersComponent },
                                                                    { path: 'loops', component: AdminLoopsComponent },
                                                                    { path: 'comments', component: AdminCommentsComponent },
                                                                    { path: 'reports', component: AdminReportsComponent }
                                                                ]
}

    // {'path': 'profile/:userId', component: ProfileComponent }
];
