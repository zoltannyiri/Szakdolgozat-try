import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { HomeComponent } from './components/home/home.component';
import { AdminComponent } from './components/admin/admin.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { LoopsComponent } from './components/loops/loops.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ProfileComponent } from './components/profile/profile.component';
import { LoopDetailComponent } from './components/loop-detail/loop-detail.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { ChatComponent } from './components/chat/chat.component';

export const routes: Routes = [
    {'path': '', component: HomeComponent},
    {'path': 'layout', component: LayoutComponent},
    {'path': 'home', component: HomeComponent},
    {'path': 'admin', component: AdminComponent},
    {'path': 'register', component: RegisterComponent},
    {'path': 'login', component: LoginComponent},
    {'path': 'loops', component: LoopsComponent},
    {'path': 'forgot-password', component: ForgotPasswordComponent},
    {'path': 'profile', component: ProfileComponent},
    {'path': 'profile/:username', component: ProfileComponent },
    {'path': 'loop-detail/:id', component: LoopDetailComponent},
    {'path': 'favorites', component: FavoritesComponent},
    {'path': 'chat', component: ChatComponent}
    // {'path': 'profile/:userId', component: ProfileComponent }
];
