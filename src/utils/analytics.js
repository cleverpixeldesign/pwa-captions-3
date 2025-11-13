/**
 * Google Analytics utility functions
 */

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {Object} eventParams - Additional event parameters
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track fidget spinner spin
 */
export const trackFidgetSpinner = () => {
  trackEvent('fidget_spinner_click', {
    event_category: 'engagement',
    event_label: 'fidget_spinner',
    value: 1
  });
};

/**
 * Track settings toggle
 * @param {boolean} isOpen - Whether settings are being opened (true) or closed (false)
 */
export const trackSettingsToggle = (isOpen) => {
  trackEvent('settings_toggle', {
    event_category: 'engagement',
    event_label: isOpen ? 'settings_open' : 'settings_close',
    value: isOpen ? 1 : 0
  });
};

/**
 * Track start listening
 */
export const trackStartListening = () => {
  trackEvent('start_listening', {
    event_category: 'captions',
    event_label: 'start',
    value: 1
  });
};

/**
 * Track stop listening
 */
export const trackStopListening = () => {
  trackEvent('stop_listening', {
    event_category: 'captions',
    event_label: 'stop',
    value: 1
  });
};

