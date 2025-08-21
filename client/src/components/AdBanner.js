import { useEffect } from 'react';

let adsScriptLoaded = false;

const AdBanner = () => {
  const enabled = process.env.REACT_APP_ADS_ENABLED === 'true';
  const client = process.env.REACT_APP_ADSENSE_CLIENT;
  const slot = process.env.REACT_APP_ADSENSE_SLOT;

  useEffect(() => {
    if (!enabled || !client || !slot) return;

    if (!adsScriptLoaded) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      adsScriptLoaded = true;
    }

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // ignore adblock errors
    }
  }, [enabled, client, slot]);

  const containerStyle = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '90px',
    width: '100%',
    zIndex: 1000,
    backgroundColor: 'transparent',
  };

  if (!enabled || !client || !slot) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            color: '#666',
            background: '#f8f8f8',
          }}
        >
          Ads help keep this free
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBanner;
