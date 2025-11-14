// Text processing utilities for speech recognition
// Extracted for better testability and reusability

// Question detection patterns (compiled once)
const QUESTION_WORDS = /\b(what|where|when|who|why|how|which|whose|whom)\b/i
const QUESTION_STARTERS = /\b(is|are|was|were|do|does|did|can|could|would|should|will|shall|may|might|have|has|had)\b/i
const QUESTION_ENDINGS = /\b(right|correct|okay|ok|sure|huh|eh)\s*$/i
const HAS_PUNCTUATION = /[.!?]$/
const IS_NEW_SENTENCE = /[.!?]\s*$/

// Cache for split words to avoid repeated string operations
const wordCache = new Map()

function getWords(text) {
  if (wordCache.has(text)) {
    return wordCache.get(text)
  }
  const words = text.split(/\s+/)
  // Limit cache size to prevent memory leaks
  if (wordCache.size > 100) {
    const firstKey = wordCache.keys().next().value
    wordCache.delete(firstKey)
  }
  wordCache.set(text, words)
  return words
}

/**
 * Detect if text is a question based on linguistic patterns
 * @param {string} text - The text to analyze
 * @param {object} config - Configuration with detectQuestions flag
 * @returns {boolean}
 */
export function isQuestion(text, config) {
  if (!config?.detectQuestions || !text) return false
  
  const trimmed = text.trim()
  if (!trimmed || trimmed.endsWith('?')) return false
  
  const words = getWords(trimmed)
  const firstWord = words[0]
  
  // Check for question words at the start
  if (QUESTION_WORDS.test(firstWord)) return true
  
  // Check for question starters (inverted questions like "Is it...")
  if (words.length > 0 && QUESTION_STARTERS.test(firstWord)) {
    if (QUESTION_ENDINGS.test(trimmed) || QUESTION_WORDS.test(trimmed)) {
      return true
    }
    if (words.length <= 5) return true
  }
  
  // Check for question endings
  if (QUESTION_ENDINGS.test(trimmed)) return true
  
  // Check if sentence contains question words early in the text
  if (QUESTION_WORDS.test(trimmed)) {
    const questionWordIndex = trimmed.search(QUESTION_WORDS)
    if (questionWordIndex < trimmed.length * 0.3) return true
  }
  
  return false
}

/**
 * Capitalize first letter of text
 * @param {string} text
 * @returns {string}
 */
export function capitalizeFirst(text) {
  if (!text) return text
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Check if text is a new sentence (follows sentence-ending punctuation)
 * @param {string} text
 * @returns {boolean}
 */
export function isNewSentence(text) {
  return !text || IS_NEW_SENTENCE.test(text.trim())
}

/**
 * Add appropriate punctuation to text based on config and context
 * @param {string} text
 * @param {object} config - Punctuation configuration
 * @param {boolean} isNew - Whether this starts a new sentence
 * @returns {string}
 */
export function addPunctuation(text, config, isNew = false) {
  if (!text) return text
  
  let trimmed = text.trim()
  if (!trimmed) return trimmed
  
  // Handle non-auto punctuation case
  if (!config?.autoPunctuation) {
    return isNew ? capitalizeFirst(trimmed) : trimmed
  }
  
  // Capitalize if new sentence
  if (isNew) {
    trimmed = capitalizeFirst(trimmed)
  }
  
  // Check if it already has punctuation
  if (HAS_PUNCTUATION.test(trimmed)) {
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

/**
 * Build transcript text with proper spacing
 * @param {string} currentText
 * @param {string} newText
 * @returns {string}
 */
export function buildTranscript(currentText, newText) {
  if (!newText) return currentText
  const separator = currentText && !currentText.endsWith(' ') ? ' ' : ''
  return currentText + separator + newText + ' '
}

