import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NavbarComponent } from './pages/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HomeComponent, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'LoopHub';
}
