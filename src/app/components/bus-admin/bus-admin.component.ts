import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  LucideAngularModule,
  Search,
  Bus,
  ChevronRight,
  Save,
  User,
  Trash2,
  Plus,
  ChevronDown,
  LogOut,
} from 'lucide-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Vehicle, VehicleStatus } from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicles/vehicle.service';

@Component({
  selector: 'app-bus-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ReactiveFormsModule,
  ],
  templateUrl: './bus-admin.component.html',
  styleUrls: ['./bus-admin.component.css'],
})
export class BusAdminComponent implements OnInit {
  busForm!: FormGroup;
  private fb = inject(FormBuilder);

  userAccount: AccountInfo | null = null;
  idTokenClaims: any = null;
  rawIdToken: string = '';
  accessToken: string = '';

  fullName: string = '';
  isProfileOpen: boolean = false;

  searchQuery: string = '';
  isEditing: boolean = false;
  readonly BusIcon = Bus;
  readonly ChevronRightIcon = ChevronRight;
  readonly SaveIcon = Save;
  readonly UserIcon = User;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly ChevronDownIcon = ChevronDown;
  readonly LogOutIcon = LogOut;

  private authService = inject(MsalService);
  private router = inject(Router);
  private vehicleService = inject(VehicleService);

  buses: Vehicle[] = [];

  // Objeto vinculado al formulario
  currentBus: Vehicle = this.getEmptyBus();

  get filteredBuses() {
    return this.buses.filter(
      (b) =>
        b.id.toString().includes(this.searchQuery) ||
        b.lineName.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }

  getEmptyBus(): Vehicle {
    return {
      id: '',
      plate: '',
      lineName: '',
      latitude: -33.448,
      longitude: -70.669,
      status: VehicleStatus.ACTIVE,
    };
  }

  saveBus() {
    if (this.busForm.invalid) {
      console.log('form invalid');
      this.busForm.markAllAsTouched();
      return;
    }

    const busData: Vehicle = this.busForm.getRawValue();

    if (this.isEditing) {
      const index = this.buses.findIndex((b) => b.id === busData.id);
      this.vehicleService
        .update(Number(busData.id), busData)
        .subscribe((bus) => {
          this.buses[index] = busData;
        });
    } else {
      if (this.buses.find((b) => b.id === busData.id)) {
        alert('El ID del bus ya existe.');
        return;
      }
      this.vehicleService.create(busData).subscribe((bus) => {
        this.buses.push(bus);
      });
    }
    this.resetForm();
  }

  editBus(bus: Vehicle) {
    this.isEditing = true;
    this.busForm.patchValue(bus);
    this.busForm.get('id')?.disable();
    this.busForm.get('plate')?.disable();
  }

  deleteBus(id: string) {
    const confirmDelete = confirm(`¿Está seguro de eliminar el bus ${id}?`);
    console.log('confirmDelete', confirmDelete);
    if (confirmDelete) {
      this.vehicleService.delete(Number(id)).subscribe(() => {
        this.resetForm();
        this.buses = this.buses.filter((b) => b.id !== id);
      });
    }
  }

  resetForm() {
    this.isEditing = false;

    this.busForm.get('id')?.enable();
    this.busForm.get('plate')?.enable();

    this.busForm.reset({
      id: '',
      plate: '',
      lineName: '',
      status: VehicleStatus.ACTIVE,
      latitude: -33.448,
      longitude: -70.669,
    });
  }

  loadUserInfo(): void {
    try {
      const accounts = this.authService.instance.getAllAccounts();
      if (accounts.length > 0) {
        this.userAccount = accounts[0];
        this.authService.instance.setActiveAccount(this.userAccount);
        this.idTokenClaims = this.userAccount.idTokenClaims;

        const activeAccount = this.authService.instance.getActiveAccount();
        if (activeAccount) {
          this.rawIdToken = (activeAccount as any).idToken || '';
        }

        console.log('Usuario cargado:', this.userAccount);
        console.log('ID Token Claims:', this.idTokenClaims);

        if (this.idTokenClaims) {
          this.fullName =
            this.idTokenClaims.given_name +
            ' ' +
            this.idTokenClaims.family_name;
        }
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
          console.log('Scopes:', result.scopes);
          console.log('Expira en:', result.expiresOn);
        },
        error: (error) => {
          console.error('Error al obtener access token:', error);

          this.authService.logoutRedirect({
            postLogoutRedirectUri: 'http://localhost:4200',
          });
        },
      });
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout(): void {
    this.authService.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200',
    });
  }

  loadBuses(): void {
    this.vehicleService.getAll().subscribe({
      next: (response) => {
        if (response) {
          this.buses = response;
          console.log('Vehículos cargados:', response);
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

  initForm() {
    this.busForm = this.fb.group({
      id: [''],
      plate: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{2,4}-?[0-9]{2,4}$/i)],
      ],
      lineName: ['', [Validators.required]],
      status: [VehicleStatus.ACTIVE, [Validators.required]],
      latitude: [-33.448],
      longitude: [-70.669],
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.getAccessToken();
    this.loadBuses();
    this.initForm();
  }
}
