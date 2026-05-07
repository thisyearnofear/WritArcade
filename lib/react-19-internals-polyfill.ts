/**
 * React 19 __SECRET_INTERNALS polyfill for baseui / @mezo-org/mezo-clay
 *
 * React 19 removed `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` and
 * replaced it with `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`.
 * The new internals object no longer has `ReactCurrentOwner` or
 * `ReactDebugCurrentFrame` properties that baseui (bundled inside
 * @mezo-org/mezo-clay) relies on.
 *
 * This polyfill must run BEFORE any mezo-clay/baseui code evaluates.
 * Import it at the top of the dynamic-import boundary (ClientProvidersLoader)
 * so webpack evaluates it as a static import before the dynamic import resolves.
 *
 * ⚠ Limitation: ReactCurrentOwner.current is shimmed as a static `{ current: null }`
 * rather than being wired into React 19's reconciler.  In React 18 the reconciler
 * updated this ref on every render; our shim always returns null.  This is fine for
 * production (owner tracking is only used for dev-mode component stack traces), but
 * it means dev-mode stack traces from baseui components will be incomplete.
 */

import React from 'react';

// Type-level shim: React 19 replaced __SECRET_INTERNALS with __CLIENT_INTERNALS
// but @types/react only knows about the old API.  Cast once to avoid
// repeated `as unknown as Record<…>` noise.
const R = React as Record<string, unknown>;

if (typeof window !== 'undefined') {
  if (!R.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    // Shim the old __SECRET_INTERNALS shape that baseui expects.
    // ReactCurrentOwner is a ref-like object { current: null } used by
    // baseui's jsx() clone-element helper to tag element owners.
    // ReactDebugCurrentFrame provides stack-trace helpers for dev warnings.
    const internals: Record<string, unknown> = {
      ReactCurrentOwner: { current: null },
      ReactDebugCurrentFrame: {
        getCurrentStack: () => '',
        getStackAddendum: () => '',
        setExtraStackFrame: () => {},
      },
    };

    // Forward any overlapping properties from the new __CLIENT_INTERNALS
    // (actQueue, thrownErrors, etc.) so nothing is lost.
    const clientInternals = R.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as Record<string, unknown> | undefined;
    if (clientInternals) {
      for (const key of Object.keys(clientInternals)) {
        if (!(key in internals)) {
          internals[key] = clientInternals[key];
        }
      }
    }

    // Define the property as non-writable so nothing overwrites it
    Object.defineProperty(R, '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED', {
      value: internals,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

export {}; // ensures this is treated as a module
