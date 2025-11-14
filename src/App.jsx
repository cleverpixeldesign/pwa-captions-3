import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Header, Button, Card, Footer } from './cleverpixel-design-system/src'
import Contact from './pages/Contact'
import InstallButton from './components/InstallButton'
import { CleverFidgetSpinner } from './components/CleverFidgetSpinner'
import { HearBuddyMascot } from './components/HearBuddyMascot'
import { trackSettingsToggle, trackStartListening, trackStopListening } from './utils/analytics'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import './App.css'

// Default punctuation configuration
const DEFAULT_PUNCTUATION_CONFIG = {
  autoPunctuation: true,
  detectQuestions: true,
  addPeriods: true,
  addCommas: false,
}

// Static navigation items (avoid recreation on every render)
const NAV_ITEMS = [{ href: '/', label: 'Home' }]

const FOOTER_LINKS = [
  {
    href: 'https://buymeacoffee.com/michellereeves',
    label: '☕ Buy Me a Coffee',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
]

/**
 * Settings gear icon component - extracted for better readability
 */
const SettingsIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
)

/**
 * Settings panel component - extracted for better organization
 */
const SettingsPanel = ({ settings, onSettingsChange, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])
  
  const handleChange = useCallback((field, value) => {
    onSettingsChange((prev) => ({ ...prev, [field]: value }))
  }, [onSettingsChange])
  
  return (
    <Card
      className="absolute top-12 right-4 md:top-14 md:right-6 z-10 w-56 md:w-64 border border-slate-200 shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
    >
      <h3
        id="settings-heading"
        className="m-0 mb-2 text-sm font-bold text-slate-900"
      >
        Punctuation Settings
      </h3>
      
      <label className="flex items-center gap-2 py-2 min-h-[44px] cursor-pointer text-slate-700">
        <input
          type="checkbox"
          checked={settings.autoPunctuation}
          onChange={(e) => handleChange('autoPunctuation', e.target.checked)}
          aria-label="Auto punctuation"
          className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)]"
        />
        <span className="select-none text-sm">Auto punctuation</span>
      </label>
      
      <label className="flex items-center gap-2 py-2 min-h-[44px] cursor-pointer text-slate-700">
        <input
          type="checkbox"
          checked={settings.detectQuestions}
          onChange={(e) => handleChange('detectQuestions', e.target.checked)}
          disabled={!settings.autoPunctuation}
          aria-label="Detect questions"
          className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="select-none text-sm">Detect questions</span>
      </label>
      
      <label className="flex items-center gap-2 py-2 min-h-[44px] cursor-pointer text-slate-700">
        <input
          type="checkbox"
          checked={settings.addPeriods}
          onChange={(e) => handleChange('addPeriods', e.target.checked)}
          disabled={!settings.autoPunctuation}
          aria-label="Add periods to statements"
          className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="select-none text-sm">Add periods to statements</span>
      </label>
    </Card>
  )
}

/**
 * Main Hear Buddy application component
 */
