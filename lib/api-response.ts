/**
 * Standardized API Response Helpers
 *
 * Single source of truth for API route response shapes.
 * Use these in every route handler instead of raw NextResponse.json() calls.
 *
 * Patterns:
 *   - ok(data)         → { success: true, data }
 *   - fail(msg, status) → { success: false, error: msg }  (with status code)
 *   - paginated(items, total, limit, offset) → { success: true, data: items, pagination: {...} }
 *
 * For routes that need auth + error handling boilerplate, use `apiHandler()`
 * which wraps the route fn with try/catch, Zod error formatting, and
 * consistent 500 responses.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

/**
 * Successful response wrapper
 *
 * Returns `{ success: true, data }` with a 200 status by default.
 * Pass a second argument to override the status (e.g. 201 for created).
 * Extra fields can be appended via the `extra` option.
 */
export function ok<T>(
  data: T,
  status: number = 200,
): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response wrapper
 *
 * Returns `{ success: false, error: message }` with a 4xx/5xx status.
 * status defaults to 400. Optionally include `details` for validation errors
 * and `code` for machine-readable error codes.
 */
export function fail(
  message: string,
  status: number = 400,
  options?: { details?: string[]; code?: string },
): NextResponse {
  const body: Record<string, unknown> = { success: false, error: message }
  if (options?.details && options.details.length > 0) {
    body.details = options.details
  }
  if (options?.code) {
    body.code = options.code
  }
  return NextResponse.json(body, { status })
}

/**
 * Not-found shorthand — convenience wrapper around fail().
 */
export function notFound(message: string = 'Resource not found'): NextResponse {
  return fail(message, 404)
}

/**
 * Unauthorized shorthand.
 */
export function unauthorized(message: string = 'Unauthorized'): NextResponse {
  return fail(message, 401)
}

/**
 * Forbidden shorthand.
 */
export function forbidden(message: string = 'Forbidden'): NextResponse {
  return fail(message, 403)
}

/**
 * Server error shorthand — logs the internal error and returns a safe user message.
 */
export function serverError(
  message: string,
  internalError?: unknown,
): NextResponse {
  if (internalError) {
    console.error('[API Error]', message, internalError)
  }
  return fail(message, 500)
}

/**
 * Paginated response wrapper
 *
 * Returns `{ success: true, data: items, pagination: { total, limit, offset, hasMore } }`.
 * Useful for list endpoints with cursor/offset pagination.
 */
export function paginated<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number = 0,
): NextResponse {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// apiHandler — route-level wrapper that standardises error handling
// ────────────────────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<Record<string, string>> }

type RouteHandler<C = RouteContext> = (
  request: NextRequest,
  context: C,
) => Promise<NextResponse | Response>

/**
 * Wrap a route handler with standard error handling:
 *  - ZodError → 400 with `details` array
 *  - HttpError → uses its status and message
 *  - Everything else → 500 with a safe message
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler(async (req, ctx) => {
 *   const actor = await getActor()
 *   ...
 *   return ok(data)
 * })
 * ```
 */
export function apiHandler<C = RouteContext>(
  handler: RouteHandler<C>,
): RouteHandler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Zod validation errors → 400
      if (error instanceof z.ZodError) {
        return fail(
          'Invalid request data',
          400,
          { details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) },
        )
      }

      // HttpError — caller controls status + code
      if (error instanceof HttpError) {
        return fail(error.message, error.status, { code: error.code })
      }

      // Unknown errors → 500 (log full error, return safe message)
      console.error('[apiHandler] Unhandled error:', error)
      const message = error instanceof Error ? error.message : 'Internal server error'
      return fail(message, 500)
    }
  }
}

/**
 * Throw an HttpError to short-circuit a route with a specific status code.
 *
 * ```ts
 * throw httpError(404, 'Game not found')
 * throw httpError(402, 'Payment required', 'PAYMENT_REQUIRED')
 * ```
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Convenience factory for throwing HttpErrors.
 */
export function httpError(
  status: number,
  message: string,
  code?: string,
): HttpError {
  return new HttpError(message, status, code)
}
