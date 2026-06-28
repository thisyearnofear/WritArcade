/**
 * Standardized API Response Helpers
 *
 * Single source of truth for API route response shapes.
 * Use these in every route handler instead of raw NextResponse.json() calls.
 *
 * Patterns:
 *   - ok(data)         → { success: true, data }
 *   - fail(msg, status) → { error: msg }  (with status code)
 *   - paginated(items, total, limit, offset) → { success: true, data: items, pagination: {...} }
 */

import { NextResponse } from 'next/server'

/**
 * Successful response wrapper
 *
 * Returns `{ success: true, data }` with a 200 status by default.
 * Pass a second argument to override the status (e.g. 201 for created).
 */
export function ok<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response wrapper
 *
 * Returns `{ error: message }` with a 4xx/5xx status.
 * status defaults to 400. Optionally include `details` for validation errors.
 */
export function fail(
  message: string,
  status: number = 400,
  details?: string[],
): NextResponse {
  const body: Record<string, unknown> = { error: message }
  if (details && details.length > 0) {
    body.details = details
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