function HearBuddy() {
  const [punctuationSettings, setPunctuationSettings] = useState(DEFAULT_PUNCTUATION_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const transcriptContainerRef = useRef(null)
  
  // Use custom hook for speech recognition logic
  const {
    transcript,
    interimText,
    status,
    listening,
    isSupported,
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    clearTranscript,
  } = useSpeechRecognition(punctuationSettings)
  
  // Memoized transcript display to avoid unnecessary recalculations
  const displayText = useMemo(() => {
    if (!interimText) return transcript
    return (
      <>
        {transcript}
        <em className="opacity-60 italic text-slate-600">{interimText}</em>
      </>
    )
  }, [transcript, interimText])
  
  // Optimized handlers with useCallback
  const handleSettingsToggle = useCallback(() => {
    setShowSettings((prev) => {
      const newState = !prev
      trackSettingsToggle(newState)
      return newState
    })
  }, [])
  
  const handleSettingsClose = useCallback(() => {
    setShowSettings(false)
    trackSettingsToggle(false)
  }, [])
  
  const handleStartListening = useCallback(() => {
    startSpeechRecognition()
    trackStartListening()
  }, [startSpeechRecognition])
  
  const handleStopListening = useCallback(() => {
    stopSpeechRecognition(false)
    trackStopListening()
  }, [stopSpeechRecognition])
  
  const handleContactClick = useCallback(() => {
    navigate('/contact')
  }, [navigate])
  
  // Determine if clear button should be shown
  const showClearButton = !listening && transcript.trim().length > 0
  
  return (
    <div className="w-screen min-h-screen">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--cp-blue)] focus:text-white focus:rounded-md focus:font-semibold"
      >
        Skip to main content
      </a>
      
      <Header
        navItems={NAV_ITEMS}
        onContactClick={handleContactClick}
      />
      
      <InstallButton />
      
      <main
        id="main-content"
        className="max-w-5xl mx-auto px-4 pt-6 pb-10 md:px-6 md:pt-10 md:pb-16"
      >
        {/* Dedication */}
        <div className="text-center mb-6">
          <p className="text-lg md:text-base text-slate-400 italic">
            Hi Lauren! I hope this helps you never miss a joke, a story, or a friend (like
            Lorelei) asking you to come play. 💚
          </p>
        </div>
        
        <section className="relative rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7 space-y-4">
          {/* Settings Button - Top Right */}
          <button
            onClick={handleSettingsToggle}
            title="Punctuation settings"
            aria-label="Punctuation settings"
            aria-expanded={showSettings}
            aria-haspopup="true"
            className="absolute top-4 right-4 md:top-5 md:right-6 p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2"
          >
            <SettingsIcon />
          </button>
          
          {/* Heading & Subtitle */}
          <header>
            <div className="relative">
              {/* Listening pill */}
              {listening && (
                <div
                  className="absolute top-[-10px] left-[75px] inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-100 z-10 whitespace-nowrap"
                  role="status"
                  aria-live="polite"
                  aria-label="Listening for captions"
                >
                  <span
                    className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                    aria-hidden="true"
                  />
                  Listening for captions
                </div>
              )}
              
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                <span className="inline-flex items-end gap-3">
                  <HearBuddyMascot
                    className="w-16 h-16 md:w-16 md:h-16"
                    listening={listening}
                  />
                  <span>Hear Buddy</span>
                </span>
              </h1>
              
              <p className="text-sm md:text-base text-slate-600 mt-1 max-w-xl">
                A simple, installable web app that converts speech to live captions.
              </p>
            </div>
          </header>
          
          {/* Button Row */}
          <div
            className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-3"
            role="toolbar"
            aria-label="Caption controls"
          >
            {listening ? (
              <Button
                onClick={handleStopListening}
                title="Stop listening"
                aria-label="Stop listening"
                variant="primary"
                className="w-full md:w-auto min-h-[44px] !bg-[var(--cp-red)] hover:!bg-[var(--cp-red)]/90 !text-white"
              >
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleStartListening}
                title="Start listening"
                aria-label="Start listening"
                variant="primary"
                disabled={!isSupported}
                className="w-full md:w-auto min-h-[44px] bg-[var(--cp-green)] hover:bg-[var(--cp-green)]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Listening
              </Button>
            )}
            
            {showClearButton && (
              <Button
                onClick={clearTranscript}
                title="Clear captions"
                aria-label="Clear captions"
                variant="secondary"
                className="w-full md:w-auto min-h-[44px]"
              >
                Clear
              </Button>
            )}
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <SettingsPanel
              settings={punctuationSettings}
              onSettingsChange={setPunctuationSettings}
              onClose={handleSettingsClose}
            />
          )}
          
          {/* Transcript Panel */}
          <article
            ref={transcriptContainerRef}
            className={`rounded-2xl border bg-slate-50/80 mt-2 transition-shadow ${
              listening
                ? 'border-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
                : 'border-slate-200 shadow-none'
            }`}
            aria-labelledby="transcript-heading"
          >
            <div className="min-h-[280px] md:min-h-[340px] rounded-2xl bg-white/70 px-4 py-3 md:px-5 md:py-4 flex flex-col">
              <h2 id="transcript-heading" className="sr-only">
                Live transcript
              </h2>
              
              <div
                className="text-lg md:text-xl leading-relaxed text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2 rounded-lg"
                tabIndex={0}
                role="log"
                aria-label="Live captions"
              >
                {transcript.length === 0 && !interimText ? (
                  <p className="text-slate-400 text-lg md:text-xl italic">
                    Captions will appear here when someone starts talking.
                  </p>
                ) : (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="false"
                  >
                    {displayText}
                  </div>
                )}
              </div>
              
              {status && (
                <div
                  className="text-slate-500 text-sm md:text-base mt-3 text-left"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {status}
                </div>
              )}
            </div>
          </article>
          
          {/* Fidget spinner */}
          <div
            className="hidden sm:block absolute bottom-4 right-4"
            aria-hidden="true"
          >
            <CleverFidgetSpinner />
          </div>
        </section>
      </main>
      
      <Footer
        links={FOOTER_LINKS}
        copyrightText="Crafted with playful precision"
      />
    </div>
  )
}

/**
 * Root App component with routing
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HearBuddy />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
