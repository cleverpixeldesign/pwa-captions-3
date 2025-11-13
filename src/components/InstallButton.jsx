import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect if device is Android
    const userAgent = navigator.userAgent || navigator.vendor || '';
    const android = /android/i.test(userAgent);
    setIsAndroid(android);

    // Only show on Android devices
    if (!android) {
      setCanInstall(false);
      return;
    }

    // Check if app is already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    // Check if user previously dismissed the banner
    const dismissed = localStorage.getItem('install-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
      // If we get the prompt, show the banner even if it was dismissed before
      setIsDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show banner by default if not dismissed (even without prompt)
    // This allows showing manual install instructions
    if (dismissed !== 'true') {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setCanInstall(false);
      
      if (choiceResult.outcome === 'accepted') {
        // User accepted, banner will disappear naturally
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setCanInstall(false);
    localStorage.setItem('install-banner-dismissed', 'true');
  };

  // Only show on Android devices
  if (!isAndroid) return null;
  
  // Don't show if explicitly dismissed AND we don't have a prompt
  if (isDismissed && !deferredPrompt) return null;
  
  // Don't show if we can't install and don't have a prompt
  if (!canInstall && !deferredPrompt) return null;

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs md:text-sm text-slate-600">
            <span className="font-medium">Install Hear Buddy</span>
            <span className="text-slate-500 ml-1">for quick access and offline use</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-3 py-2 min-h-[44px] rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-400 transition whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:ring-offset-2"
              aria-label="Install Hear Buddy app"
            >
              Install
            </button>
          ) : (
            <span className="text-xs text-slate-500">Use browser menu to install</span>
          )}
          <button
            onClick={handleDismiss}
            className="p-2 min-w-[44px] min-h-[44px] rounded-md hover:bg-slate-200/50 transition text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:ring-offset-2"
            aria-label="Dismiss install banner"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

