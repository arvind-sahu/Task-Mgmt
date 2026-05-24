import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

import { trackMarketingEvent } from "~/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;

export function MarketingAnalytics() {
  const router = useRouter();
  const firedDepths = useRef(new Set<number>());

  useEffect(() => {
    const trackPageView = (url: string) => {
      trackMarketingEvent("page_view", { path: url });
    };

    trackPageView(router.asPath);
    router.events.on("routeChangeComplete", trackPageView);
    return () => router.events.off("routeChangeComplete", trackPageView);
  }, [router.asPath, router.events]);

  useEffect(() => {
    const depths = [25, 50, 75, 100];
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const currentDepth = Math.round((window.scrollY / scrollable) * 100);
      for (const depth of depths) {
        if (currentDepth >= depth && !firedDepths.current.has(depth)) {
          firedDepths.current.add(depth);
          trackMarketingEvent("scroll_depth", {
            depth,
            path: window.location.pathname,
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      {HOTJAR_ID && (
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:${JSON.stringify(HOTJAR_ID)},hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
      )}
    </>
  );
}
