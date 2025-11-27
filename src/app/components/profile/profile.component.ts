import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../services/reports.service';
import { LoopService } from '../../services/loop.service';
import { catchError } from 'rxjs';
import { CommentService } from '../../services/comment.service';

type ToastVariant = 'default' | 'success' | 'error';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  apiUrl = environment.apiUrl;
  environmentApi = environment.apiUrl;


  userData: any = null;
  errorMessage = '';
  activeTab: string = 'general';

  aboutMe: string = '';
  originalAboutMe: string = '';
  isCurrentUser = false;
  isEditing = false;

  editForm = { firstName: '', lastName: '', country: '', city: '' };
  emailForm = { newEmail: '', password: '' };
  passForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  msg = { general: '', email: '', pass: '' };
  err = { general: '', email: '', pass: '' };

  saving = { general: false, email: false, pass: false };
  isDragging = false;

  toast = { text: '', variant: 'default' as ToastVariant, timer: 0 };

  // report
  isProfileReportOpen = false;
  profileReportReason = '';
  isReportingProfile = false;
  profileReportError = '';
  profileReportSuccess = '';

  // ha admin nézi
  isBanModalOpen = false;
  banPreset: '1d' | '1m' | 'permanent' = '1d';
  banReason = '';
  banning = false;
  unbanning = false;

  // user loopjai
  userLoops: any[] = [];
  loopsLoading = false;

  // user kommentjei
  userComments: any[] = [];
  commentsLoading = false;

  currentUserIsVerified = false;
  currentUserIsBanned = false;
  currentUserBanMessage = '';


  // socials
  socials: any = {
  facebook: '', instagram: '', youtube: '', soundcloud: '',
  spotify: '', tiktok: '', x: '', website: '', email: ''
};

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private reportsSvc: ReportsService,
    private loopSvc: LoopService,
    private commentSvc: CommentService
  ) { }

  // ngOnInit(): void {
  //   this.route.paramMap.subscribe(params => {
  //     const username = params.get('username');
  //     if (username) {
  //       this.secureGet(`${environment.apiUrl}/api/profile/${username}`).subscribe({
  //         next: (response: any) => this.hydrateUser(response.user),
  //         error: () => this.errorMessage = 'Could not load profile data'
  //       });
  //     } else {
  //       this.secureGet(`${environment.apiUrl}/api/profile`).subscribe({
  //         next: (response: any) => this.hydrateUser(response.user, true),
  //         error: () => this.errorMessage = 'Could not load profile data'
  //       });
  //     }
  //   });
  // }
  ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const username = params.get('username');

    if (username) {
      // 1) Megnyitott profil (idegen)
      this.secureGet(`${environment.apiUrl}/api/profile/${username}`).subscribe({
        next: (response: any) => this.hydrateUser(response.user, false),
        error: () => this.errorMessage = 'Nem sikerült betölteni a profil adatokat'
      });

      // 2) Saját adatok is kellenek, hogy tudjuk: verified? banned?
      this.secureGet(`${environment.apiUrl}/api/profile`).subscribe({
        next: (meResp: any) => this.setCurrentUserState(meResp.user),
        error: () => {
          // ha nem vagy belépve vagy hiba van, akkor nem töltjük
        }
      });

    } else {
      // Saját profil oldalam
      this.secureGet(`${environment.apiUrl}/api/profile`).subscribe({
        next: (response: any) => {
          this.hydrateUser(response.user, true);
          // hydrateUser(true) már hívni fogja setCurrentUserState-et (lásd lent)
        },
        error: () => this.errorMessage = 'Nem sikerült betölteni a profil adatokat'
      });
    }
  });
}


