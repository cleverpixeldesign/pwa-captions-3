import { useState, useEffect, useRef } from 'react'
import { Header, Button, Card, Footer } from './cleverpixel-design-system/src';
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

function App() {
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [status, setStatus] = useState('')
  const [listening, setListening] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallTip, setShowInstallTip] = useState(false)
  const [punctuationSettings, setPunctuationSettings] = useState(PUNCTUATION_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  
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
          <em className="opacity-60 italic text-[var(--cp-ink)]/70">{interimText}</em>
        </>
      )
    }
    return transcript
  }

  return (
    <div className="w-screen min-h-screen">
      <div className="w-full px-6 py-6">
         <Header 
        navItems={[
          { href: '#work', label: 'Work' },
          { href: '#about', label: 'About' },
        ]}
        onContactClick={() => console.log('Contact clicked')}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold mb-4 text-[var(--cp-ink)]">Hearing Helper</h1>
      <p className="text-[var(--cp-ink)]/70 mb-8 text-lg">A simple, installable PWA that converts speech to live captions.</p>

      <div className="flex gap-4 flex-wrap mb-6" role="group" aria-label="app controls">
        <Button
          id="installBtn"
          onClick={handleInstall}
          disabled={!installPrompt}
          title="Install app"
          aria-label="Install app"
          variant="secondary"
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
          className="bg-[var(--cp-green)] hover:bg-[var(--cp-green)]/90 text-white"
        >
          Start Listening
        </Button>
        <Button
          id="stopBtn"
          onClick={() => stopListening(false)}
          disabled={!listening}
          title="Stop listening"
          aria-label="Stop listening"
          variant="primary"
          className="!bg-[var(--cp-red)] hover:!bg-[var(--cp-red)]/90 !text-white"
        >
          Stop
        </Button>
        <Button
          id="settingsBtn"
          onClick={() => setShowSettings(!showSettings)}
          title="Punctuation settings"
          aria-label="Punctuation settings"
          variant="secondary"
        >
          ⚙️ Settings
        </Button>
      </div>
      
      {showSettings && (
        <Card className="mb-6">
          <h3 className="m-0 mb-4 text-lg font-bold text-[var(--cp-ink)]">Punctuation Settings</h3>
          <label className="flex items-center gap-2.5 py-2 cursor-pointer text-[var(--cp-ink)]">
            <input
              type="checkbox"
              checked={punctuationSettings.autoPunctuation}
              onChange={(e) => setPunctuationSettings(prev => ({ ...prev, autoPunctuation: e.target.checked }))}
              className="w-[18px] h-[18px] cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="select-none">Auto punctuation</span>
          </label>
          <label className="flex items-center gap-2.5 py-2 cursor-pointer text-[var(--cp-ink)]">
            <input
              type="checkbox"
              checked={punctuationSettings.detectQuestions}
              onChange={(e) => setPunctuationSettings(prev => ({ ...prev, detectQuestions: e.target.checked }))}
              disabled={!punctuationSettings.autoPunctuation}
              className="w-[18px] h-[18px] cursor-pointer accent-[var(--cp-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="select-none">Detect questions</span>
          </label>
          <label className="flex items-center gap-2.5 py-2 cursor-pointer text-[var(--cp-ink)]">
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
      
      {showInstallTip && (
        <p className="text-[var(--cp-ink)]/60 text-sm mt-2 mb-4" id="installTip">
          Tip: If the Install button is disabled, use your browser menu to "Add to Home Screen".
        </p>
      )}

      <Card>
        <h2 className="sr-only">Live transcript</h2>
        <div
          id="transcript"
          className="min-h-[40vh] text-xl leading-relaxed tracking-wide text-left text-[var(--cp-ink)]"
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          {displayTranscript()}
        </div>
        <div id="status" className="text-[var(--cp-ink)]/60 text-[0.95rem] mt-3 text-left" aria-live="polite">
          {status}
        </div>
      </Card>
      </div>
      
      <Footer 
        links={[
          { href: '#work', label: 'Work' },
          { href: '#about', label: 'About' },
        ]}
        copyrightText="Crafted with playful precision"
      />
      </div>
    </div>
  )
}

export default App

