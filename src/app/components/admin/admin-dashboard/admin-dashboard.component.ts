import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Router, RouterModule } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  NgApexchartsModule
} from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, NgApexchartsModule],
  standalone: true,
  styleUrls: ['./admin-dashboard.component.scss']
})


export class AdminDashboardComponent implements OnInit {
  stats = {
    users: 0,
    loops: 0,
    comments: 0,
    downloads: 0,
    likes: 0
  };

  public chartOptions: ChartOptions = {

    series: [
      {
        name: 'Loop feltöltések',
        data: [5, 10, 3, 8, 12, 7, 4] // Demo adat, később backendből
      }
    ],
    chart: {
      type: 'line',
      height: 300
    },
    title: {
      text: 'Heti loop feltöltések (demo)',
      align: 'left'
    },
    xaxis: {
      categories: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
    }
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
  const token = localStorage.getItem('token');

  // Összesített statisztikák
  this.http.get<any>(`${environment.apiUrl}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).subscribe({
    next: (res) => {
      if (res.success) {
        this.stats = res.data;
      }
    },
    error: (err) => {
      console.error('Statisztika hiba:', err);
    }
  });

  // Heti feltöltések
  this.http.get<any>(`${environment.apiUrl}/api/admin/stats/weekly-uploads`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).subscribe({
    next: (res) => {
      if (res.success) {
        const uploads = res.data;

        this.chartOptions = {
          series: [
            {
              name: 'Loop feltöltések',
              data: Object.values(uploads).map(val => Number(val))
            }
          ],
          chart: {
            type: 'line',
            height: 300
          },
          title: {
            text: 'Heti loop feltöltések',
            align: 'left'
          },
          xaxis: {
            categories: Object.keys(uploads).map(d => this.formatDateLabel(d))
          }
        };
      }
    },
    error: (err) => {
      console.error('Heti statisztika hiba:', err);
    }
  });
}

// Pl. "2025-06-14" -> "Jún 14"
formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('hu-HU', {
    month: 'short',
    day: 'numeric'
  });
}


  goTo(section: 'users' | 'loops' | 'comments') {
    this.router.navigate([`/admin/${section}`]);
  }
} 