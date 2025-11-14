import { useState, useEffect, useRef, useCallback } from 'react'
import { addPunctuation, capitalizeFirst, isNewSentence, buildTranscript } from '../utils/textProcessing'

/**
 * Custom hook for managing Web Speech API recognition
 * Encapsulates all speech recognition logic, state, and lifecycle management
 */
export function useSpeechRecognition(punctuationSettings) {
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [status, setStatus] = useState('')
  const [listening, setListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  
  // Refs for synchronous access and performance
  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)
  const transcriptRef = useRef('')
  const lastInterimTextRef = useRef('')
  const lastFinalTextRef = useRef('')
  const punctuationSettingsRef = useRef(punctuationSettings)
  
  // Update settings ref when settings change
  useEffect(() => {
    punctuationSettingsRef.current = punctuationSettings
  }, [punctuationSettings])
  
  // Update transcript ref when transcript changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])
  
  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setIsSupported(false)
      setStatus(
        'Speech Recognition is not supported on this browser. Try Chrome or Edge on desktop, or Chrome on Android.'
      )
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    
    // Error handler
    recognition.onerror = (event) => {
      const error = event.error || 'unknown'
      
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Speech recognition error:', event)
      }
      
      const errorMessage = error === 'not-allowed'
        ? 'Microphone access denied. Please allow mic permissions in your browser settings.'
        : `Mic error: ${error}`
      
      setStatus(errorMessage)
      
      // Stop recognition on permission denial
      if (error === 'not-allowed') {
        listeningRef.current = false
        setListening(false)
        try {
          recognition.stop()
          recognition.abort()
        } catch (err) {
          // Silently handle cleanup errors
          if (process.env.NODE_ENV === 'development') {
            console.error('Error stopping recognition:', err)
          }
        }
      }
    }
    
    // Result handler - optimized for performance
    recognition.onresult = (event) => {
      if (!event.results || event.results.length === 0) return
      
      let interimChunk = ''
      let finalChunk = ''
      
      // Process only new results from resultIndex onward
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result?.[0]) continue
        
        const text = result[0].transcript
        if (result.isFinal) {
          finalChunk += text
        } else {
          interimChunk += text
        }
      }
      
      // Cache values to avoid repeated calculations
      const currentTranscript = transcriptRef.current
      const isNew = isNewSentence(currentTranscript)
      
      // Handle final text
      if (finalChunk?.trim()) {
        const trimmedFinal = finalChunk.trim()
        
        // Duplicate prevention
        if (trimmedFinal === lastFinalTextRef.current) {
          setInterimText('')
          lastInterimTextRef.current = ''
          return
        }
        
        // Apply text processing
        const processedText = punctuationSettingsRef.current.autoPunctuation
          ? addPunctuation(trimmedFinal, punctuationSettingsRef.current, isNew)
          : isNew ? capitalizeFirst(trimmedFinal) : trimmedFinal
        
        const nextTranscript = buildTranscript(currentTranscript, processedText)
        
        // Update refs synchronously
        transcriptRef.current = nextTranscript
        lastFinalTextRef.current = trimmedFinal
        lastInterimTextRef.current = ''
        
        // Batch state updates
        setTranscript(nextTranscript)
        setInterimText('')
      }
      // Handle interim text
      else if (interimChunk) {
        const displayInterim = isNew ? capitalizeFirst(interimChunk) : interimChunk
        lastInterimTextRef.current = displayInterim
        setInterimText(displayInterim)
      }
      // Clear interim if no new content
      else if (!finalChunk) {
        lastInterimTextRef.current = ''
        setInterimText('')
      }
    }
    
    recognitionRef.current = recognition
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          recognitionRef.current.abort()
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error cleaning up recognition:', error)
          }
        }
      }
    }
  }, []) // Only initialize once
  
  // Handle listening state changes
  useEffect(() => {
    listeningRef.current = listening
    
    if (!recognitionRef.current) return
    
    if (listening) {
      try {
        setStatus('') // Clear any previous errors
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting recognition:', error)
        setStatus('Error starting speech recognition. Please try again.')
        setListening(false)
        listeningRef.current = false
      }
    } else {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        // Silently handle stop errors
      }
    }
  }, [listening])
  
  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return
    
    lastFinalTextRef.current = ''
    setStatus('')
    setListening(true)
  }, [listening])
  
  // Stop listening
  const stopListening = useCallback((force = false) => {
    if (!recognitionRef.current) return
    
    // Finalize any remaining interim text
    const currentInterim = lastInterimTextRef.current
    if (currentInterim?.trim()) {
      const trimmedInterim = currentInterim.trim()
      
      setTranscript((prev) => {
        const prevTrimmed = prev.trim()
        // Avoid duplicates
        if (prevTrimmed.endsWith(trimmedInterim) || prevTrimmed.endsWith(trimmedInterim + ' ')) {
          return prev
        }
        
        const next = buildTranscript(prev, trimmedInterim)
        transcriptRef.current = next
        lastFinalTextRef.current = trimmedInterim
        return next
      })
    }
    
    setListening(false)
    setInterimText('')
    lastInterimTextRef.current = ''
    
    if (force && recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (error) {
        // Silently handle abort errors
      }
    }
  }, [])
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('')
    transcriptRef.current = ''
    setInterimText('')
    lastInterimTextRef.current = ''
    lastFinalTextRef.current = ''
  }, [])
  
  return {
    transcript,
    interimText,
    status,
    listening,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  }
}

