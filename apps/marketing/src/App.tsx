import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LeadCaptureModal } from './components/LeadCaptureModal';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingSetupWizard } from './pages/OnboardingSetupWizard';
import { OpeningBalanceWizard } from './pages/OpeningBalanceWizard';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [isAppBadgeModalOpen, setIsAppBadgeModalOpen] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<'android' | 'ios' | 'general'>('general');

  // User & Onboarding flow state
  const [authData, setAuthData] = useState<{ user: any; accessToken: string } | null>(null);
  const [tenantData, setTenantData] = useState<{ shop: any; user: any; accessToken: string } | null>(null);

  // Sync with browser URL / hash if desired
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (['/', '/features', '/pricing', '/about', '/contact', '/terms', '/privacy', '/register', '/onboarding/setup'].includes(path)) {
        setCurrentRoute(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      window.history.pushState({}, '', route);
    } catch {}
  };

  const handleOpenAppBadgeModal = (platform?: 'android' | 'ios' | 'general') => {
    setModalPlatform(platform || 'general');
    setIsAppBadgeModalOpen(true);
  };

  const handleRegistrationComplete = (data: { user: any; accessToken: string }) => {
    setAuthData(data);
    navigate('/onboarding/setup');
  };

  const handleSetupComplete = (data: { shop: any; user: any; accessToken: string }) => {
    setTenantData(data);
    navigate('/onboarding/opening-balances');
  };

  const handleFinishOnboarding = () => {
    // In production, redirects to https://app.bebsayik.com
    // In local dev/demo, returns to landing page with success banner or opens web ERP
    alert('অভিনন্দন! আপনার দোকান সফলভাবে প্রস্তুত হয়েছে। app.bebsayik.com এ প্রবেশ করা হচ্ছে...');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentRoute={currentRoute}
        navigate={navigate}
        onOpenAppBadgeModal={() => handleOpenAppBadgeModal('general')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRoute === '/' && (
          <LandingPage
            navigate={navigate}
            onOpenAppBadgeModal={handleOpenAppBadgeModal}
          />
        )}

        {currentRoute === '/features' && (
          <FeaturesPage navigate={navigate} />
        )}

        {currentRoute === '/pricing' && (
          <PricingPage navigate={navigate} />
        )}

        {currentRoute === '/about' && (
          <AboutPage navigate={navigate} />
        )}

        {currentRoute === '/contact' && (
          <ContactPage />
        )}

        {currentRoute === '/terms' && (
          <TermsPage />
        )}

        {currentRoute === '/privacy' && (
          <PrivacyPage />
        )}

        {currentRoute === '/register' && (
          <RegisterPage
            onRegistrationComplete={handleRegistrationComplete}
            navigate={navigate}
          />
        )}

        {currentRoute === '/onboarding/setup' && (
          <OnboardingSetupWizard
            user={authData?.user || { id: 'temp_user', phone: '01711223344' }}
            accessToken={authData?.accessToken || 'temp_token'}
            onSetupComplete={handleSetupComplete}
          />
        )}

        {currentRoute === '/onboarding/opening-balances' && (
          <OpeningBalanceWizard
            tenantData={
              tenantData || {
                shop: { id: 'demo_shop', name: 'সিটি গ্যাজেট', slug: 'city-gadget' },
                user: authData?.user || { id: 'temp_user' },
                accessToken: authData?.accessToken || 'temp_token'
              }
            }
            onFinishOnboarding={handleFinishOnboarding}
          />
        )}
      </main>

      {/* Pre-launch Google Play / App Store badge Modal (TC-43) */}
      <LeadCaptureModal
        isOpen={isAppBadgeModalOpen}
        onClose={() => setIsAppBadgeModalOpen(false)}
        platform={modalPlatform}
      />

      {/* Global Footer */}
      <Footer
        navigate={navigate}
        onOpenAppBadgeModal={() => handleOpenAppBadgeModal('general')}
      />
    </div>
  );
}
