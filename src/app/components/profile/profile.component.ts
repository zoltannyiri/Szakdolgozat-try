import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../services/reports.service';

type ToastVariant = 'default' | 'success' | 'error';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
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

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private reportsSvc: ReportsService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const username = params.get('username');
      if (username) {
        this.secureGet(`${environment.apiUrl}/api/profile/${username}`).subscribe({
          next: (response: any) => this.hydrateUser(response.user),
          error: () => this.errorMessage = 'Could not load profile data'
        });
      } else {
        this.secureGet(`${environment.apiUrl}/api/profile`).subscribe({
          next: (response: any) => this.hydrateUser(response.user, true),
          error: () => this.errorMessage = 'Could not load profile data'
        });
      }
    });
  }

  private hydrateUser(user: any, self = false) {
    this.userData = user;
    this.isCurrentUser = self || this.authService.getUserId() === user?._id;
    this.originalAboutMe = user?.aboutMe || '';
    this.aboutMe = user?.aboutMe || '';
    this.fillGeneralForm();
  }

  /** --- UI helpers --- */
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

  startChatWithUser() {
    if (this.userData?._id) {
      this.router.navigate(['/chat'], { queryParams: { userId: this.userData._id } });
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

  /** --- avatar: click + drag&drop --- */
  onAvatarSelected(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (file) this.uploadAvatar(file);
  }

  @HostListener('document:drop', ['$event'])
  preventDocumentDropDefault(e: DragEvent) {
    // elkerülni, hogy a böngésző megnyisson képet
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

  /** --- HTTP helpers (token header) --- */
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

  ban(duration: '1d'|'1m'|'permanent') {
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



}
