import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsSettings {
  fb_pixel_id: string | null;
  fb_capi_token: string | null;
  gtm_id: string | null;
  ga4_id: string | null;
}

let injectedPixel = false;
let injectedGtm = false;
let injectedGa4 = false;

function injectMetaPixel(pixelId: string) {
  if (injectedPixel) return;
  injectedPixel = true;

  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

function injectGTM(gtmId: string) {
  if (injectedGtm) return;
  injectedGtm = true;

  const script = document.createElement("script");
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function injectGA4(ga4Id: string) {
  if (injectedGa4) return;
  injectedGa4 = true;

  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${ga4Id}');
  `;
  document.head.appendChild(script2);
}

export function useAnalyticsInjection() {
  const { data: settings } = useQuery<AnalyticsSettings | null>({
    queryKey: ["analytics-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_settings")
        .select("fb_pixel_id, fb_capi_token, gtm_id, ga4_id")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!settings) return;
    if (settings.fb_pixel_id) injectMetaPixel(settings.fb_pixel_id);
    if (settings.gtm_id) injectGTM(settings.gtm_id);
    if (settings.ga4_id) injectGA4(settings.ga4_id);
  }, [settings]);

  return settings;
}

// Generate unique event ID
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Track ecommerce events
export function trackEvent(
  eventName: string,
  params: Record<string, any> = {},
  settings?: AnalyticsSettings | null
) {
  const eventId = generateEventId();
  const w = window as any;

  // Facebook Pixel
  if (settings?.fb_pixel_id && w.fbq) {
    w.fbq("track", eventName, { ...params, eventID: eventId });
  }

  // GA4 / GTM dataLayer
  if (w.dataLayer) {
    w.dataLayer.push({ event: eventName, ...params, event_id: eventId });
  }

  // GA4 gtag
  if (w.gtag) {
    w.gtag("event", eventName, { ...params, event_id: eventId });
  }

  // Server-side CAPI via edge function
  if (settings?.fb_capi_token && settings?.fb_pixel_id) {
    supabase.functions.invoke("track-event", {
      body: {
        event_name: eventName,
        event_id: eventId,
        pixel_id: settings.fb_pixel_id,
        access_token: settings.fb_capi_token,
        params,
        event_source_url: window.location.href,
        user_agent: navigator.userAgent,
      },
    }).catch(() => {}); // fire and forget
  }

  return eventId;
}
