import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly _destroying$ = new Subject<void>();

  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);

  ngOnInit(): void {
    // initialize MSAL
    this.authService.instance.initialize().then(() => {
      // handle redirects after login
      this.authService.instance
        .handleRedirectPromise()
        .then((response) => {
          if (response) {
            console.log('Login successful:', response);
          }
        })
        .catch((error) => {
          console.error('Error in redirect:', error);
        });
    });

    // subscribe to changes in interaction state
    this.msalBroadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) => status === InteractionStatus.None,
        ),
        takeUntil(this._destroying$),
      )
      .subscribe(() => {
        // do something after interaction ends
      });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
