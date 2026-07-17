import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
export interface Actor {
  sub: string;
  email: string | null;
}
export interface ActorRequest {
  actor: Actor;
}
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor =>
    context.switchToHttp().getRequest<ActorRequest>().actor,
);
