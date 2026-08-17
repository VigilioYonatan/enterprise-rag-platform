import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';

export const problemErrorResponseDto = z.object({
  code: z.string(),
  message: z.string(),
  issues: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

/** Schema comes from the endpoint owner's Zod DTO; never maintain another handwritten copy. */
function jsonSchema(schema: z.ZodType, io: 'input' | 'output'): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  });
  const { $schema: ignored, ...rest } = json as Record<string, unknown>;
  void ignored;
  return rest;
}

export function ApiZodBody(schema: z.ZodType) {
  return ApiBody({ schema: jsonSchema(schema, 'input') as never });
}

export function ApiZodQuery(schema: z.ZodType) {
  const json = jsonSchema(schema, 'input') as {
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
  const properties = json.properties || {};
  const requiredList = json.required || [];
  const decorators = Object.entries(properties).map(([name, prop]) => {
    const isRequired = requiredList.includes(name);
    const type = prop.type === 'integer' || prop.type === 'number' ? Number : String;
    return ApiQuery({ name, required: isRequired, type });
  });
  return applyDecorators(...decorators);
}

export function ApiZodOk(schema: z.ZodType, description = 'Authorized response') {
  return ApiOkResponse({ description, schema: jsonSchema(schema, 'output') as never });
}

export function ApiZodCreated(schema: z.ZodType, description = 'Resource created') {
  return ApiCreatedResponse({ description, schema: jsonSchema(schema, 'output') as never });
}

export function ApiZodStandardErrors() {
  const errorSchema = jsonSchema(problemErrorResponseDto, 'output') as never;
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Invalid input payload or query parameter', schema: errorSchema }),
    ApiUnauthorizedResponse({ description: 'Missing, invalid or expired OIDC JWT', schema: errorSchema }),
    ApiForbiddenResponse({
      description: 'Authenticated actor lacks tenant or document permission',
      schema: errorSchema,
    }),
    ApiNotFoundResponse({
      description: 'Resource does not exist or is invisible under RLS',
      schema: errorSchema,
    }),
    ApiConflictResponse({ description: 'State conflict or duplicate resource', schema: errorSchema }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit or daily tenant FinOps budget exhausted',
      schema: errorSchema,
    }),
  );
}
