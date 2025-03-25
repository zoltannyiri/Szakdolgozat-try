import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-loop-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './loop-detail.component.html',
  styleUrl: './loop-detail.component.scss'
})


export class LoopDetailComponent implements OnInit {
  loop: any;
  comments: any[] = [];
  newComment: string = '';
  isLoggedIn: boolean = false;
  isLoading: boolean = false; // Hiányzó property hozzáadva
  errorMessage: string = ''; // Hibakezeléshez

  constructor(
    private route: ActivatedRoute,
    private loopService: LoopService,
    private commentService: CommentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadLoop(id);
      }
    });
  }

  loadLoop(id: string): void {
    this.isLoading = true;
    this.loopService.getLoopById(id).subscribe({
      next: (loop) => {
        this.loop = loop;
        this.loadComments(); // Kommentek külön betöltése
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba:', err);
        this.isLoading = false;
        // Hibakezelés a felhasználónak
      }
    });
  }

  loadComments(): void {
    if (!this.loop?._id) return;
    
    this.commentService.getCommentsForLoop(this.loop._id).subscribe({
      next: (comments: any) => { // Explicit típus vagy használj interfészt
        this.comments = Array.isArray(comments) ? comments : [];
      },
      error: (err) => {
        console.error('Kommentek betöltése sikertelen:', err);
        this.comments = [];
      }
    });
  }

  addComment(): void {
    if (this.newComment.trim() && this.loop?._id) {
      this.commentService.addComment(this.loop._id, this.newComment).subscribe({
        next: () => {
          this.newComment = '';
          this.loadComments();
        },
        error: (err: any) => console.error('Error adding comment:', err)
      });
    }
  }

  getAudioUrl(path: string): string {
    return this.loopService.getAudioUrl(path);
  }
}