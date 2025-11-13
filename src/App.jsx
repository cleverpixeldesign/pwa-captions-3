import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Header, Button, Card, Footer } from './cleverpixel-design-system/src';
import Contact from './pages/Contact'
import './App.css'

// Question detection patterns
const QUESTION_WORDS = /\b(what|where|when|who|why|how|which|whose|whom)\b/i
const QUESTION_STARTERS = /\b(is|are|was|were|do|does|did|can|could|would|should|will|shall|may|might|have|has|had)\b/i
const QUESTION_ENDINGS = /\b(right|correct|okay|ok|sure|huh|eh)\s*$/i

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
    // Check if it's likely a question (not a statement)
    // Questions often have question words or end with question indicators
    if (QUESTION_ENDINGS.test(trimmed) || QUESTION_WORDS.test(trimmed)) {
      return true
    }
    // If it starts with a question starter and is short, likely a question
    if (words.length <= 5) return true
  }
  
  // Check for question endings
  if (QUESTION_ENDINGS.test(trimmed)) return true
  
  // Check if sentence contains question words
  if (QUESTION_WORDS.test(trimmed)) {
    // If question word appears early in sentence, likely a question
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
    // Add period for statements
    return trimmed + '.'
  }
  
  return trimmed
}

function HearBuddy() {
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [status, setStatus] = useState('')
  const [listening, setListening] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallTip, setShowInstallTip] = useState(false)
  const [punctuationSettings, setPunctuationSettings] = useState(PUNCTUATION_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  
  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)
  const punctuationSettingsRef = useRef(punctuationSettings)
  const transcriptRef = useRef('')

  // PWA Install Prompt Handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallTip(false)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setShowInstallTip(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (!installPrompt) {
      setShowInstallTip(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installPrompt])

  const handleInstall = async () => {
    if (!installPrompt) return
    
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    setInstallPrompt(null)
    setShowInstallTip(!installPrompt)
    console.log('Install choice:', outcome)
  }

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setStatus('Speech Recognition is not supported on this browser. Try Chrome or Edge on desktop, or Chrome on Android.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => {
      setStatus('Listening…')
    }

    recognition.onend = () => {
      if (listeningRef.current && recognitionRef.current) {
        setStatus('Reconnecting…')
        try {
          recognition.start()
        } catch (e) {
          // starting while started throws
        }
      } else {
        setStatus('Stopped')
      }
    }

    recognition.onerror = (e) => {
      console.error(e)
      setStatus('Mic error: ' + (e.error || 'unknown'))
      if (e.error === 'not-allowed') {
        setStatus('Microphone access denied. Please allow mic permissions in your browser settings.')
        listeningRef.current = false
        setListening(false)
        try {
          recognition.stop()
          recognition.abort()
        } catch (err) {
          // ignore
        }
      }
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const txt = res[0].transcript
        if (res.isFinal) {
          finalText += txt
        } else {
          interim += txt
        }
      }

      if (finalText) {
        setTranscript(prev => {
          // Check if this is a new sentence (previous text ends with punctuation or is empty)
          const isNewSentence = !prev || /[.!?]\s*$/.test(prev.trim())
          const punctuated = addPunctuation(finalText, punctuationSettingsRef.current, isNewSentence)
          
          // Add space between sentences if previous text doesn't end with space
          const separator = prev && !prev.endsWith(' ') ? ' ' : ''
          const newTranscript = prev + separator + punctuated + ' '
          transcriptRef.current = newTranscript
          return newTranscript
        })
        setInterimText('') // Clear interim when final text is added
      }

      // Update interim display with real-time capitalization
      if (interim) {
        // Check if this is a new sentence using the ref to get current transcript
        const currentTranscript = transcriptRef.current
        const isNewSentence = !currentTranscript || /[.!?]\s*$/.test(currentTranscript.trim())
        
        // Capitalize first letter if it's a new sentence
        const capitalizedInterim = isNewSentence && interim.length > 0 
          ? capitalizeFirst(interim) 
          : interim
        setInterimText(capitalizedInterim)
      } else {
        setInterimText('')
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // ignore
        }
      }
    }
  }, []) // Initialize once

  // Update punctuation settings ref when settings change
  useEffect(() => {
    punctuationSettingsRef.current = punctuationSettings
  }, [punctuationSettings])

  // Update transcript ref when transcript changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Handle listening state changes
  useEffect(() => {
    listeningRef.current = listening
    
    if (!recognitionRef.current) return

    if (listening) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error('Error starting recognition:', e)
      }
    } else {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore
      }
    }
  }, [listening])

  // Auto-scroll transcript
  useEffect(() => {
    const transcriptEl = document.getElementById('transcript')
    if (transcriptEl) {
      transcriptEl.scrollTop = transcriptEl.scrollHeight
    }
  }, [transcript, interimText])

  const startListening = () => {
    if (!recognitionRef.current) return
    if (listening) return
    setListening(true)
  }

  const stopListening = (force = false) => {
    if (!recognitionRef.current) return
    
    setListening(false)
    setInterimText('')
    
    if (force && recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        // ignore
      }
    }
  }

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
      <Header 
        navItems={[
          { href: '/', label: 'Home' },
        ]}
        onContactClick={() => navigate('/contact')}
      />
      
      <main className="max-w-5xl mx-auto px-4 pt-6 pb-10 md:px-6 md:pt-10 md:pb-16">
        <section className="rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7 space-y-4 relative">
          {/* Decorative icon */}
          <div className="absolute top-4 right-5 opacity-40 md:opacity-60 pointer-events-none">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C7.58 3 4 6.13 4 10c0 2.38 1.19 4.47 3 5.74V19c0 .55.45 1 1 1h1.26c.81 1.27 2.19 2.26 3.74 2.26 4.42 0 8-3.13 8-7s-3.58-7-8-7z" fill="currentColor" className="text-slate-300"/>
              <circle cx="9" cy="10" r="1" fill="currentColor" className="text-slate-400"/>
              <circle cx="12" cy="10" r="1" fill="currentColor" className="text-slate-400"/>
              <circle cx="15" cy="10" r="1" fill="currentColor" className="text-slate-400"/>
            </svg>
          </div>
          
          {/* Heading & Subtitle */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <span>Hear Buddy</span>
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-1 max-w-xl">
              A simple, installable PWA that converts speech to live captions.
            </p>
            {listening && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Listening for captions
              </p>
            )}
          </div>

          {/* Button Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-3">
            <Button
              id="installBtn"
              onClick={handleInstall}
              disabled={!installPrompt}
              title="Install app"
              aria-label="Install app"
              variant="secondary"
              className={`w-full md:w-auto ${!installPrompt ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed" : ""}`}
            >
              Install
            </Button>
            <Button
              id="startBtn"
              onClick={startListening}
              disabled={listening}
              title="Start listening"
              aria-label="Start listening"
              variant="primary"
              className={`w-full md:w-auto bg-[var(--cp-green)] hover:bg-[var(--cp-green)]/90 text-white ${listening ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {listening ? "Listening..." : "Start Listening"}
            </Button>
            <Button
              id="stopBtn"
              onClick={() => stopListening(false)}
              disabled={!listening}
              title="Stop listening"
              aria-label="Stop listening"
              variant="primary"
              className="w-full md:w-auto !bg-[var(--cp-red)] hover:!bg-[var(--cp-red)]/90 !text-white"
            >
              Stop
            </Button>
            <Button
              id="settingsBtn"
              onClick={() => setShowSettings(!showSettings)}
              title="Punctuation settings"
              aria-label="Punctuation settings"
              variant="secondary"
              className="w-full md:w-auto"
            >
              ⚙️ Settings
            </Button>
          </div>

          {/* Tip Text */}
          {showInstallTip && (
            <p className="text-xs md:text-sm text-slate-500" id="installTip">
              Tip: If the Install button is disabled, use your browser menu to "Add to Home Screen".
            </p>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <Card className="border border-slate-200">
              <h3 className="m-0 mb-4 text-lg font-bold text-slate-900">Punctuation Settings</h3>
              <label className="flex items-center gap-2.5 py-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.autoPunctuation}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, autoPunctuation: e.target.checked }))}
                  className="w-[18px] h-[18px] cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none">Auto punctuation</span>
              </label>
              <label className="flex items-center gap-2.5 py-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.detectQuestions}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, detectQuestions: e.target.checked }))}
                  disabled={!punctuationSettings.autoPunctuation}
                  className="w-[18px] h-[18px] cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none">Detect questions</span>
              </label>
              <label className="flex items-center gap-2.5 py-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.addPeriods}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, addPeriods: e.target.checked }))}
                  disabled={!punctuationSettings.autoPunctuation}
                  className="w-[18px] h-[18px] cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none">Add periods to statements</span>
              </label>
            </Card>
          )}

          {/* Transcript Panel */}
          <div className={`rounded-2xl border bg-slate-50/80 mt-2 transition-shadow ${
            listening 
              ? "border-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]" 
              : "border-slate-200 shadow-none"
          }`}>
            <div className="min-h-[280px] md:min-h-[340px] rounded-2xl bg-white/70 px-4 py-3 md:px-5 md:py-4 flex flex-col">
              <h2 className="sr-only">Live transcript</h2>
              <div className="h-full max-h-[420px] overflow-y-auto pr-1 text-base md:text-lg leading-relaxed text-slate-800">
                {transcript.length === 0 && !interimText ? (
                  <p className="text-slate-400 text-base md:text-lg italic">
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
              <div id="status" className="text-slate-500 text-sm md:text-base mt-3 text-left" aria-live="polite">
                {status}
              </div>
            </div>
          </div>
        </section>
        
        {/* Dedication */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs md:text-sm text-slate-400 italic">
            Hi Lauren! I hope you never miss a joke, a story, or a friend (like Lorelei) asking you to come play. 💚
          </p>
        </div>
      </main>
      
      <Footer 
        links={[
          { href: '#work', label: 'Work' },
          { href: '#about', label: 'About' },
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

