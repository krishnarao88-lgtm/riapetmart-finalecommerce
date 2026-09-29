import Script from "next/script";

// One Google tag (public ID) that forwards to Analytics (G-RH2GPCK931), Google Ads and Merchant Center.
// Loading the G- ID as well would count every visit twice.
const GOOGLE_TAG = "GT-PLWBKDKZ";

export function Analytics() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG}`} strategy="afterInteractive" />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_TAG}');`}
      </Script>
      {pixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
