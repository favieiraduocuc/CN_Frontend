import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Search,
  Bus,
  ChevronRight,
  Save,
  User,
  Trash2,
  Plus,
} from 'lucide-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Bus {
  id: string;
  name: string;
  driver: string;
  driverId: string;
  type: 'ontime' | 'delayed' | 'warning';
  lat: number;
  lng: number;
  status: string;
}

@Component({
  selector: 'app-bus-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './bus-admin.component.html',
  styleUrls: ['./bus-admin.component.css'],
})
export class BusAdminComponent implements OnInit {
  userAccount: AccountInfo | null = null;
  idTokenClaims: any = null;
  rawIdToken: string = '';
  accessToken: string = '';

  searchQuery: string = '';
  isEditing: boolean = false;
  readonly BusIcon = Bus;
  readonly ChevronRightIcon = ChevronRight;
  readonly SaveIcon = Save;
  readonly UserIcon = User;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;

  private authService = inject(MsalService);
  private router = inject(Router);
  private http = inject(HttpClient);

  buses: Bus[] = [
    {
      id: '506',
      name: 'Grecia / Maipú',
      driver: 'Daniel Diaz',
      driverId: 'DD-2026',
      type: 'ontime',
      lat: -33.457,
      lng: -70.605,
      status: 'Activo',
    },
    {
      id: '401',
      name: 'Providencia / Las Condes',
      driver: 'Juan Pérez',
      driverId: 'JP-1102',
      type: 'delayed',
      lat: -33.437,
      lng: -70.634,
      status: 'Retrasado',
    },
  ];

  // Objeto vinculado al formulario
  currentBus: Bus = this.getEmptyBus();

  get filteredBuses() {
    return this.buses.filter(
      (b) =>
        b.id.includes(this.searchQuery) ||
        b.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }

  getEmptyBus(): Bus {
    return {
      id: '',
      name: '',
      driver: '',
      driverId: '',
      type: 'ontime',
      lat: -33.448,
      lng: -70.669,
      status: 'Nuevo',
    };
  }

  // CREATE / UPDATE
  saveBus() {
    if (this.isEditing) {
      const index = this.buses.findIndex((b) => b.id === this.currentBus.id);
      this.buses[index] = { ...this.currentBus };
    } else {
      // Validar si el ID ya existe
      if (this.buses.find((b) => b.id === this.currentBus.id)) {
        alert('El ID del bus ya existe.');
        return;
      }
      this.buses.push({ ...this.currentBus });
    }
    this.resetForm();
  }

  // READ (Cargar en formulario)
  editBus(bus: Bus) {
    this.isEditing = true;
    this.currentBus = { ...bus };
  }

  // DELETE
  deleteBus(id: string) {
    if (confirm(`¿Está seguro de eliminar el bus ${id}?`)) {
      this.buses = this.buses.filter((b) => b.id !== id);
      if (this.currentBus.id === id) this.resetForm();
    }
  }

  resetForm() {
    this.isEditing = false;
    this.currentBus = this.getEmptyBus();
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

  ngOnInit(): void {
    this.loadUserInfo();
  }
}
