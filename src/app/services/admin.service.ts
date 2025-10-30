import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';


export interface CreditConfigDto {
    initialCreditsForNewUser: number;
    bonusOnVerify: number;
    creditsPerApprovedUpload: number;
    downloadCost: number;
    rewardPerDownloadToUploader: number;
}


@Injectable({ providedIn: 'root' })
export class AdminService {
    private base = `${environment.apiUrl}/api/admin`;
    constructor(private http: HttpClient) { }
    getCreditConfig() {
        return this.http.get<{ success: boolean; data: CreditConfigDto }>(`${this.base}/credit-config`);
    }
    updateCreditConfig(payload: Partial<CreditConfigDto>) {
        return this.http.patch<{ success: boolean; data: CreditConfigDto }>(`${this.base}/credit-config`, payload);
    }
}