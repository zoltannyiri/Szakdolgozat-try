import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { HomeComponent } from './components/home/home.component';
import { AdminComponent } from './components/admin/admin.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
    {'path': '', component: HomeComponent},
    {'path': 'layout', component: LayoutComponent},
    {'path': 'home', component: HomeComponent},
    {'path': 'admin', component: AdminComponent},
    {'path': 'register', component: RegisterComponent},
    {'path': 'login', component: LoginComponent}
];
