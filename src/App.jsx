import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Header, Button, Card, Footer } from './cleverpixel-design-system/src';
import Contact from './pages/Contact'
import InstallButton from './components/InstallButton'
import { CleverFidgetSpinner } from './components/CleverFidgetSpinner'
import { trackSettingsToggle, trackStartListening, trackStopListening } from './utils/analytics'
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
  const [punctuationSettings, setPunctuationSettings] = useState(PUNCTUATION_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  
  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)
  const punctuationSettingsRef = useRef(punctuationSettings)
  const transcriptRef = useRef('')
  const interimTimeoutRef = useRef(null)
  const lastInterimTextRef = useRef('')
  const lastProcessedFinalTextRef = useRef('')


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

    // recognition.onstart = () => {
    //   setStatus('Listening…')
    // }

    // recognition.onend = () => {
    //   if (listeningRef.current && recognitionRef.current) {
    //     setStatus('Reconnecting…')
    //     try {
    //       recognition.start()
    //     } catch (e) {
    //       // starting while started throws
    //     }
    //   } else {
    //     setStatus('Stopped')
    //   }
    // }

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
      // On iOS Safari, the same results can be processed multiple times
      // We need to deduplicate by checking what we've already added to the transcript
      let interim = ''
      let finalText = ''
      
      // Process results starting from resultIndex
      // On iOS, resultIndex might not work correctly, so we'll deduplicate by content
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const txt = res[0].transcript
        if (res.isFinal) {
          finalText += txt
        } else {
          interim += txt
        }
      }

      // Only process final text if we have new final text
      if (finalText && finalText.trim()) {
        // Clear any pending interim timeout since we have final text
        if (interimTimeoutRef.current) {
          clearTimeout(interimTimeoutRef.current)
          interimTimeoutRef.current = null
        }
        
        setTranscript(prev => {
          // Check if this text is already in the transcript to prevent duplicates
          // This handles iOS Safari's duplicate result events
          const trimmedFinal = finalText.trim()
          const currentTranscript = prev.trim()
          
          // If the transcript already ends with this text, skip it (duplicate)
          if (currentTranscript && currentTranscript.endsWith(trimmedFinal)) {
            return prev
          }
          
          // Also check if we just processed this exact text
          if (trimmedFinal === lastProcessedFinalTextRef.current) {
            return prev
          }
          
          // Check if this is a new sentence (previous text ends with punctuation or is empty)
          const isNewSentence = !prev || /[.!?]\s*$/.test(prev.trim())
          const punctuated = addPunctuation(finalText, punctuationSettingsRef.current, isNewSentence)
          
          // Final check: make sure the punctuated text isn't already at the end
          const trimmedPunctuated = punctuated.trim()
          if (currentTranscript && currentTranscript.endsWith(trimmedPunctuated)) {
            return prev
          }
          
          // Update the last processed final text
          lastProcessedFinalTextRef.current = trimmedFinal
          
          // Add space between sentences if previous text doesn't end with space
          const separator = prev && !prev.endsWith(' ') ? ' ' : ''
          const newTranscript = prev + separator + punctuated + ' '
          transcriptRef.current = newTranscript
          return newTranscript
        })
        setInterimText('') // Clear interim when final text is added
        lastInterimTextRef.current = ''
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
        lastInterimTextRef.current = capitalizedInterim
        
        // Clear any existing timeout
        if (interimTimeoutRef.current) {
          clearTimeout(interimTimeoutRef.current)
        }
        
        // Set a timeout to finalize interim text if it hasn't changed
        // This makes sentence endings appear faster
        interimTimeoutRef.current = setTimeout(() => {
          const currentInterim = lastInterimTextRef.current
          if (currentInterim && currentInterim.trim().length > 0) {
            // Finalize the interim text
            setTranscript(prev => {
              const currentTranscript = transcriptRef.current
              const isNewSentence = !currentTranscript || /[.!?]\s*$/.test(currentTranscript.trim())
              const punctuated = addPunctuation(currentInterim.trim(), punctuationSettingsRef.current, isNewSentence)
              
              const separator = prev && !prev.endsWith(' ') ? ' ' : ''
              const newTranscript = prev + separator + punctuated + ' '
              transcriptRef.current = newTranscript
              return newTranscript
            })
            setInterimText('')
            lastInterimTextRef.current = ''
          }
        }, 600) // Finalize after 0.6 seconds of no new speech
      } else {
        setInterimText('')
        lastInterimTextRef.current = ''
        // Clear timeout when interim is cleared
        if (interimTimeoutRef.current) {
          clearTimeout(interimTimeoutRef.current)
          interimTimeoutRef.current = null
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      // Clean up timeout on unmount
      if (interimTimeoutRef.current) {
        clearTimeout(interimTimeoutRef.current)
        interimTimeoutRef.current = null
      }
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
    
    // Reset tracking ref when starting fresh
    lastProcessedFinalTextRef.current = ''
    
    setListening(true)
    trackStartListening()
  }

  const stopListening = (force = false) => {
    if (!recognitionRef.current) return
    
    // Clear any pending interim timeout
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current)
      interimTimeoutRef.current = null
    }
    
    // Finalize any remaining interim text before stopping
    const currentInterim = lastInterimTextRef.current
    if (currentInterim && currentInterim.trim().length > 0) {
      setTranscript(prev => {
        const currentTranscript = transcriptRef.current
        const isNewSentence = !currentTranscript || /[.!?]\s*$/.test(currentTranscript.trim())
        const punctuated = addPunctuation(currentInterim.trim(), punctuationSettingsRef.current, isNewSentence)
        
        const separator = prev && !prev.endsWith(' ') ? ' ' : ''
        const newTranscript = prev + separator + punctuated + ' '
        transcriptRef.current = newTranscript
        return newTranscript
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
    lastProcessedFinalTextRef.current = ''
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
      
      <InstallButton />
      
        <main className="max-w-5xl mx-auto px-4 pt-6 pb-10 md:px-6 md:pt-10 md:pb-16">
          {/* Dedication */}
          <div className="text-center mb-6">
            <p className="text-lg md:text-base text-slate-400 italic">
              Hi Lauren! I hope this helps you never miss a joke, a story, or a friend (like Lorelei) asking you to come play. 💚
            </p>
          </div>
          
          <section className="relative rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7 space-y-4">
          {/* Settings Button - Top Right */}
          <button
            id="settingsBtn"
            onClick={() => {
              const newState = !showSettings;
              setShowSettings(newState);
              trackSettingsToggle(newState);
            }}
            title="Punctuation settings"
            aria-label="Punctuation settings"
            className="absolute top-4 right-4 md:top-5 md:right-6 p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2"
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
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              <span className="inline-flex items-center gap-3">
                <span>Hear Buddy</span>
                <img 
                  src="/assets/HearBuddy.svg" 
                  alt="Hear Buddy mascot" 
                  className="w-20 h-20 md:w-20 md:h-20"
                  title="Hear Buddy"
                />
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
          </header>

          {/* Button Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-3">
            {listening ? (
              <Button
                id="stopBtn"
                onClick={() => stopListening(false)}
                title="Stop listening"
                aria-label="Stop listening"
                variant="primary"
                className="w-full md:w-auto !bg-[var(--cp-red)] hover:!bg-[var(--cp-red)]/90 !text-white"
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
                className="w-full md:w-auto bg-[var(--cp-green)] hover:bg-[var(--cp-green)]/90 text-white"
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
                className="w-full md:w-auto"
              >
                Clear
              </Button>
            )}
          </div>


          {/* Settings Panel */}
          {showSettings && (
            <Card className="absolute top-12 right-4 md:top-14 md:right-6 z-10 w-56 border border-slate-200 shadow-lg">
              <h3 className="m-0 mb-2 text-sm font-bold text-slate-900">Punctuation Settings</h3>
              {/* <label className="flex items-center gap-2 py-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.autoPunctuation}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, autoPunctuation: e.target.checked }))}
                  className="w-4 h-4 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Auto punctuation</span>
              </label> */}
              <label className="flex items-center gap-2 py-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.detectQuestions}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, detectQuestions: e.target.checked }))}
                  disabled={!punctuationSettings.autoPunctuation}
                  className="w-4 h-4 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Detect questions</span>
              </label>
              <label className="flex items-center gap-2 py-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={punctuationSettings.addPeriods}
                  onChange={(e) => setPunctuationSettings(prev => ({ ...prev, addPeriods: e.target.checked }))}
                  disabled={!punctuationSettings.autoPunctuation}
                  className="w-4 h-4 cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="select-none text-sm">Add periods to statements</span>
              </label>
            </Card>
          )}

          {/* Transcript Panel */}
          <article className={`rounded-2xl border bg-slate-50/80 mt-2 transition-shadow ${
            listening 
              ? "border-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]" 
              : "border-slate-200 shadow-none"
          }`}>
            <div className="min-h-[280px] md:min-h-[340px] rounded-2xl bg-white/70 px-4 py-3 md:px-5 md:py-4 flex flex-col">
              <h2 className="sr-only">Live transcript</h2>
              <div className="h-full max-h-[420px] overflow-y-auto pr-1 text-lg md:text-xl leading-relaxed text-slate-800">
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
              <div id="status" className="text-slate-500 text-sm md:text-base mt-3 text-left" aria-live="polite">
                {status}
              </div>
            </div>
          </article>
          
          {/* Fidget spinner in bottom-right of the card */}
          <div className="hidden sm:block absolute bottom-4 right-4">
            <CleverFidgetSpinner />
          </div>
        </section>
      </main>
      
      <Footer 
        links={[
          { href: 'https://buymeacoffee.com/michellereeves', label: '☕ Buy Me a Coffee', target: '_blank', rel: 'noopener noreferrer' },
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

