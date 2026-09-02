import { CitySkylineSVG } from './CitySkylineSVG';

/**
 * WaveShape — Complex flowing wave SVG that divides the page.
 * Contains the gradient fill and the city skyline.
 */
export function WaveShape() {
  return (
    <div className="landing-wave absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute top-0 right-0 h-full"
        style={{ width: '65%', minHeight: '100%' }}
        viewBox="0 0 800 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* SVG gradient stops - must use hex values (Tailwind classes not supported in SVG)
              Brand color mapping:
              - #ff5722 = brand-orange
              - #e91e63 = brand-pink
              - #9c27b0 = brand-purple
              - #673ab7 = brand-deep-purple
          */}
          <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5722" />
            <stop offset="35%" stopColor="#e91e63" />
            <stop offset="70%" stopColor="#9c27b0" />
            <stop offset="100%" stopColor="#673ab7" />
          </linearGradient>
        </defs>
        <path
          d="M200,-20 C180,80 100,120 80,200 C55,300 120,350 100,450 C80,540 20,560 40,650 C60,740 140,760 160,820 C175,870 160,900 200,920 L820,920 L820,-20 Z"
          fill="url(#waveGradient)"
        />
      </svg>
      {/* City skyline inside the wave area */}
      <div className="absolute top-0 right-0 h-full overflow-hidden" style={{ width: '65%' }}>
        <CitySkylineSVG />
      </div>
    </div>
  );
}
