import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        const refresh = auth.loadRefreshToken();
        if (refresh) {
          return auth.refresh(refresh).pipe(
            switchMap(r => {
              const retriedReq = req.clone({ setHeaders: { Authorization: `Bearer ${r.accessToken}` } });
              return next(retriedReq);
            }),
            catchError(() => { auth.logout(); return throwError(() => err); }),
          );
        }
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