private setCurrentUserState(me: any) {
  // verified flag normálisan (ha lenne olyan mező, hogy verified, azt is fallbackelhetjük)
  this.currentUserIsVerified = !!(me?.isVerified ?? me?.verified ?? false);

  // ban státusz kiszámítása
  const bannedUntil = me?.bannedUntil ? new Date(me.bannedUntil) : null;
  const stillBanned = bannedUntil && bannedUntil.getTime() > Date.now();

  this.currentUserIsBanned = !!stillBanned;

  if (stillBanned) {
    const forever = bannedUntil.getUTCFullYear() >= 9999;
    this.currentUserBanMessage = forever
      ? 'A fiókod véglegesen tiltva. A privát üzenetküldés nem engedélyezett.'
      : `A fiókod ${bannedUntil.toLocaleString('hu-HU')} időpontig tiltva. A privát üzenetküldés nem engedélyezett.`;
  } else {
    this.currentUserBanMessage = '';
  }
}



  private hydrateUser(user: any, self = false) {
  this.userData = user;
  this.isCurrentUser = self || this.authService.getUserId() === user?._id;
  this.originalAboutMe = user?.aboutMe || '';
  this.aboutMe = user?.aboutMe || '';
  this.fillGeneralForm();

  if (self) {
    this.setCurrentUserState(user);
  }

  this.socials = {
    facebook:   user?.socials?.facebook   || '',
    instagram:  user?.socials?.instagram  || '',
    youtube:    user?.socials?.youtube    || '',
    soundcloud: user?.socials?.soundcloud || '',
    spotify:    user?.socials?.spotify    || '',
    tiktok:     user?.socials?.tiktok     || '',
    x:          user?.socials?.x          || '',
    website:    user?.socials?.website    || '',
    email:      user?.socials?.email      || ''
  };

  this.fetchUserLoops();
  this.fetchUserComments();
}


  // socials
  savingSocials = false;
  msgSocials = '';
  errSocials = '';

  saveSocials() {
    this.msgSocials = '';
    this.errSocials = '';
    this.savingSocials = true;

    // opcionális kliens oldali minimál validáció
    const payload = { socials: { ...this.socials } };

    this.securePatch(`${environment.apiUrl}/api/profile/socials`, payload).subscribe({
      next: (res: any) => {
        this.userData = res?.user || this.userData;
        this.msgSocials = 'Linkek mentve ✅';
        this.showToast('Közösségi linkek frissítve', 'success');
      },
      error: (e:any) => {
        this.errSocials = e?.error?.message || 'Mentés sikertelen';
        this.showToast(this.errSocials, 'error');
      },
      complete: () => this.savingSocials = false
    });
  }


  fetchUserLoops() {
    if (!this.userData?._id) return;
    this.loopsLoading = true;
    this.loopSvc.getLoops({ uploader: this.userData._id, sortBy: 'recent' })
      .subscribe({
        next: (res) => this.userLoops = res.items || [],
        error: () => this.showToast('Loops betöltése sikertelen', 'error'),
        complete: () => this.loopsLoading = false
      });
  }

  uploadNewLoop(): void {
    this.router.navigate(['/loops']);
  }


  totalDownloads(): number {
    return (this.userLoops || []).reduce((s, l) => s + (Number(l?.downloads) || 0), 0);
  }
  totalLikes(): number {
    return (this.userLoops || []).reduce((s, l) => s + (Number(l?.likes) || 0), 0);
  }
  getLoopSource(loop: any): string {
    const p = loop?.path || '';
    return p.startsWith('http') ? p : `${this.environmentApi}/${p}`;
  }


  // időtartam
  formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return "0:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }



  get isActive(): boolean {
    if (!this.userData?.lastLogin) return false;
    const lastLoginTime = new Date(this.userData.lastLogin).getTime();
    const diffMin = (Date.now() - lastLoginTime) / 60000;
    return diffMin <= 5;
  }

  getInitials(username: string): string {
    if (!username) return '';
    const parts = username.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }

  copy(text: string) {
    navigator.clipboard.writeText(text).then(() => this.showToast('Másolva ✅', 'success'));
  }

  // startChatWithUser() {
  //   if (this.userData?._id) {
  //     this.router.navigate(['/chat'], { queryParams: { userId: this.userData._id } });
  //   }
  // }

  startChatWithUser() {
  // 1) nincs token -> loginra küldjük
  if (!this.authService.getToken()) {
    this.showToast('A privát üzenethez jelentkezz be', 'error');
    this.router.navigate(
      ['/login'], 
      { queryParams: { redirect: this.router.url } }
    );
    return;
  }

  // 2) bannolt felhasználó
  if (this.currentUserIsBanned) {
    this.showToast(
      this.currentUserBanMessage || 'A fiókod jelenleg tiltva, az üzenetküldés nem engedélyezett.',
      'error',
      5000 // kicsit tovább maradhat
    );
    return;
  }

  // 3) nincs verifikálva
  if (!this.currentUserIsVerified) {
    this.showToast(
      'A privát üzenetküldéshez meg kell erősítened a fiókodat.',
      'error'
    );
    return;
  }

  // 4) magaddal nem chatelek
  if (this.isCurrentUser) {
    this.showToast('Ez te vagy 😅', 'error');
    return;
  }

  // 5) minden ok -> mehet
  if (this.userData?._id) {
    this.router.navigate(
      ['/chat'], 
      { queryParams: { userId: this.userData._id } }
    );
  }
}


  startEditing() { this.isEditing = true; }
  cancelEditing() { this.aboutMe = this.originalAboutMe; this.isEditing = false; }

  /** --- forms --- */
  private fillGeneralForm() {
    this.editForm.firstName = this.userData?.firstName || '';
    this.editForm.lastName = this.userData?.lastName || '';
    this.editForm.country = this.userData?.country || '';
    this.editForm.city = this.userData?.city || '';
  }

  resetGeneral() {
    this.fillGeneralForm();
    this.msg.general = '';
    this.err.general = '';
  }

  saveGeneral() {
    this.msg.general = ''; this.err.general = '';
    const payload = { ...this.editForm, aboutMe: this.aboutMe };
    this.saving.general = true;

    this.securePut(`${environment.apiUrl}/api/profile`, payload).subscribe({
      next: (res: any) => {
        this.userData = res.user;
        this.fillGeneralForm();
        this.originalAboutMe = this.userData?.aboutMe || '';
        this.aboutMe = this.userData?.aboutMe || '';
        this.msg.general = 'Mentve ✅';
        this.isEditing = false;
        this.showToast('Profil frissítve', 'success');
      },
      error: (e: any) => {
        this.err.general = e?.error?.message || 'Mentés sikertelen';
        this.showToast(this.err.general, 'error');
      },
      complete: () => this.saving.general = false
    });
  }

  changeEmail() {
    this.msg.email = ''; this.err.email = '';
    if (!this.emailForm.newEmail || !this.emailForm.password) {
      this.err.email = 'Add meg az új e-mail címet és a jelszavadat';
      return;
    }
    this.saving.email = true;

    this.securePatch(`${environment.apiUrl}/api/profile/email`, this.emailForm).subscribe({
      next: (res: any) => {
        this.msg.email = res?.message || 'E-mail frissítve. Kérlek erősítsd meg az új e-mail címedet.';
        this.userData.email = this.emailForm.newEmail;
        this.emailForm = { newEmail: '', password: '' };
        this.showToast('E-mail frissítve', 'success');
      },
      error: (e: any) => {
        this.err.email = e?.error?.message || 'E-mail módosítás sikertelen';
        this.showToast(this.err.email, 'error');
      },
      complete: () => this.saving.email = false
    });
  }

  changePassword() {
    this.msg.pass = ''; this.err.pass = '';
    if (!this.passForm.currentPassword || !this.passForm.newPassword) {
      this.err.pass = 'Töltsd ki a jelszó mezőket';
      return;
    }
    if (this.passForm.newPassword !== this.passForm.confirmPassword) {
      this.err.pass = 'Az új jelszavak nem egyeznek';
      return;
    }
    this.saving.pass = true;

    const payload = { currentPassword: this.passForm.currentPassword, newPassword: this.passForm.newPassword };
    this.securePatch(`${environment.apiUrl}/api/profile/password`, payload).subscribe({
      next: (res: any) => {
        this.msg.pass = res?.message || 'Jelszó frissítve ✅';
        this.passForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.showToast('Jelszó módosítva', 'success');
      },
      error: (e: any) => {
        this.err.pass = e?.error?.message || 'Jelszó módosítás sikertelen';
        this.showToast(this.err.pass, 'error');
      },
      complete: () => this.saving.pass = false
    });
  }


  onAvatarSelected(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (file) this.uploadAvatar(file);
  }

  @HostListener('document:drop', ['$event'])
  preventDocumentDropDefault(e: DragEvent) {
    // képmegnyitás elkerülése
    e.preventDefault();
    e.stopPropagation();
  }

  onAvatarDropped(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadAvatar(file);
    }
  }

  private uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    this.securePost(`${environment.apiUrl}/api/profile/upload-avatar`, formData).subscribe({
      next: (resp: any) => {
        this.userData.profileImage = resp.imageUrl;
        this.showToast('Profilkép frissítve', 'success');
      },
      error: () => this.showToast('Kép feltöltés sikertelen', 'error')
    });
  }

  // tokken header
  private secureGet(url: string) {
    return this.http.get(url, { headers: { 'Authorization': `Bearer ${this.authService.getToken()}` } });
  }
  private securePost(url: string, body: any) {
    return this.http.post(url, body, { headers: { 'Authorization': `Bearer ${this.authService.getToken()}` } });
  }
  private securePut(url: string, body: any) {
    return this.http.put(url, body, { headers: { 'Authorization': `Bearer ${this.authService.getToken()}` } });
  }
  private securePatch(url: string, body: any) {
    return this.http.patch(url, body, { headers: { 'Authorization': `Bearer ${this.authService.getToken()}` } });
  }

  /** --- toast --- */
  private showToast(text: string, variant: ToastVariant = 'default', ms = 2200) {
    this.toast.text = text;
    this.toast.variant = variant;
    clearTimeout(this.toast.timer);
    // @ts-ignore
    this.toast.timer = setTimeout(() => (this.toast.text = ''), ms);
  }


  // report
  openProfileReportModal(): void {
    if (!this.authService.getToken()) {
      this.showToast('Kérlek jelentkezz be a jelentéshez', 'error');
      this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    if (this.isCurrentUser || !this.userData?._id) return;

    this.profileReportReason = '';
    this.profileReportError = '';
    this.profileReportSuccess = '';
    this.isProfileReportOpen = true;
  }


  closeProfileReportModal(evt?: Event): void {
    if (!evt) { this.isProfileReportOpen = false; return; }
    const el = evt.target as HTMLElement;
    if (el.classList.contains('bg-black') || el.classList.contains('bg-black/50')) {
      this.isProfileReportOpen = false;
    }
  }


  submitProfileReport(): void {
    if (!this.userData?._id || !this.profileReportReason.trim()) return;

    this.isReportingProfile = true;
    this.profileReportError = '';
    this.profileReportSuccess = '';

    this.reportsSvc.reportProfile(this.userData._id, this.profileReportReason.trim())
      .subscribe({
        next: () => {
          this.isReportingProfile = false;
          this.profileReportSuccess = 'Köszönjük! A jelentést megkaptuk.';
          this.showToast('Jelentés elküldve', 'success');
          setTimeout(() => (this.isProfileReportOpen = false), 900);
        },
        error: (err) => {
          this.isReportingProfile = false;
          this.profileReportError = err?.error?.message || 'Hiba történt a jelentés beküldésekor.';
          this.showToast(this.profileReportError, 'error');
        }
      });
  }


  //admin
  get isAdmin(): boolean {
    try {
      const token = this.authService.getToken();
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload?.role === 'admin' || payload?.isAdmin === true;
    } catch { return false; }
  }

  isStillBanned(until: string | Date | null | undefined) {
    if (!until) return false;
    return new Date(until).getTime() > Date.now();
  }
  isPermanent(until: string | Date | null | undefined) {
    if (!until) return false;
    return new Date(until).getUTCFullYear() >= 9999;
  }

  ban(duration: '1d' | '1m' | 'permanent') {
    if (!this.userData?._id) return;
    const reason = prompt('Indoklás (opcionális):') || '';
    this.securePost(`${environment.apiUrl}/api/admin/users/${this.userData._id}/ban`, { duration, reason })
      .subscribe({
        next: (res: any) => {
          this.userData.bannedUntil = res?.data?.bannedUntil;
          this.userData.banReason = reason;
          this.showToast('Felhasználó tiltva', 'success');
        },
        error: (e: any) => this.showToast(e?.error?.message || 'Tiltás sikertelen', 'error')
      });
  }

  // unban() {
  //   if (!this.userData?._id) return;
  //   this.securePost(`${environment.apiUrl}/api/admin/users/${this.userData._id}/unban`, {})
  //     .subscribe({
  //       next: (res: any) => {
  //         this.userData.bannedUntil = null;
  //         this.userData.banReason = '';
  //         this.showToast('Tiltás feloldva', 'success');
  //       },
  //       error: (e: any) => this.showToast(e?.error?.message || 'Feloldás sikertelen', 'error')
  //     });
  // }

  unban() {
    if (!this.userData?._id) return;
    this.unbanning = true;

    this.securePost(`${environment.apiUrl}/api/admin/users/${this.userData._id}/unban`, {})
      .subscribe({
        next: () => {
          this.userData.bannedUntil = null;
          this.userData.banReason = '';
          this.showToast('Tiltás feloldva', 'success');
        },
        error: (e: any) => this.showToast(e?.error?.message || 'Feloldás sikertelen', 'error'),
        complete: () => { this.unbanning = false; this.isBanModalOpen = false; }
      });
  }


  openBanModal() {
    if (!this.userData?._id) return;
    this.banPreset = '1d';
    this.banReason = this.userData?.banReason || '';
    this.isBanModalOpen = true;
  }

  closeBanModal(evt?: Event) {
    if (!evt) { this.isBanModalOpen = false; return; }
    const target = evt.target as HTMLElement;
    if (target.classList.contains('bg-black') || target.classList.contains('bg-black/50')) {
      this.isBanModalOpen = false;
    }
  }

  submitBan() {
    if (!this.userData?._id) return;
    this.banning = true;

    this.securePost(
      `${environment.apiUrl}/api/admin/users/${this.userData._id}/ban`,
      { duration: this.banPreset, reason: this.banReason?.trim() || '' }
    ).subscribe({
      next: (res: any) => {
        this.userData.bannedUntil = res?.data?.bannedUntil;
        this.userData.banReason = this.banReason?.trim() || '';
        this.showToast('Tiltás alkalmazva', 'success');
        this.isBanModalOpen = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Tiltás sikertelen', 'error');
      },
      complete: () => (this.banning = false)
    });
  }

  //gmail login
  get isGoogleAccount(): boolean {
    return this.userData?.provider === 'google';
  }


  isSettingsOpen = false;
  settingsTab: 'profile' | 'account' = 'profile';

  usernameForm = { newUsername: '' };
  savingUsername = false;
  msgUsername = '';
  errUsername = '';

  // + metódusok:
  openSettings() { this.isSettingsOpen = true; this.settingsTab = 'profile'; }
  closeSettings(evt?: Event) {
    if (!evt) { this.isSettingsOpen = false; return; }
    const t = evt.target as HTMLElement;
    if (t.classList.contains('bg-black/60') || t.classList.contains('bg-black/50')) {
      this.isSettingsOpen = false;
    }
  }

  // nicknév módosítás
  changeUsername() {
    this.msgUsername = '';
    this.errUsername = '';

    const raw = this.usernameForm?.newUsername ?? '';
    const newU = raw.trim();

    // ha üres
    if (!newU) {
      this.errUsername = 'Adj meg egy új nicknevet';
      return;
    }

    // kliens oldali validáció: 3–20, betű/szám/_
    const valid = /^[a-zA-Z0-9_]{3,20}$/.test(newU);
    if (!valid) {
      this.errUsername = '3–20 karakter, csak betű/szám/alsóvonás (_) engedélyezett';
      return;
    }

    // ne engedjük ugyanazt
    const current = (this.userData?.username || '').trim();
    if (current.toLowerCase() === newU.toLowerCase()) {
      this.errUsername = 'Ez már a jelenlegi nickneved';
      return;
    }

    this.savingUsername = true;

    // Szerver
    this.securePatch(`${environment.apiUrl}/api/profile/username`, { newUsername: newU })
      .subscribe({
        next: (res: any) => {
          const updated = res?.user?.username || res?.username || newU;
          if (!updated) {
            this.errUsername = 'Váratlan válasz a szervertől';
            return;
          }
          this.userData.username = updated;
          this.usernameForm.newUsername = '';
          this.msgUsername = 'Nicknév frissítve ✅';
          this.showToast('Nicknév frissítve', 'success');
        },
        error: (e: any) => {
          // ha foglalt a nick
          if (e?.status === 409) {
            this.errUsername = 'Ez a nick már foglalt';
          } else {
            this.errUsername = e?.error?.message || 'Nicknév módosítás sikertelen';
          }
          this.showToast(this.errUsername, 'error');
        },
        complete: () => this.savingUsername = false
      });
  }


  // fő tabok + al-tab
  activeMainTab: 'profile' | 'loops' | 'acapellas' | 'tracks' | 'comments' = 'profile';
  profileSub: 'about' | 'blocked' | 'ignored' | 'followed' = 'about';

  // stat getter 
  stat(key: 'uploads' | 'downloads' | 'downloaded' | 'commentsOut' | 'favouritesIn' | 'favouritesOut'): number {
    const u = this.userData || {};
    // ha nincs, akkor 0
    return Number(u[key] ?? 0);
  }


  // user adatai jobb oldali sávban
  get statUploads(): number {
    return this.userLoops?.length || 0;
  }
  get statDownloads(): number {
    return this.totalDownloads();
  }
  get statLikesIn(): number {
    return this.totalLikes();
  }
  get statCommentsOut(): number {
    return this.userComments?.length || 0;
  }

  allUserComments: any[] = [];
  commentsPage = 1;      
  commentsPageSize = 6;

  // user kommentjei
  fetchUserComments() {
    if (!this.userData?._id) return;
    this.commentsLoading = true;
    this.commentSvc.getCommentsByUser(this.userData._id).subscribe({
      next: (res) => {
        this.allUserComments = res?.items || [];
        this.commentsPage = 1;
        this.updateVisibleComments();
      },
      error: () => this.showToast('Kommentek betöltése sikertelen', 'error'),
      complete: () => this.commentsLoading = false
    });
  }
  updateVisibleComments() {
    const startIndex = (this.commentsPage - 1) * this.commentsPageSize;
    const endIndex = startIndex + this.commentsPageSize;
    this.userComments = this.allUserComments.slice(startIndex, endIndex);
  }
  nextCommentsPage() {
    if (this.commentsPage < this.commentsTotalPages) {
      this.commentsPage++;
      this.updateVisibleComments();
    }
  }

  prevCommentsPage() {
    if (this.commentsPage > 1) {
      this.commentsPage--;
      this.updateVisibleComments();
    }
  }

  goToCommentsPage(page: number) {
    this.commentsPage = page;
    this.updateVisibleComments();
  }
  get commentsPageNumbers(): number[] {
    const total = this.commentsTotalPages;
    return Array(total).fill(0).map((x, i) => i + 1);
  }

  get commentsTotalPages(): number {
    return Math.ceil(this.allUserComments.length / this.commentsPageSize);
  }
}