import { useRef } from 'react';

/* =====================================================================
   SPOTLIGHT CARD — Glassmorphism with mouse-tracking glow
   ===================================================================== */
export function SpotlightCard({ icon: Icon, title, description }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className="spotlight-card rounded-2xl p-8">
      <div className="relative z-10">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/20 to-brand-deep-purple/20">
          <Icon className="h-6 w-6 text-brand-pink" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
