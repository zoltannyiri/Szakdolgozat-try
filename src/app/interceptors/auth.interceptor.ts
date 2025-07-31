import { HttpInterceptorFn } from "@angular/common/http";
import { AuthService } from "../services/auth.service";
import { inject } from "@angular/core";




export const authInterceptor: HttpInterceptorFn = (req, next) => {

    const authService = inject(AuthService);

    const authToken = authService.getToken();
     console.log('[authInterceptor] Eredeti kérés URL:', req.url);
  console.log('[authInterceptor] Token:', authToken);
    
    if(authToken) {
        const authReq = req.clone({
            headers: req.headers.set('Authorization', 'Bearer '+authToken)
        });
         console.log('[authInterceptor] Authorization fejléc hozzáadva:', authReq.headers.get('Authorization'));
        return next(authReq);
    }
      console.warn('[authInterceptor] Nincs token, változtatás nélküli kérés megy tovább.');
    return next(req);
};