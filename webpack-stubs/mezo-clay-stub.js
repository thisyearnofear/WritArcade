/**
 * React 19 compatibility stub for @mezo-org/mezo-clay.
 *
 * mezo-clay bundles baseui + styletron-react, which use React 18 internals
 * (__SECRET_INTERNALS.ReactCurrentOwner) and trigger "Rendered more hooks
 * than during the previous render" (React #310) under React 19's concurrent
 * renderer.
 *
 * This stub re-exports every symbol that @mezo-org/passport's UI components
 * reference, but each export is a harmless no-op or passthrough. The app
 * never renders passport's Dropdown/ConnectedTrigger/etc — it uses its own
 * UserMenu — so these stubs are never actually called at runtime.
 */

import React from 'react';

// ── Generic passthrough component ────────────────────────────────────────
function Passthrough(props) {
  return React.createElement('div', props, props.children);
}
Passthrough.displayName = 'MezoClayStub';

// ── Stub for useStyletron (the hook that crashes in React 19) ───────────
export function useStyletron() {
  const noop = {};
  return [noop, noop];
}

// ── Layout primitives ───────────────────────────────────────────────────
export const Block = Passthrough;
export const StyledRoot = Passthrough;

// ── Typography ──────────────────────────────────────────────────────────
export const HeadingSmall = Passthrough;
export const HeadingMedium = Passthrough;
export const LabelLarge = Passthrough;
export const LabelMedium = Passthrough;
export const LabelSmall = Passthrough;
export const LabelXSmall = Passthrough;
export const MonoLabelXSmall = Passthrough;
export const ParagraphSmall = Passthrough;

// ── Buttons / Inputs ────────────────────────────────────────────────────
export const Button = Passthrough;
export const ButtonIcon = Passthrough;
export const Input = Passthrough;

// ── Icons ───────────────────────────────────────────────────────────────
export const ArrowLeft = Passthrough;
export const ArrowNarrowLeft = Passthrough;
export const Check = Passthrough;
export const Close = Passthrough;
export const CoinsStacked02 = Passthrough;
export const InfoCircle = Passthrough;
export const LogIn01 = Passthrough;
export const LogOut01 = Passthrough;
export const Settings01 = Passthrough;

// ── Brand icons ─────────────────────────────────────────────────────────
export const BitcoinCircle = Passthrough;
export const EthCircle = Passthrough;
export const MezoCircle = Passthrough;
export const MUsdCircle02 = Passthrough;
export const Mats = Passthrough;

// ── Feedback / Overlay ──────────────────────────────────────────────────
export const Skeleton = Passthrough;
export const Spinner = Passthrough;
export const Link = Passthrough;
export const Icon = Passthrough;

// ── Popover (used by Dropdown) ──────────────────────────────────────────
export const StatefulPopover = Passthrough;

// ── Utilities ───────────────────────────────────────────────────────────
export function mergeOverrides(base, overrides) {
  return { ...base, ...overrides };
}

export function getOverrides(Component, StyledComponent) {
  return [StyledComponent, {}];
}

// ── Type aliases (runtime no-ops for TS type re-exports) ────────────────
// These are only used in .d.ts files; the runtime stubs above cover them.
