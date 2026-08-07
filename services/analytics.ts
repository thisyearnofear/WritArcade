export type AnalyticsEventName =
  | 'article_preview_started'
  | 'article_preview_succeeded'
  | 'article_preview_failed'
  | 'game_mode_selected'
  | 'payment_path_selected'
  | 'payment_path_advanced_opened'
  | 'payment_path_auto_detected'
  | 'payment_path_user_override'
  | 'payment_wallet_connect_prompt_shown'
  | 'payment_wallet_connected'
  | 'payment_abandoned_before_wallet_connect'
  | 'payment_abandoned_after_wallet_connect'
  | 'payment_network_switch_prompt_shown'
  | 'payment_network_switch_started'
  | 'payment_network_switch_succeeded'
  | 'payment_network_switch_failed'
  | 'payment_network_switch_abandoned'
  | 'payment_started'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'game_generated'
  | 'game_generation_failed'
  | 'play_clicked'
  | 'panel_completed'
  | 'choice_made'
  | 'story_completed'
  | 'epilogue_opened'
  | 'epilogue_completed'
  | 'epilogue_failed'
  | 'view_comic_clicked'
  | 'share_clicked'
  | 'make_another_clicked'
  | 'ownership_clicked'

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>
  gtag?: (command: 'event', eventName: string, properties?: AnalyticsProperties) => void
  plausible?: (eventName: string, options?: { props?: AnalyticsProperties }) => void
  posthog?: {
    capture?: (eventName: string, properties?: AnalyticsProperties) => void
  }
  analytics?: {
    track?: (eventName: string, properties?: AnalyticsProperties) => void
  }
}

export function trackEvent(eventName: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined') return

  const analyticsWindow = window as AnalyticsWindow
  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as AnalyticsProperties

  analyticsWindow.gtag?.('event', eventName, cleanProperties)
  analyticsWindow.plausible?.(eventName, { props: cleanProperties })
  analyticsWindow.dataLayer?.push({ event: eventName, ...cleanProperties })
  analyticsWindow.posthog?.capture?.(eventName, cleanProperties)
  analyticsWindow.analytics?.track?.(eventName, cleanProperties)

  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics'
  const payload = JSON.stringify({
    event: eventName,
    properties: cleanProperties,
    path: window.location.pathname,
    ts: new Date().toISOString(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Analytics must never block the product flow.
    })
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', eventName, cleanProperties)
  }
}
