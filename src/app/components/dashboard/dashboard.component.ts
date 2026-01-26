import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { LucideAngularModule, ChevronDown, LogOut, Bus } from 'lucide-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { VehicleService } from '../../services/vehicles/vehicle.service';
import { Vehicle, VehicleStatus } from '../../models/vehicle.model';

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

  readonly ChevronDownIcon = ChevronDown;
  readonly LogOutIcon = LogOut;
  readonly BusIcon = Bus;

  private authService = inject(MsalService);
  private router = inject(Router);
  private vehicleService = inject(VehicleService);
  private cdr = inject(ChangeDetectorRef);

  isProfileOpen = false;
  fullName: string = '';

  lines: Vehicle[] = [];

  selectedBus: any;

  ngOnInit() {
    this.loadUserInfo();
    this.loadVehicles();
  }

  async loadVehicles(): Promise<void> {
    this.vehicleService.getAll().subscribe({
      next: (response) => {
        if (response) {
          this.lines = response;
          console.log('Vehículos cargados:', this.lines);

          if (this.map) {
            this.renderMarkers();
            this.map.invalidateSize();
          }

          if (this.lines.length > 0) {
            this.selectLine(this.lines[0]);
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar vehículos:', err);
        this.authService.logoutRedirect({
          postLogoutRedirectUri: 'http://localhost:4200',
        });
      },
    });
  }

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

    setTimeout(() => {
      this.map.invalidateSize();
      this.cdr.detectChanges();
    }, 100);
  }

  loadUserInfo(): void {
    const activeAccount = this.authService.instance.getActiveAccount();
    const account =
      activeAccount || this.authService.instance.getAllAccounts()[0];

    if (account) {
      this.userAccount = account;
      this.authService.instance.setActiveAccount(account);
      this.idTokenClaims = account.idTokenClaims;

      if (this.idTokenClaims) {
        this.fullName =
          this.idTokenClaims.name ||
          `${this.idTokenClaims.given_name} ${this.idTokenClaims.family_name}`;
      }
      this.getAccessToken();
    } else {
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
          console.log('Scopes:', result.scopes);
          console.log('Expires in:', result.expiresOn);
        },
        error: (error) => {
          console.error('Error getting access token:', error);

          this.authService.logoutRedirect({
            postLogoutRedirectUri: 'http://localhost:4200',
          });
        },
      });
  }

  private renderMarkers() {
    if (!this.map || !this.lines.length) return;

    // Limpiar marcadores antiguos si existen
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];

    this.lines.forEach((line) => {
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
        <div class="marker-wrapper">
          <div class="bus-label">${line.id}</div>
          <div class="bus-icon-container ${line.status}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-bus"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>
          </div>
        </div>
      `,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });

      const marker = L.marker([line.latitude, line.longitude], {
        icon: customIcon,
      })
        .addTo(this.map)
        .on('click', () => this.selectLine(line));

      this.markers.push(marker);
    });
  }

  get filteredLines() {
    return this.lines.filter((line) => {
      const matchesSearch =
        line.lineName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        line.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesFilter =
        this.activeFilter === 'Todos' ||
        (this.activeFilter === 'En Servicio' &&
          line.status === VehicleStatus.IN_SERVICE) ||
        (this.activeFilter === 'En Mantenimiento' &&
          line.status === VehicleStatus.MAINTENANCE) ||
        (this.activeFilter === 'Activo' &&
          line.status === VehicleStatus.ACTIVE) ||
        (this.activeFilter === 'Offline' &&
          line.status === VehicleStatus.OFFLINE);
      return matchesSearch && matchesFilter;
    });
  }

  selectLine(line: Vehicle) {
    this.selectedBus = {
      ...line,
      route: line.lineName,
      driver: 'Daniel',
      driverId: 'DS-2026',
      shiftEnd: '3h',
      speed: Math.floor(Math.random() * 100),
      load: Math.floor(Math.random() * 100),
      progress: Math.floor(Math.random() * 100),
    };

    this.map.flyTo([line.latitude, line.longitude], 15);
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

  goToBusAdmin() {
    this.router.navigate(['/bus-admin']);
  }

  logout(): void {
    this.authService.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200',
    });
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
