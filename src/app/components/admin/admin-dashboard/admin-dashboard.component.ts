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
  colors?: string[];
  stroke?: any;
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
    likes: 0,
    activeUsers: 0
  };

  public chartOptions: ChartOptions = {
    series: [
      {
        name: 'Loop feltöltések',
        data: [5, 10, 3, 8, 12, 7, 4]
      }
    ],
    chart: {
      type: 'line',
      height: 300,
      foreColor: '#94a3b8',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      background: 'transparent'
    },
    title: {
      text: '',
      align: 'left'
    },
    xaxis: {
      categories: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
      labels: {
        style: {
          colors: '#94a3b8'
        }
      }
    },
    colors: ['#f59e0b'],
    stroke: {
      curve: 'smooth',
      width: 3
    }
  };

  public userChartOptions: ChartOptions = {
    series: [{
      name: 'Új regisztrációk',
      data: [3, 7, 2, 5, 8, 4, 6]
    }],
    chart: {
      type: 'line',
      height: 300,
      foreColor: '#94a3b8',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      background: 'transparent'
    },
    title: {
      text: '',
      align: 'left'
    },
    xaxis: {
      categories: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
      labels: {
        style: {
          colors: '#94a3b8'
        }
      }
    },
    colors: ['#3b82f6'],
    stroke: {
      curve: 'smooth',
      width: 3
    }
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
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
          this.chartOptions.series = [{
            name: 'Loop feltöltések',
            data: Object.values(uploads).map(val => Number(val))
          }];
          this.chartOptions.xaxis = {
            categories: Object.keys(uploads).map(d => this.formatDateLabel(d)),
            labels: {
              style: {
                colors: '#94a3b8'
              }
            }
          };
        }
      },
      error: (err) => {
        console.error('Heti statisztika hiba:', err);
      }
    });

    // Heti regisztrációk
    this.http.get<any>(`${environment.apiUrl}/api/admin/stats/weekly-registrations`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          const reg = res.data;
          this.userChartOptions.series = [{
            name: 'Új regisztrációk',
            data: Object.values(reg).map(val => Number(val))
          }];
          this.userChartOptions.xaxis = {
            categories: Object.keys(reg).map(d => this.formatDateLabel(d)),
            labels: {
              style: {
                colors: '#94a3b8'
              }
            }
          };
        }
      },
      error: (err) => {
        console.error('Heti regisztráció statisztika hiba:', err);
      }
    });
  }

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

  refreshData() {
    this.loadStats();
    console.log('Adatok frissítve');
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'upload': 'bi bi-music-note-beamed',
      'user': 'bi bi-person-plus',
      'comment': 'bi bi-chat-dots',
      'download': 'bi bi-download'
    };
    return icons[type] || 'bi bi-activity';
  }
}