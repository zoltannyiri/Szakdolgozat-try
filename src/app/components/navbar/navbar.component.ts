import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { RegisterComponent } from '../register/register.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
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