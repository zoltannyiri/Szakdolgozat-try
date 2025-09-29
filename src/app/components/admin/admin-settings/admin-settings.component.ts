import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, CreditConfigDto } from '../../../services/admin.service';


@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent {
  form: CreditConfigDto = {
    initialCreditsForNewUser: 0,
    bonusOnVerify: 2,
    creditsPerApprovedUpload: 2,
    downloadCost: 1,
    rewardPerDownloadToUploader: 0,
  };
  loading = false;
  saving = false;
  saved = false;


  constructor(private admin: AdminService) { this.load(); }


  load() {
    this.loading = true; this.saved = false;
    this.admin.getCreditConfig().subscribe({
      next: (res) => { if (res?.data) this.form = { ...res.data } as any; },
      error: (e) => console.error(e),
      complete: () => this.loading = false
    });
  }


  save() {
    this.saving = true; this.saved = false;
    this.admin.updateCreditConfig(this.form).subscribe({
      next: () => { this.saved = true; },
      error: (e) => console.error(e),
      complete: () => this.saving = false
    });
  }
}