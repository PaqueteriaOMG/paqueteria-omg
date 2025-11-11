import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

export const canActivateAdmin: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user$.pipe(
    map(u => {
      if (!u || u.rol !== 'admin') {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};