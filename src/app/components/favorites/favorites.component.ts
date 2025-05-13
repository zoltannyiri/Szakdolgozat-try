// components/favorites/favorites.component.ts
import { Component, OnInit } from '@angular/core';
import { FavoriteService } from '../../services/favorite.service';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { ILoop } from '../../../../api/src/models/loop.model';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-favorites',
  imports: [RouterModule, FormsModule, CommonModule],
  standalone: true,
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  favoriteLoops: ILoop[] = [];
  isLoading = true;

  constructor(
    private favoriteService: FavoriteService,
    private loopService: LoopService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.favoriteService.getUserFavorites().subscribe({
      next: (response: any) => {
        this.favoriteLoops = response.favorites || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading favorites:', err);
        this.isLoading = false;
      }
    });
  }

  removeFavorite(loopId: string): void {
    this.favoriteService.removeFavorite(loopId).subscribe({
      next: () => {
        this.favoriteLoops = this.favoriteLoops.filter(
          loop => loop._id !== loopId
        );
      },
      error: (err) => console.error('Error removing favorite:', err)
    });
  }
}