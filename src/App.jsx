import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Header, Button, Card, Footer } from './cleverpixel-design-system/src'
import Contact from './pages/Contact'
import InstallButton from './components/InstallButton'
import { CleverFidgetSpinner } from './components/CleverFidgetSpinner'
import { HearBuddyMascot } from './components/HearBuddyMascot'
import { trackSettingsToggle, trackStartListening, trackStopListening } from './utils/analytics'
import './App.css'

// Question detection patterns
const QUESTION_WORDS = /\b(what|where|when|who|why|how|which|whose|whom)\b/i
const QUESTION_STARTERS = /\b(is|are|was|were|do|does|did|can|could|would|should|will|shall|may|might|have|has|had)\b/i
const QUESTION_ENDINGS = /\b(right|correct|okay|ok|sure|huh|eh)\s*$/i

// Constants
const SCROLL_THRESHOLD_PX = 100 // Distance from bottom to trigger auto-scroll (px)

// Punctuation configuration
const PUNCTUATION_CONFIG = {
  autoPunctuation: true,
  detectQuestions: true,
  addPeriods: true,
  addCommas: false, // Can be enabled for pause detection
}

// Detect if text is a question
function isQuestion(text, config) {
  if (!config.detectQuestions) return false

  const trimmed = text.trim()
  if (!trimmed) return false

  // Check if it already ends with a question mark
  if (trimmed.endsWith('?')) return false

  // Check for question words at the start
  if (QUESTION_WORDS.test(trimmed.split(/\s+/)[0])) return true

  // Check for question starters (inverted questions like "Is it...")
  const words = trimmed.split(/\s+/)
  if (words.length > 0 && QUESTION_STARTERS.test(words[0])) {
    if (QUESTION_ENDINGS.test(trimmed) || QUESTION_WORDS.test(trimmed)) {
      return true
    }
    if (words.length <= 5) return true
  }

  // Check for question endings
  if (QUESTION_ENDINGS.test(trimmed)) return true

  // Check if sentence contains question words
  if (QUESTION_WORDS.test(trimmed)) {
    const questionWordIndex = trimmed.search(QUESTION_WORDS)
    if (questionWordIndex < trimmed.length * 0.3) return true
  }

  return false
}

