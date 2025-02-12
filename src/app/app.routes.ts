import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { HomeComponent } from './components/home/home.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
    {'path': '', component: HomeComponent},
    {'path': 'login', component: LoginComponent},
    {'path': 'layout', component: LayoutComponent},
    {'path': 'home', component: HomeComponent},
    {'path': 'admin', component: AdminComponent}
];
