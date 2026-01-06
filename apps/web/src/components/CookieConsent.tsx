import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';
const CONSENT_EXPIRY_DAYS = 365;

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      expiry: expiryDate.toISOString(),
    }));

    setShowBanner(false);
  };

  const handleDismiss = () => {
    // User dismissed without accepting - we'll ask again next session
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            We use essential cookies to keep you logged in and make the application work.
            We don't use advertising or tracking cookies.{' '}
            <Link to="/legal/cookies" className="text-primary hover:underline font-medium">
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleAccept} size="sm">
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-2"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
