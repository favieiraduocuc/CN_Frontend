import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import {
  AccountInfo,
  EventMessage,
  EventType,
  InteractionStatus,
} from '@azure/msal-browser';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private readonly _destroying$ = new Subject<void>();
  isLoggedIn = false;
  userAccount: AccountInfo | null = null;

  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private router = inject(Router);

  capabilities = [
    {
      icon: '📍',
      title: 'Rastreo en tiempo real',
      description:
        'Rastreo en tiempo real de vehículos con GPS, asegurando que siempre sepas dónde están tus activos.',
    },
    {
      icon: '🕒',
      title: 'Programación Inteligente',
      description:
        'Optimización de rutas y reducción de retrasos con planificación inteligente.',
    },
    {
      icon: '📊',
      title: 'Análisis de Datos',
      description:
        'Análisis de datos para obtener insights prácticos sobre el flujo de pasajeros y eficiencia para tomar decisiones operativas informadas.',
    },
  ];

  loginWithMicrosoft() {
    console.log('login with Microsoft...');
    this.authService.loginRedirect({
      scopes: ['openid', 'offline_access'],
    });
  }

  checkLoginStatus(): void {
    const accounts = this.authService.instance.getAllAccounts();
    this.isLoggedIn = accounts.length > 0;
    if (this.isLoggedIn) {
      this.userAccount = accounts[0];
      this.authService.instance.setActiveAccount(this.userAccount);
      console.log(
        'User authenticated:',
        this.userAccount?.name || this.userAccount?.username,
      );
      this.router.navigate(['/dashboard']);
    } else {
      console.log('No user authenticated');
    }
  }

  ngOnInit(): void {
    this.checkLoginStatus();

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.LOGIN_SUCCESS ||
            msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS,
        ),
        takeUntil(this._destroying$),
      )
      .subscribe((result: EventMessage) => {
        console.log('detected auth event:', result.eventType);
        this.checkLoginStatus();
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) => status === InteractionStatus.None,
        ),
        takeUntil(this._destroying$),
      )
      .subscribe(() => {
        this.checkLoginStatus();
      });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
