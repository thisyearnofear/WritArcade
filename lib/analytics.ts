export type AnalyticsEventName =
  | 'article_preview_started'
  | 'article_preview_succeeded'
  | 'article_preview_failed'
  | 'game_mode_selected'
  | 'payment_path_selected'
  | 'payment_started'
  | 'payment_succeeded'
  | 'game_generated'
  | 'play_clicked'
  | 'ownership_clicked'
  | 'share_clicked'

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>
  gtag?: (command: 'event', eventName: string, properties?: AnalyticsProperties) => void
  plausible?: (eventName: string, options?: { props?: AnalyticsProperties }) => void
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

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', eventName, cleanProperties)
  }
}