// Capitalize first letter of text
function capitalizeFirst(text) {
  if (!text) return text
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// Add appropriate punctuation to text
function addPunctuation(text, config, isNewSentence = false) {
  if (!config.autoPunctuation) {
    const trimmed = text.trim()
    return isNewSentence ? capitalizeFirst(trimmed) : trimmed
  }

  let trimmed = text.trim()
  if (!trimmed) return trimmed

  // Capitalize first letter if this is a new sentence
  if (isNewSentence) {
    trimmed = capitalizeFirst(trimmed)
  }

  // Check if it already has punctuation
  const hasPunctuation = /[.!?]$/.test(trimmed)
  if (hasPunctuation) {
    return trimmed
  }

  // Detect and add appropriate punctuation
  if (isQuestion(trimmed, config)) {
    return trimmed + '?'
  }

  if (config.addPeriods) {
    return trimmed + '.'
  }

  return trimmed
}

function HearBuddy() {
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [status, setStatus] = useState('')
  const [listening, setListening] = useState(false)
  const [punctuationSettings, setPunctuationSettings] = useState(PUNCTUATION_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()

  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)
  const transcriptContainerRef = useRef(null)
  const transcriptScrollRef = useRef(null) // scrollable container
  const lastInterimTextRef = useRef('')
  const lastFinalTextRef = useRef('') // Track last final text to prevent immediate duplicates
  const transcriptRef = useRef('') // Keep ref of transcript for immediate checks
  const punctuationSettingsRef = useRef(punctuationSettings) // Ref for punctuation settings

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setStatus(
        'Speech Recognition is not supported on this browser. Try Chrome or Edge on desktop, or Chrome on Android.'
      )
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onerror = (e) => {
      const error = e.error || 'unknown'
      console.error('Speech recognition error:', e)

      const errorMessage =
        error === 'not-allowed'
          ? 'Microphone access denied. Please allow mic permissions in your browser settings.'
          : `Mic error: ${error}`

      setStatus(errorMessage)

      if (error === 'not-allowed') {
        listeningRef.current = false
        setListening(false)
        try {
          recognition.stop()
          recognition.abort()
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error stopping recognition:', err)
          }
        }
      }
    }

    recognition.onresult = (event) => {
      if (!event.results || event.results.length === 0) return

      let interimChunk = ''
      let finalChunk = ''

      // Only look at NEW results from resultIndex onward
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (!res || !res[0]) continue
        const txt = res[0].transcript

        if (res.isFinal) {
          finalChunk += txt
        } else {
          interimChunk += txt
        }
      }

      // Cache current transcript state for both checks
      const currentTranscript = transcriptRef.current
      const isNewSentence = !currentTranscript || /[.!?]\s*$/.test(currentTranscript.trim())

      // 1) Handle FINAL text
      if (finalChunk && finalChunk.trim()) {
        const trimmedFinal = finalChunk.trim()

        // Simple duplicate guard: if this is exactly what we just committed, skip it
        if (trimmedFinal === lastFinalTextRef.current) {
          setInterimText('')
          lastInterimTextRef.current = ''
          return
        }

        // Apply punctuation rules (only if auto-punctuation is on)
        const textToAdd = punctuationSettingsRef.current.autoPunctuation
          ? addPunctuation(trimmedFinal, punctuationSettingsRef.current, isNewSentence)
          : (isNewSentence ? capitalizeFirst(trimmedFinal) : trimmedFinal)

        // Build next transcript more efficiently
        const separator = currentTranscript && !currentTranscript.endsWith(' ') ? ' ' : ''
        const nextTranscript = currentTranscript + separator + textToAdd + ' '

        // Update refs first (synchronous)
        transcriptRef.current = nextTranscript
        lastFinalTextRef.current = trimmedFinal
        lastInterimTextRef.current = ''

        // Batch state updates
        setTranscript(nextTranscript)
        setInterimText('')
      }

      // 2) Handle INTERIM text (live, not committed)
      else if (interimChunk) {
        const displayInterim = isNewSentence
          ? capitalizeFirst(interimChunk)
          : interimChunk

        lastInterimTextRef.current = displayInterim
        setInterimText(displayInterim)
      } else if (!finalChunk) {
        // Nothing interim and no new final → clear interim display
        lastInterimTextRef.current = ''
        setInterimText('')
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          recognitionRef.current.abort()
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error cleaning up recognition:', e)
          }
        }
      }
    }
  }, [])

  // Handle Escape key to close settings panel
  useEffect(() => {
    if (!showSettings) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowSettings(false)
        trackSettingsToggle(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showSettings])

  // Handle listening state changes
  useEffect(() => {
    listeningRef.current = listening

    if (!recognitionRef.current) return

    if (listening) {
      try {
        setStatus('') // clear any previous errors
        recognitionRef.current.start()
      } catch (e) {
        console.error('Error starting recognition:', e)
        setStatus('Error starting speech recognition. Please try again.')
        setListening(false)
        listeningRef.current = false
      }
    } else {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore
      }
    }
  }, [listening])

  // Auto-scroll transcript container (optimized for performance)
  useEffect(() => {
    if (!listening) return // Only scroll when actively listening
    
    if (transcriptScrollRef.current) {
      // Instant scroll (no smooth animation to reduce lag)
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
    }

    // Only do page scroll on final text updates (not interim)
    if (!interimText && transcript && transcriptContainerRef.current) {
      const scrollTimeout = setTimeout(() => {
        const container = transcriptContainerRef.current
        if (!container) return
        
        const containerRect = container.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        // Only scroll if container is below viewport
        if (containerRect.bottom > viewportHeight + SCROLL_THRESHOLD_PX) {
          container.scrollIntoView({
            behavior: 'auto', // Changed from 'smooth' for instant response
            block: 'nearest',
          })
        }
      }, 200) // Increased debounce for page scrolls

      return () => clearTimeout(scrollTimeout)
    }
  }, [transcript, listening]) // Removed interimText to reduce scroll frequency

  const startListening = () => {
    if (!recognitionRef.current) return
    if (listening) return

    lastFinalTextRef.current = ''
    setStatus('')
    setListening(true)
    trackStartListening()
  }

  const stopListening = (force = false) => {
    if (!recognitionRef.current) return

    // Finalize any remaining interim text before stopping (safely)
    const currentInterim = lastInterimTextRef.current
    if (currentInterim && currentInterim.trim().length > 0) {
      const trimmedInterim = currentInterim.trim()

      setTranscript((prev) => {
        const prevTrimmed = prev.trim()
        if (
          prevTrimmed.endsWith(trimmedInterim) ||
          prevTrimmed.endsWith(trimmedInterim + ' ')
        ) {
          return prev
        }

        const separator = prev && !prev.endsWith(' ') ? ' ' : ''
        const next = prev + separator + trimmedInterim + ' '
        transcriptRef.current = next
        lastFinalTextRef.current = trimmedInterim
        return next
      })
    }

    setListening(false)
    setInterimText('')
    lastInterimTextRef.current = ''
    trackStopListening()

    if (force && recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        // ignore
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    transcriptRef.current = ''
    setInterimText('')
    lastInterimTextRef.current = ''
    lastFinalTextRef.current = ''
  }

  // Update transcript ref when transcript changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Update punctuation settings ref when settings change
  useEffect(() => {
    punctuationSettingsRef.current = punctuationSettings
  }, [punctuationSettings])

  const displayTranscript = () => {
    if (interimText) {
      return (
        <>
          {transcript}
          <em className="opacity-60 italic text-slate-600">{interimText}</em>
        </>
      )
    }
    return transcript
  }

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
        navItems={[{ href: '/', label: 'Home' }]}
        onContactClick={() => navigate('/contact')}
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
            id="settingsBtn"
            onClick={() => {
              const newState = !showSettings
              setShowSettings(newState)
              trackSettingsToggle(newState)
            }}
            title="Punctuation settings"
            aria-label="Punctuation settings"
            aria-expanded={showSettings}
            aria-haspopup="true"
            className="absolute top-4 right-4 md:top-5 md:right-6 p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
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
          </button>

          {/* Heading & Subtitle */}
          <header>
            <div className="relative">
              {/* Listening pill - positioned above title, aligned with dog's head */}
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
                id="stopBtn"
                onClick={() => stopListening(false)}
                title="Stop listening"
                aria-label="Stop listening"
                variant="primary"
                className="w-full md:w-auto min-h-[44px] !bg-[var(--cp-red)] hover:!bg-[var(--cp-red)]/90 !text-white"
              >
                Stop
              </Button>
            ) : (
              <Button
                id="startBtn"
                onClick={startListening}
                title="Start listening"
                aria-label="Start listening"
                variant="primary"
                className="w-full md:w-auto min-h-[44px] bg-[var(--cp-green)] hover:bg-[var(--cp-green)]/90 text-white"
              >
                Start Listening
              </Button>
            )}
            {!listening && transcript.trim().length > 0 && (
              <Button
                id="clearBtn"
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
                  checked={punctuationSettings.autoPunctuation}
                  onChange={(e) =>
                    setPunctuationSettings((prev) => ({
                      ...prev,
                      autoPunctuation: e.target.checked,
                    }))
                  }
                  aria-label="Auto punctuation"
                  className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Auto punctuation</span>
              </label>
              <label className="flex items-center gap-2 py-2 min-h-[44px] cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.detectQuestions}
                  onChange={(e) =>
                    setPunctuationSettings((prev) => ({
                      ...prev,
                      detectQuestions: e.target.checked,
                    }))
                  }
                  disabled={!punctuationSettings.autoPunctuation}
                  aria-label="Detect questions"
                  className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Detect questions</span>
              </label>
              <label className="flex items-center gap-2 py-2 min-h-[44px] cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.addPeriods}
                  onChange={(e) =>
                    setPunctuationSettings((prev) => ({
                      ...prev,
                      addPeriods: e.target.checked,
                    }))
                  }
                  disabled={!punctuationSettings.autoPunctuation}
                  aria-label="Add periods to statements"
                  className="w-5 h-5 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Add periods to statements</span>
              </label>
            </Card>
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
                className="h-full max-h-[420px] overflow-y-auto pr-1 text-lg md:text-xl leading-relaxed text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2 rounded-lg"
                tabIndex={0}
                role="log"
                aria-label="Live captions"
                ref={transcriptScrollRef}
              >
                {transcript.length === 0 && !interimText ? (
                  <p className="text-slate-400 text-lg md:text-xl italic">
                    Captions will appear here when someone starts talking.
                  </p>
                ) : (
                  <div
                    id="transcript"
                    role="status"
                    aria-live="polite"
                    aria-atomic="false"
                  >
                    {displayTranscript()}
                  </div>
                )}
              </div>
              {status && (
                <div
                  id="status"
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

          {/* Fidget spinner in bottom-right of the card */}
          <div className="hidden sm:block absolute bottom-4 right-4" aria-hidden="true">
            <CleverFidgetSpinner />
          </div>
        </section>
      </main>

      <Footer
        links={[
          {
            href: 'https://buymeacoffee.com/michellereeves',
            label: '☕ Buy Me a Coffee',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        ]}
        copyrightText="Crafted with playful precision"
      />
    </div>
  )
}

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
