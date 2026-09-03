import { useEffect, useRef } from 'react';

/**
 * CitySkylineSVG — Intricate city skyline silhouette embedded inside the gradient wave.
 * Uses a parallax drift effect on scroll.
 */
export function CitySkylineSVG() {
  const skylineRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (skylineRef.current) {
        const scrollY = window.scrollY;
        skylineRef.current.style.transform = `translateY(${scrollY * -0.15}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={skylineRef}
      className="landing-skyline absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{ opacity: 0.18 }}
    >
      <svg
        viewBox="0 0 1200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Skyline buildings — varied heights and widths for realism */}
        <rect x="30" y="180" width="50" height="220" rx="2" fill="white" fillOpacity="0.25" />
        <rect x="35" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="50" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="65" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="35" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="50" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="65" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />

        <rect x="100" y="120" width="45" height="280" rx="2" fill="white" fillOpacity="0.22" />
        <rect x="105" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />
        <rect x="118" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />
        <rect x="131" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />

        <rect x="160" y="200" width="60" height="200" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="240" y="80" width="55" height="320" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="248" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="262" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="276" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        {/* Antenna */}
        <rect x="265" y="50" width="3" height="30" fill="white" fillOpacity="0.3" />
        <circle cx="266.5" cy="48" r="3" fill="white" fillOpacity="0.35" />

        <rect x="310" y="160" width="45" height="240" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="370" y="100" width="70" height="300" rx="3" fill="white" fillOpacity="0.25" />
        <rect x="380" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="397" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="414" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />

        <rect x="460" y="220" width="40" height="180" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="515" y="60" width="60" height="340" rx="3" fill="white" fillOpacity="0.3" />
        {/* Antenna tall */}
        <rect x="543" y="20" width="4" height="40" fill="white" fillOpacity="0.32" />
        <circle cx="545" cy="17" r="4" fill="white" fillOpacity="0.4" />

        <rect x="590" y="150" width="50" height="250" rx="2" fill="white" fillOpacity="0.22" />

        <rect x="660" y="110" width="55" height="290" rx="3" fill="white" fillOpacity="0.26" />

        <rect x="730" y="190" width="40" height="210" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="790" y="70" width="65" height="330" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="820" y="40" width="3" height="30" fill="white" fillOpacity="0.3" />

        <rect x="870" y="180" width="50" height="220" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="940" y="130" width="55" height="270" rx="3" fill="white" fillOpacity="0.24" />

        <rect x="1010" y="200" width="45" height="200" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="1070" y="100" width="60" height="300" rx="3" fill="white" fillOpacity="0.25" />
        <rect x="1098" y="70" width="3" height="30" fill="white" fillOpacity="0.3" />

        <rect x="1145" y="170" width="45" height="230" rx="2" fill="white" fillOpacity="0.2" />
      </svg>
    </div>
  );
}
