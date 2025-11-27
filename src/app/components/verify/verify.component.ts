import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // RouterModule hozzáadva
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

type State = 'loading' | 'success' | 'expired' | 'invalid' | 'error';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterModule], // RouterModule importálva
  templateUrl: './verify.component.html',
})
export class VerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth  = inject(AuthService);
  private router = inject(Router);

  state: State = 'loading';
  msg = 'Ellenőrzés folyamatban…';
  resendOk = '';
  resendErr = '';
  isSending = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const uid   = params.get('uid') || '';
      const token = params.get('token') || '';
      
      if (!uid || !token) { 
        this.state = 'invalid'; 
        this.msg = 'Hiányzó link paraméterek.'; 
        return; 
      }

      this.state = 'loading';
      this.msg = 'Ellenőrzés folyamatban…';
      
      this.auth.verifyAccount(uid, token).subscribe({
        next: () => { 
          this.state = 'success'; 
          this.msg = 'Sikeres megerősítés!'; 
        },
        error: (e) => {
          const code = e?.error?.code || '';
          if (code === 'TOKEN_EXPIRED') { 
            this.state = 'expired'; 
            this.msg = 'A megerősítő link lejárt. Kérj újat!'; 
          }
          else if (code === 'TOKEN_INVALID' || code === 'NO_TOKEN' || code === 'USER_NOT_FOUND') {
            this.state = 'invalid'; 
            this.msg = 'Érvénytelen megerősítő link.';
          } else { 
            this.state = 'error'; 
            this.msg = 'Váratlan hiba történt.'; 
          }
        }
      });
    });
  }

  resend() {
    if (this.isSending) return;
    this.isSending = true; 
    this.resendOk = ''; 
    this.resendErr = '';
    
    this.auth.resendVerification().subscribe({
      next: () => { 
        this.isSending = false; 
        this.resendOk = 'Új megerősítő e-mail sikeresen elküldve.'; 
      },
      error: (e) => { 
        this.isSending = false; 
        this.resendErr = e?.error?.message || 'Küldés sikertelen. Próbáld újra később.'; 
      }
    });
  }
}