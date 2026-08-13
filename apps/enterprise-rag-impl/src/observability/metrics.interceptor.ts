import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, type Observable, tap } from 'rxjs';
import { httpDuration, httpRequests } from './metrics';
/** Labels are static Nest handler names, never tenant IDs, URLs, prompts or user identifiers. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.switchToHttp().getRequest<{ method: string }>();
    const method = request.method ?? 'UNKNOWN',
      handler = ctx.getHandler().name;
    const end = httpDuration.startTimer({ method, handler });
    return next.handle().pipe(
      tap(() => {
        end();
        httpRequests.inc({ method, handler, outcome: 'success' });
      }),
      catchError((error) => {
        end();
        const status = error instanceof HttpException ? error.getStatus() : 500;
        httpRequests.inc({ method, handler, outcome: status >= 500 ? 'server_error' : 'client_error' });
        throw error;
      }),
    );
  }
}
