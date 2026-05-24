type MarketingEventName =
  | "page_view"
  | "cta_click"
  | "demo_request"
  | "newsletter_signup"
  | "contact_sales"
  | "feature_explored"
  | "pricing_toggle"
  | "roi_calculated"
  | "scroll_depth";

type MarketingEventProperties = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, eventName: string, params?: MarketingEventProperties) => void;
    hj?: (command: string, eventName: string, params?: MarketingEventProperties) => void;
  }
}

export function trackMarketingEvent(
  name: MarketingEventName,
  properties: MarketingEventProperties = {},
) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: name,
    ...properties,
  });

  window.gtag?.("event", name, properties);
  window.hj?.("event", name, properties);
}
