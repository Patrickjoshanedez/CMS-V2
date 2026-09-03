import { useEffect, useRef } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { HeroSection } from '../components/landing/HeroSection';
import { AboutSection } from '../components/landing/AboutSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { FAQSection } from '../components/landing/FAQSection';
import { Footer } from '../components/landing/Footer';

/**
 * LandingPage — Full landing page with hero, about, features, FAQ, and footer.
 */
export default function LandingPage() {
  const heroRef = useRef(null);
  const addSectionRef = useScrollReveal();

  useEffect(() => {
    // Trigger hero entry animations after mount
    const timer = setTimeout(() => {
      heroRef.current?.classList.add('landing-loaded');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-background transition-colors duration-500">
      <HeroSection heroRef={heroRef} />

      {/* ===== ABOUT SECTION ===== */}
      <AboutSection sectionRef={addSectionRef} />

      {/* ===== FEATURES SECTION ===== */}
      <FeaturesSection sectionRef={addSectionRef} />

      {/* ===== FAQ SECTION ===== */}
      <FAQSection sectionRef={addSectionRef} />

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}
