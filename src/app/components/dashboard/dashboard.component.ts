import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { LucideAngularModule } from 'lucide-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  userAccount: AccountInfo | null = null;
  idTokenClaims: any = null;
  rawIdToken: string = '';
  accessToken: string = '';

  searchQuery: string = '';
  activeFilter: string = 'Todos';
  private map!: L.Map;
  private markers: L.Marker[] = [];

  private authService = inject(MsalService);
  private router = inject(Router);
  private http = inject(HttpClient);

  lines = [
    {
      id: '506',
      name: '506 - Grecia / Maipú',
      status: 'Retrasado (+5m)',
      type: 'delayed',
      icon: '🚌',
      lat: -33.457,
      lng: -70.605,
      speed: '22 km/h',
      load: '85%',
    },
    {
      id: '401',
      name: '401 - Providencia / Las Condes',
      status: 'A Tiempo',
      type: 'ontime',
      icon: '🚌',
      lat: -33.4372,
      lng: -70.6341,
      speed: '35 km/h',
      load: '40%',
    },
    {
      id: '210',
      name: '210 - Alameda / Est. Central',
      status: 'A Tiempo',
      type: 'ontime',
      icon: '🚌',
      lat: -33.4513,
      lng: -70.6785,
      speed: '28 km/h',
      load: '90%',
    },
    {
      id: 'B27',
      name: 'B27 - Vespucio Norte',
      status: 'Tráfico Lento',
      type: 'warning',
      icon: '🚌',
      lat: -33.385,
      lng: -70.632,
      speed: '12 km/h',
      load: '30%',
    },
  ];

  selectedBus: any = {
    ...this.lines[0],
    route: this.lines[0].name,
    driver: 'Daniel',
    driverId: 'DS-2026',
    shiftEnd: '3h',
    progress: Math.floor(Math.random() * 100),
  };

  ngOnInit() {}

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [-33.4489, -70.6693],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; BtrackUS',
      },
    ).addTo(this.map);

    this.renderMarkers();
  }

  loadUserInfo(): void {
    try {
      const accounts = this.authService.instance.getAllAccounts();
      if (accounts.length > 0) {
        this.userAccount = accounts[0];
        console.log('Cargando usuario:', this.userAccount);
        this.authService.instance.setActiveAccount(this.userAccount);
        console.log(
          'Usuario activo:',
          this.authService.instance.getActiveAccount(),
        );
        this.idTokenClaims = this.userAccount.idTokenClaims;

        const activeAccount = this.authService.instance.getActiveAccount();
        if (activeAccount) {
          this.rawIdToken = (activeAccount as any).idToken || '';
        }

        console.log('Usuario cargado:', this.userAccount);
        console.log('ID Token Claims:', this.idTokenClaims);
        this.getAccessToken();
      } else {
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
      this.router.navigate(['/']);
    }
  }

  getAccessToken(): void {
    this.authService
      .acquireTokenSilent({
        scopes: [environment.msalClientId],
        account: this.userAccount!,
      })
      .subscribe({
        next: (result: AuthenticationResult) => {
          this.accessToken = result.accessToken;
          console.log('Access Token obtenido:', this.accessToken);
          console.log('Scopes:', result.scopes);
          console.log('Expira en:', result.expiresOn);
        },
        error: (error) => {
          console.error('Error al obtener access token:', error);

          // Intentar con login interactivo si falla el silencioso
          this.authService.acquireTokenRedirect({
            scopes: [environment.msalClientId],
          });
        },
      });
  }

  private renderMarkers() {
    this.lines.forEach((line) => {
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
        <div class="marker-wrapper">
          <div class="bus-label">${line.id}</div>
          <div class="bus-icon-container ${line.type}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>
          </div>
        </div>
      `,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });

      L.marker([line.lat, line.lng], { icon: customIcon })
        .addTo(this.map)
        .on('click', () => this.selectLine(line));
    });
  }

  get filteredLines() {
    return this.lines.filter((line) => {
      const matchesSearch =
        line.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        line.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesFilter =
        this.activeFilter === 'Todos' ||
        (this.activeFilter === 'Retrasado' && line.type === 'delayed') ||
        (this.activeFilter === 'A Tiempo' && line.type === 'ontime');
      return matchesSearch && matchesFilter;
    });
  }

  selectLine(line: any) {
    this.selectedBus = {
      ...line,
      route: line.name,
      driver: 'Daniel',
      driverId: 'DS-2026',
      shiftEnd: '3h',
      progress: Math.floor(Math.random() * 100),
    };

    this.map.flyTo([line.lat, line.lng], 15);
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  zoomIn() {
    this.map.zoomIn();
  }
  zoomOut() {
    this.map.zoomOut();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
