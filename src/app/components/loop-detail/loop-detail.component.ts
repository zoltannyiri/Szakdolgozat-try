import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-loop-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loop-detail.component.html',
  styleUrl: './loop-detail.component.scss'
})
export class LoopDetailComponent implements OnInit {
  loop: any;
  comments: any[] = [];
  newComment: string = '';
  isLoggedIn: boolean = false;
  isLoading: boolean = false;
  isAddingComment: boolean = false;
  errorMessage: string = '';

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private loopService: LoopService,
    private commentService: CommentService,
    public authService: AuthService // Publikussá tettük a template számára
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadLoop(id);
      }
    });
  }

  // checkAuthStatus(): void {
  //   this.authService.isAuthenticated().subscribe({
  //     next: (isAuthenticated: boolean) => {
  //       this.isLoggedIn = isAuthenticated;
  //     },
  //     error: (err: any) => {
  //       console.error('Hitelesítés ellenőrzése sikertelen:', err);
  //       this.isLoggedIn = false;
  //     }
  //   });
  // }
  checkAuthStatus(): void {
    this.authService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        this.isLoggedIn = isAuthenticated;
      },
      error: (err) => {
        console.error('Hitelesítés ellenőrzése sikertelen:', err);
        this.isLoggedIn = false;
      }
    });
  }
  

  handleLogin(): void {
    const currentRoute = this.route.snapshot.url.join('/');
    this.authService.login(currentRoute).subscribe({
      next: (success) => {
        if (success) {
          this.checkAuthStatus();
        }
      },
      error: (err) => {
        console.error('Bejelentkezési hiba:', err);
        this.errorMessage = 'Bejelentkezés sikertelen';
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  loadLoop(id: string): void {
    this.isLoading = true;
    this.loopService.getLoopById(id).subscribe({
      next: (loop) => {
        this.loop = loop;
        this.loadComments();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a loop betöltésekor:', err);
        this.isLoading = false;
        this.errorMessage = 'Nem sikerült betölteni a loop-ot';
      }
    });
  }

  loadComments(): void {
    if (!this.loop?._id) return;
    
    this.commentService.getCommentsForLoop(this.loop._id).subscribe({
      next: (response: any) => {
        // Ellenőrizzük a válasz struktúrát
        console.log('Komment válasz:', response);
        this.comments = Array.isArray(response?.data) ? response.data : [];
      },
      error: (err) => {
        console.error('Kommentek betöltése sikertelen:', err);
        this.comments = [];
        this.errorMessage = 'Hiba a kommentek betöltésekor';
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'A kommentelési funkció jelenleg nem elérhető';
    }
    if (error.status === 401) {
      return 'Be kell jelentkezned a kommenteléshez';
    }
    return 'Hiba történt a komment hozzáadásakor';
  }

  addComment(): void {
    if (!this.newComment.trim() || this.newComment.length > 500 || !this.loop?._id) {
      this.errorMessage = 'Érvénytelen komment';
      return;
    }
  
    this.isAddingComment = true;
    this.errorMessage = '';
  
    this.commentService.addComment(this.loop._id, this.newComment).subscribe({
      next: (newComment) => {
        console.log('Sikeres komment:', newComment);
        // Hozzáadjuk az új kommentet a meglévő kommentekhez
        this.comments.unshift(newComment); // Az új komment legyen elől
        this.newComment = '';
        this.isAddingComment = false;
      },
      error: (err) => {
        console.error('Hiba:', err);
        this.errorMessage = this.getErrorMessage(err);
        this.isAddingComment = false;
      }
    });
  }

  getAudioUrl(path: string | undefined): string {
    if (!path) return '';
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    return `${this.loopService.apiUrl}/uploads/${cleanPath}`;
  }
}


// import { CommonModule } from '@angular/common';
// import { Component, OnInit } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { ActivatedRoute } from '@angular/router';
// import { LoopService } from '../../services/loop.service';
// import { AuthService } from '../../services/auth.service';
// import { CommentService } from '../../services/comment.service';
// import { Location } from '@angular/common';

// @Component({
//   selector: 'app-loop-detail',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './loop-detail.component.html',
//   styleUrl: './loop-detail.component.scss'
// })


// export class LoopDetailComponent implements OnInit {
//   goBack(): void {
//     this.location.back();
//   }
//   loop: any;
//   comments: any[] = [];
//   newComment: string = '';
//   isLoggedIn: boolean = false;
//   isLoading: boolean = false; // Hiányzó property hozzáadva
//   errorMessage: string = ''; // Hibakezeléshez

//   constructor(
//     private location: Location,
//     private route: ActivatedRoute,
//     private loopService: LoopService,
//     private commentService: CommentService,
//     private authService: AuthService
//   ) {}

//   ngOnInit(): void {
//     this.route.paramMap.subscribe(params => {
//       const id = params.get('id');
//       if (id) {
//         this.loadLoop(id);
//       }
//     });
//   }

  

//   // loadLoop(id: string): void {
//   //   this.isLoading = true;
//   //   this.loopService.getLoopById(id).subscribe({
//   //     next: (loop) => {
//   //       this.loop = loop;
//   //       this.loadComments(); // Kommentek külön betöltése
//   //       this.isLoading = false;
//   //     },
//   //     error: (err) => {
//   //       console.error('Hiba:', err);
//   //       this.isLoading = false;
//   //       // Hibakezelés a felhasználónak
//   //     }
//   //   });
//   // }
//   loadLoop(id: string): void {
//     this.isLoading = true;
//     this.loopService.getLoopById(id).subscribe({
//       next: (loop) => {
//         // console.log('Loop adatok:', loop);
//         // console.log('Generált audio URL:', this.getAudioUrl(loop.path));
//         this.loop = loop;
//         this.loadComments();
//         this.isLoading = false;
//       },
//       error: (err) => {
//         console.error('Hiba a loop betöltésekor:', err);
//         this.isLoading = false;
//         this.errorMessage = 'Nem sikerült betölteni a loop-ot';
//       }
//     });
//   }



//   loadComments(): void {
//     if (!this.loop?._id) return;
    
//     this.commentService.getCommentsForLoop(this.loop._id).subscribe({
//       next: (comments: any) => { // Explicit típus vagy használj interfészt
//         this.comments = Array.isArray(comments) ? comments : [];
//       },
//       error: (err) => {
//         console.error('Kommentek betöltése sikertelen:', err);
//         this.comments = [];
//       }
//     });
//   }

//   addComment(): void {
//     if (this.newComment.trim() && this.loop?._id) {
//       this.commentService.addComment(this.loop._id, this.newComment).subscribe({
//         next: () => {
//           this.newComment = '';
//           this.loadComments();
//         },
//         error: (err: any) => console.error('Error adding comment:', err)
//       });
//     }
//   }

//   // getAudioUrl(path: string): string {
//   //   return this.loopService.getAudioUrl(path);
//   // }
//   getAudioUrl(path: string | undefined): string {
//     if (!path) return '';
    
//     // Ha már teljes URL (http:// vagy https://), akkor változatlanul visszaadja
//     if (path.startsWith('http://') || path.startsWith('https://')) {
//       return path;
//     }
    
//     // API URL hozzáadása és elérési út tisztítása
//     const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
//     return `${this.loopService.apiUrl}/uploads/${cleanPath}`;
//   }
// }