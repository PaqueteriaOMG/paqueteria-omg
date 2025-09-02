import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const cloned = token ? req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true
  }) : req.clone({ withCredentials: true });

  return next(cloned).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 419)) {
        return auth.refresh().pipe(
          switchMap(newToken => {
            if (newToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
                withCredentials: true
              });
              return next(retryReq);
            }
            // Si no se pudo refrescar, cerrar sesión y redirigir
            auth.logout().subscribe({ complete: () => router.navigate(['/login']) });
            return throwError(() => error);
          }),
          catchError(() => {
            auth.logout().subscribe({ complete: () => router.navigate(['/login']) });
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};