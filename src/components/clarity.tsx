import Script from "next/script";

/**
 * Microsoft Clarity (free heatmaps and session recordings) on storefront pages only, never in Admin.
 * Off until NEXT_PUBLIC_CLARITY_ID is set in Vercel. Clarity masks typed text by default; set the project's
 * masking to "Strict" in the Clarity dashboard so names, phones and addresses at checkout are never recorded.
 */
export function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!id || !/^[a-z0-9]{6,20}$/i.test(id)) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
    </Script>
  );
}
