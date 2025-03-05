import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-loops',
  imports: [CommonModule],
  templateUrl: './loops.component.html',
  styleUrl: './loops.component.scss'
})
export class LoopsComponent {
  isAdvancedSearchOpen = false;

  toggleAdvancedSearch() {
    this.isAdvancedSearchOpen = !this.isAdvancedSearchOpen;
  }

  closeAdvancedSearch(event: Event) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.isAdvancedSearchOpen = false;
    }
  }
}
