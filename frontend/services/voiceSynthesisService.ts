/**
 * Enhanced Voice Synthesis Service
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Features:
 * - Natural prosody and intonation with neural TTS simulation
 * - Multiple voice profiles (age, gender, accent)
 * - Context-aware voice adaptation (formal, conversational, urgent)
 * - Emotional tone modulation
 * - Advanced voice enhancement: vibrato, pitch contours, breathing
 * - SSML support for fine-grained control
 * - Quality metrics and A/B testing support
 * - Low-latency performance optimization
 * - Nova voice enforcement for executive delivery
 * - Punctuation announcement filtering
 * - Professional C-level summary readouts
 * - Voice age/gender parameter tuning
 * - Hesitation and natural speech pattern insertion
 * 
 * @version 2.2.0 - Enhanced for natural, human-like voice quality
 */

import {
  EMOTIONAL_PROFILES,
  PROSODY_PATTERNS,
  VOICE_AGE_GENDER_PRESETS,
  PRONUNCIATION_CONTEXTS,
  BREATHING_PATTERNS,
  analyzeRoboticFactors,
  calculateNaturalSettings,
  generateHesitations,
  createPitchContour,
  EmotionalProfile,
  VoiceAgeGenderParams,
  BreathingPattern
} from './voiceProfileEnhancement';

// ==========================================
// EXECUTIVE VOICE CONFIGURATION
// ==========================================

/** Default voice profile for all interactions */
const DEFAULT_VOICE_PROFILE_ID = 'nova';

/** Default emotional tone - neutral for professional delivery */
const DEFAULT_EMOTIONAL_TONE: NonNullable<VoiceContext['emotionalTone']> = 'neutral';

/** Voice drift prevention - maximum allowed deviation from Nova */
const VOICE_CONSISTENCY_CHECK_INTERVAL = 5000; // ms

/** Punctuation patterns to suppress during speech */
const PUNCTUATION_SPEECH_SUPPRESSIONS = [
  // Suppress "full stop" / "period" announcements
  /\bfull\s*stop\b/gi,
  /\bperiod\b(?!\s+of|\s+time|\s+from)/gi,  // Keep "period of time"
  
  // Suppress "comma" announcements
  /\bcomma\b/gi,
  
  // Suppress "colon" / "semicolon" announcements
  /\bcolon\b(?!oscopy)/gi,  // Keep medical terms
  /\bsemi-?colon\b/gi,
  
  // Suppress "dash" / "hyphen" announcements
  /\bdash\b(?!board)/gi,  // Keep "dashboard"
  /\bhyphen\b/gi,
  
  // Suppress "parenthesis" / "bracket" announcements
  /\bopen\s*(?:parenthesis|paren|bracket)\b/gi,
  /\bclose\s*(?:parenthesis|paren|bracket)\b/gi,
  /\bleft\s*(?:parenthesis|paren|bracket)\b/gi,
  /\bright\s*(?:parenthesis|paren|bracket)\b/gi,
  
  // Suppress "quote" announcements
  /\bquote\b/gi,
  /\bunquote\b/gi,
  /\bend\s*quote\b/gi,
  
  // Suppress other punctuation announcements
  /\bexclamation\s*(?:mark|point)\b/gi,
  /\bquestion\s*mark\b/gi,
  /\bellipsis\b/gi,
  /\basterisk\b/gi,
  /\bampersand\b/gi,
  /\bslash\b(?!\s+(?:and|or))/gi,  // Keep "slash and"
  /\bbackslash\b/gi,
  /\bunderscore\b/gi,
  /\bat\s*sign\b/gi,
  /\bhash(?:tag)?\s*(?:sign|symbol)?\b/gi,
  /\bpound\s*sign\b/gi,
  /\bpercent\s*sign\b/gi,
  /\bdollar\s*sign\b/gi,
];

/** Executive pause configuration for natural C-level delivery */
const EXECUTIVE_PAUSE_CONFIG = {
  // Sentence-level pauses (based on ending punctuation)
  sentenceEnd: {
    period: 500,      // Full stop - moderate pause
    exclamation: 450,  // Exclamation - slightly shorter
    question: 550,     // Question - longer for consideration
  },
  // Clause-level pauses
  clausePause: {
    comma: 200,        // Light pause for breath
    semicolon: 350,    // Medium pause for related thoughts
    colon: 400,        // Pause before explanation
    dash: 300,         // Dramatic pause
  },
  // Content-based pauses
  contentPause: {
    paragraph: 700,    // Between paragraphs
    listItem: 250,     // Between bullet points
    number: 150,       // Before important numbers
    emphasis: 200,     // Before emphasized content
  },
  // Executive-specific pauses
  executive: {
    sectionTransition: 800,   // Between report sections
    keyFinding: 400,          // Before key findings
    recommendation: 350,      // Before recommendations
    callout: 450,             // Before warnings/alerts
  }
};

/** Voice validation result */
interface VoiceValidationResult {
  isValid: boolean;
  currentProfile: string;
  expectedProfile: string;
  driftDetected: boolean;
  correctionApplied: boolean;
}

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'adult' | 'mature';
  accent: 'american' | 'british' | 'australian' | 'indian' | 'neutral';
  description: string;
  voiceNames: string[]; // Browser voice name preferences
  baseSettings: VoiceSettings;
}

export interface VoiceSettings {
  rate: number;        // 0.5 - 2.0, default 1.0
  pitch: number;       // 0.5 - 2.0, default 1.0
  volume: number;      // 0 - 1.0, default 1.0
  emphasis: number;    // 0 - 1.0, amount of prosody variation
  breathPauses: boolean;
  naturalPauses: boolean;
  // Enhanced naturalness parameters
  emotionalTone?: 'neutral' | 'happy' | 'serious' | 'excited' | 'concerned' | 'confident' | 'surprised' | 'sad';
  ageGenderPreset?: string;  // e.g., 'adult-female', 'mature-male'
  vibratoRate?: number;  // 4-8 Hz for natural vibrato
  vibratoDepth?: number;  // 10-50 cents
  pitchVariation?: number;  // 0-1, amount of natural pitch variation
  rateVariation?: number;  // 0-1, amount of rate fluctuation
  breathingFrequency?: number;  // pauses per 100 words
  hesitations?: boolean;  // Include natural hesitations
  smoothTransitions?: boolean;  // Smooth phoneme transitions
  energyContour?: number[];  // Dynamic energy per word
}

export interface VoiceContext {
  type: 'alert' | 'warning' | 'success' | 'info' | 'conversational' | 'executive' | 'urgent';
  emotionalTone?: 'neutral' | 'reassuring' | 'urgent' | 'concerned' | 'confident' | 'friendly' | 'happy' | 'serious' | 'excited' | 'surprised' | 'sad';
  importance?: 'low' | 'medium' | 'high' | 'critical';
  audience?: 'general' | 'technical' | 'leadership' | 'executive';  // Target audience
  prosodyPattern?: 'statement' | 'question' | 'emphasis' | 'continuation' | 'excited';
  breathingPattern?: 'natural' | 'formal' | 'casual' | 'excited' | 'measured';
}

export interface SpeechSegment {
  text: string;
  pauseAfter?: number;  // ms
  rate?: number;
  pitch?: number;
  emphasis?: boolean;
}

export interface VoiceQualityMetrics {
  synthesisLatency: number;   // ms
  utteranceLength: number;    // characters
  naturalPausesInserted: number;
  emotionalAdaptations: number;
  userRating?: number;        // 1-5
  sessionId: string;
  timestamp: Date;
}

// ==========================================
// VOICE PROFILES
// ==========================================

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'aria',
    name: 'Aria',
    gender: 'female',
    age: 'adult',
    accent: 'american',
    description: 'Clear and professional female voice, ideal for technical briefings',
    voiceNames: ['Samantha', 'Google US English', 'Microsoft Zira', 'Karen', 'Allison'],
    baseSettings: {
      rate: 1.0,
      pitch: 1.05,
      volume: 1.0,
      emphasis: 0.6,
      breathPauses: true,
      naturalPauses: true
    }
  },
  {
    id: 'marcus',
    name: 'Marcus',
    gender: 'male',
    age: 'adult',
    accent: 'american',
    description: 'Confident male voice with authoritative tone',
    voiceNames: ['Alex', 'Google US English Male', 'Microsoft David', 'Daniel', 'Tom'],
    baseSettings: {
      rate: 0.95,
      pitch: 0.9,
      volume: 1.0,
      emphasis: 0.5,
      breathPauses: true,
      naturalPauses: true
    }
  },
  {
    id: 'sophia',
    name: 'Sophia',
    gender: 'female',
    age: 'young',
    accent: 'british',
    description: 'Warm British accent, friendly and approachable',
    voiceNames: ['Google UK English Female', 'Microsoft Hazel', 'Kate', 'Serena', 'Moira'],
    baseSettings: {
      rate: 1.05,
      pitch: 1.1,
      volume: 1.0,
      emphasis: 0.7,
      breathPauses: true,
      naturalPauses: true
    }
  },
  {
    id: 'james',
    name: 'James',
    gender: 'male',
    age: 'mature',
    accent: 'british',
    description: 'Mature British voice, authoritative and reassuring',
    voiceNames: ['Google UK English Male', 'Microsoft George', 'Oliver', 'Arthur'],
    baseSettings: {
      rate: 0.92,
      pitch: 0.85,
      volume: 1.0,
      emphasis: 0.4,
      breathPauses: true,
      naturalPauses: true
    }
  },
  {
    id: 'priya',
    name: 'Priya',
    gender: 'female',
    age: 'adult',
    accent: 'indian',
    description: 'Clear Indian English accent, professional and articulate',
    voiceNames: ['Google Indian English', 'Microsoft Heera', 'Veena', 'Lekha'],
    baseSettings: {
      rate: 0.98,
      pitch: 1.05,
      volume: 1.0,
      emphasis: 0.55,
      breathPauses: true,
      naturalPauses: true
    }
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'neutral',
    age: 'adult',
    accent: 'neutral',
    description: 'Professional executive voice optimized for C-level summaries and clarity',
    voiceNames: [
      'Microsoft Zira',      // Windows - clear and professional
      'Samantha',            // macOS - natural female voice
      'Google US English',   // Chrome - consistent quality
      'Alex',                // macOS fallback - neutral male
      'Microsoft David',     // Windows fallback
      'Karen',               // Safari - Australian English (clear)
    ],
    baseSettings: {
      rate: 0.92,           // Slightly slower for executive comprehension
      pitch: 1.0,           // Neutral pitch
      volume: 1.0,          // Full volume
      emphasis: 0.35,       // Subtle emphasis - professional tone
      breathPauses: true,   // Natural breathing pauses
      naturalPauses: true   // Context-aware pauses
    }
  }
];

// Nova-specific executive settings override
const NOVA_EXECUTIVE_OVERRIDE: Partial<VoiceSettings> = {
  rate: 0.90,              // Executive pace - measured delivery
  pitch: 0.98,             // Slightly lower - authoritative
  emphasis: 0.30,          // Minimal emphasis - professional
  breathPauses: true,
  naturalPauses: true
};

// ==========================================
// CONTEXT-BASED VOICE MODULATION
// ==========================================

const CONTEXT_MODULATIONS: Record<VoiceContext['type'], Partial<VoiceSettings>> = {
  alert: {
    rate: 1.1,
    pitch: 1.15,
    emphasis: 0.8
  },
  warning: {
    rate: 1.05,
    pitch: 1.1,
    emphasis: 0.7
  },
  success: {
    rate: 1.0,
    pitch: 1.05,
    emphasis: 0.6
  },
  info: {
    rate: 1.0,
    pitch: 1.0,
    emphasis: 0.5
  },
  conversational: {
    rate: 1.02,
    pitch: 1.0,
    emphasis: 0.65
  },
  executive: {
    rate: 0.95,
    pitch: 0.95,
    emphasis: 0.4
  },
  urgent: {
    rate: 1.15,
    pitch: 1.2,
    emphasis: 0.9
  }
};

const EMOTIONAL_TONE_MODULATIONS: Record<NonNullable<VoiceContext['emotionalTone']>, Partial<VoiceSettings>> = {
  neutral: {},
  reassuring: {
    rate: 0.95,
    pitch: 0.98,
    emphasis: 0.4
  },
  urgent: {
    rate: 1.12,
    pitch: 1.15,
    emphasis: 0.85
  },
  concerned: {
    rate: 0.98,
    pitch: 1.05,
    emphasis: 0.6
  },
  confident: {
    rate: 1.0,
    pitch: 0.95,
    emphasis: 0.55
  },
  friendly: {
    rate: 1.02,
    pitch: 1.08,
    emphasis: 0.7
  }
};

// ==========================================
// PROSODY PATTERNS FOR NATURAL SPEECH
// ==========================================

interface ProsodyPattern {
  pattern: RegExp;
  pauseAfter: number;
  pitchShift?: number;
  rateShift?: number;
}

const PROSODY_PATTERNS: ProsodyPattern[] = [
  // Sentence endings - longer pauses
  { pattern: /[.!?]\s*/g, pauseAfter: 400, pitchShift: -0.1 },
  
  // Semicolons and colons - medium pauses
  { pattern: /[;:]\s*/g, pauseAfter: 300 },
  
  // Commas - short pauses
  { pattern: /,\s*/g, pauseAfter: 150 },
  
  // Numbers and statistics - slight pause before for emphasis
  { pattern: /\d+[,.]?\d*%?/g, pauseAfter: 100, rateShift: -0.05 },
  
  // Key terms - emphasis
  { pattern: /\b(critical|urgent|important|warning|alert|danger)\b/gi, pauseAfter: 50, pitchShift: 0.1, rateShift: -0.1 },
  
  // Positive terms - slight upward inflection
  { pattern: /\b(success|secure|safe|excellent|improved)\b/gi, pauseAfter: 50, pitchShift: 0.05 },
  
  // Negative terms - concerned tone
  { pattern: /\b(vulnerable|risk|threat|problem|issue|failed)\b/gi, pauseAfter: 50, pitchShift: -0.05, rateShift: -0.05 },
  
  // Parenthetical phrases
  { pattern: /\([^)]+\)/g, pauseAfter: 200, rateShift: 0.05 },
  
  // Dashes - dramatic pause
  { pattern: /\s*[-–—]\s*/g, pauseAfter: 250 },
  
  // List items
  { pattern: /^\s*[•\-\*]\s*/gm, pauseAfter: 100 },
];

// ==========================================
// BREATH AND NATURAL PAUSE PATTERNS
// ==========================================

const BREATH_INSERTION_POINTS = [
  // After every ~40-60 words
  { wordThreshold: 50, pauseDuration: 150 },
  // At paragraph boundaries
  { marker: '\n\n', pauseDuration: 400 },
  // Before important numbers
  { pattern: /\b(total|approximately|about|around)\s+\d/gi, pauseDuration: 100 },
];

// ==========================================
// MAIN VOICE SYNTHESIS SERVICE CLASS
// ==========================================

export class VoiceSynthesisService {
  private currentProfile: VoiceProfile;
  private settings: VoiceSettings;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private metrics: VoiceQualityMetrics[] = [];
  private sessionId: string;
  private onSpeakingChange?: (speaking: boolean) => void;
  private abTestGroup: 'control' | 'enhanced' = 'enhanced';
  
  // Voice consistency tracking
  private voiceLocked: boolean = true;  // Lock to Nova by default
  private lastVoiceValidation: number = 0;
  private voiceDriftCount: number = 0;
  private executiveMode: boolean = true;  // Default to executive mode
  
  // Voice enhancement parameters
  private currentEmotionalTone: EmotionalProfile['name'] = 'neutral';
  private currentVoiceAgeGender: VoiceAgeGenderParams | null = null;
  private pitchContour: number[] = [];
  private breathingPattern: BreathingPattern = BREATHING_PATTERNS.natural;
  private enhancementEnabled: boolean = true;

  constructor(profileId?: string) {
    this.sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // CRITICAL: Always initialize with Nova profile for consistency
    // Ignore passed profileId to enforce Nova as default
    const enforceNovaProfile = DEFAULT_VOICE_PROFILE_ID;
    this.currentProfile = VOICE_PROFILES.find(p => p.id === enforceNovaProfile) || 
                          VOICE_PROFILES.find(p => p.id === 'nova') ||
                          VOICE_PROFILES[0];
    
    // Apply executive mode settings
    this.settings = { 
      ...this.currentProfile.baseSettings,
      ...(this.executiveMode ? NOVA_EXECUTIVE_OVERRIDE : {})
    };
    
    // Load persisted settings from localStorage
    this.loadPersistedSettings();
    
    this.initializeVoices();
    
    // Start voice consistency monitoring
    this.startVoiceConsistencyMonitor();
    
    console.log(`[VoiceSynthesis] Initialized with Nova profile (executive mode: ${this.executiveMode})`);
  }

  /**
   * Load persisted voice settings from localStorage
   */
  private loadPersistedSettings(): void {
    try {
      const stored = localStorage.getItem('sre_voice_config');
      if (stored) {
        const config = JSON.parse(stored);
        // Only restore non-profile settings (keep Nova enforced)
        if (config.executiveMode !== undefined) {
          this.executiveMode = config.executiveMode;
        }
        // Always ensure Nova profile
        if (config.profileId !== 'nova') {
          console.log('[VoiceSynthesis] Resetting to Nova profile (was: ' + config.profileId + ')');
        }
      }
    } catch (e) {
      console.warn('[VoiceSynthesis] Could not load persisted settings');
    }
  }

  /**
   * Persist voice settings to localStorage
   */
  private persistSettings(): void {
    try {
      const config = {
        profileId: 'nova',  // Always persist Nova
        executiveMode: this.executiveMode,
        voiceLocked: this.voiceLocked,
        timestamp: Date.now()
      };
      localStorage.setItem('sre_voice_config', JSON.stringify(config));
    } catch (e) {
      console.warn('[VoiceSynthesis] Could not persist settings');
    }
  }

  /**
   * Start voice consistency monitoring to prevent drift
   */
  private startVoiceConsistencyMonitor(): void {
    setInterval(() => {
      if (this.voiceLocked) {
        const validation = this.validateVoiceConsistency();
        if (!validation.isValid) {
          this.voiceDriftCount++;
          console.warn(`[VoiceSynthesis] Voice drift detected (count: ${this.voiceDriftCount}). Correcting...`);
        }
      }
    }, VOICE_CONSISTENCY_CHECK_INTERVAL);
  }

  /**
   * Validate voice consistency - ensure Nova profile is active
   */
  validateVoiceConsistency(): VoiceValidationResult {
    const expectedProfile = DEFAULT_VOICE_PROFILE_ID;
    const currentProfile = this.currentProfile.id;
    const driftDetected = currentProfile !== expectedProfile;
    let correctionApplied = false;

    if (driftDetected && this.voiceLocked) {
      // Auto-correct to Nova
      this.currentProfile = VOICE_PROFILES.find(p => p.id === expectedProfile) || this.currentProfile;
      this.settings = {
        ...this.currentProfile.baseSettings,
        ...(this.executiveMode ? NOVA_EXECUTIVE_OVERRIDE : {})
      };
      this.selectBestVoice();
      correctionApplied = true;
    }

    this.lastVoiceValidation = Date.now();

    return {
      isValid: !driftDetected,
      currentProfile,
      expectedProfile,
      driftDetected,
      correctionApplied
    };
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private initializeVoices(): void {
    if (!window.speechSynthesis) {
      console.warn('[VoiceSynthesis] Speech synthesis not supported');
      return;
    }

    const loadVoices = () => {
      this.availableVoices = window.speechSynthesis.getVoices();
      this.selectBestVoice();
    };

    // Voices may load asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  private selectBestVoice(): void {
    for (const voiceName of this.currentProfile.voiceNames) {
      const voice = this.availableVoices.find(v => 
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
      if (voice) {
        this.selectedVoice = voice;
        console.log(`[VoiceSynthesis] Selected voice: ${voice.name}`);
        return;
      }
    }
    
    // Fallback to first English voice
    this.selectedVoice = this.availableVoices.find(v => v.lang.startsWith('en')) || null;
    if (this.selectedVoice) {
      console.log(`[VoiceSynthesis] Fallback voice: ${this.selectedVoice.name}`);
    }
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  /**
   * Set the voice profile
   * NOTE: When voiceLocked is true (default), only Nova profile is allowed
   * This ensures consistent executive-level voice delivery
   */
  setProfile(profileId: string): void {
    // Enforce Nova lock for consistent executive delivery
    if (this.voiceLocked && profileId !== DEFAULT_VOICE_PROFILE_ID) {
      console.warn(`[VoiceSynthesis] Voice locked to Nova profile. Ignoring request for: ${profileId}`);
      console.log('[VoiceSynthesis] To unlock voice, call unlockVoice() first.');
      return;  // Prevent voice drift
    }

    const profile = VOICE_PROFILES.find(p => p.id === profileId);
    if (profile) {
      this.currentProfile = profile;
      this.settings = { 
        ...profile.baseSettings,
        ...(this.executiveMode && profileId === 'nova' ? NOVA_EXECUTIVE_OVERRIDE : {})
      };
      this.selectBestVoice();
      this.persistSettings();  // Persist the profile change
      console.log(`[VoiceSynthesis] Profile set to: ${profileId}`);
    }
  }

  /**
   * Unlock voice profile changing (use with caution)
   * Calling this allows other voice profiles to be selected
   */
  unlockVoice(): void {
    this.voiceLocked = false;
    console.log('[VoiceSynthesis] Voice profile unlocked. Nova profile no longer enforced.');
  }

  /**
   * Lock voice to Nova profile (default state)
   * This ensures consistent executive-level delivery
   */
  lockVoice(): void {
    this.voiceLocked = true;
    // Reset to Nova if currently on different profile
    if (this.currentProfile.id !== DEFAULT_VOICE_PROFILE_ID) {
      const novaProfile = VOICE_PROFILES.find(p => p.id === DEFAULT_VOICE_PROFILE_ID);
      if (novaProfile) {
        this.currentProfile = novaProfile;
        this.settings = {
          ...novaProfile.baseSettings,
          ...(this.executiveMode ? NOVA_EXECUTIVE_OVERRIDE : {})
        };
        this.selectBestVoice();
      }
    }
    this.persistSettings();
    console.log('[VoiceSynthesis] Voice profile locked to Nova.');
  }

  /**
   * Check if voice is locked to Nova
   */
  isVoiceLocked(): boolean {
    return this.voiceLocked;
  }

  /**
   * Get current profile
   */
  getProfile(): VoiceProfile {
    return this.currentProfile;
  }

  /**
   * Get all available profiles
   */
  getAvailableProfiles(): VoiceProfile[] {
    return VOICE_PROFILES;
  }

  /**
   * Update voice settings
   */
  updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Set speaking state change callback
   */
  onSpeakingStateChange(callback: (speaking: boolean) => void): void {
    this.onSpeakingChange = callback;
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speak text with enhanced natural voice
   */
  async speak(text: string, context?: VoiceContext): Promise<void> {
    if (!window.speechSynthesis) {
      console.warn('[VoiceSynthesis] Speech synthesis not available');
      return;
    }

    // ==========================================
    // QUEUE MANAGEMENT: Prevent overlapping speech
    // ==========================================
    if (this.isSpeaking) {
      console.log('[VoiceSynthesis] Already speaking, queuing new speech');
      this.utteranceQueue.push({ text, context });
      return;
    }

    try {
      const startTime = performance.now();
      
      // Cancel any ongoing speech
      this.stop();

      // Clean and prepare text
      const cleanedText = this.cleanTextForSpeech(text);
      
      // Validate text after cleaning
      if (!cleanedText || cleanedText.trim().length === 0) {
        console.log('[VoiceSynthesis] Text empty after cleaning, skipping');
        return;
      }
      
      // Parse into segments with prosody
      const segments = this.parseTextIntoSegments(cleanedText, context);
      
      // Apply context-based modulation
      const contextSettings = this.applyContextModulation(context);
      
      // Speak segments
      await this.speakSegments(segments, contextSettings);
      
      // Record metrics
      const latency = performance.now() - startTime;
      this.recordMetrics({
        synthesisLatency: latency,
        utteranceLength: cleanedText.length,
        naturalPausesInserted: segments.filter(s => s.pauseAfter && s.pauseAfter > 100).length,
        emotionalAdaptations: context?.emotionalTone ? 1 : 0,
        sessionId: this.sessionId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[VoiceSynthesis] Error in speak method:', error);
      this.setSpeakingState(false);
      this.utteranceQueue = [];
      throw error;
    } finally {
      // Process queued speech after current completes
      if (this.utteranceQueue.length > 0) {
        const queued = this.utteranceQueue.shift();
        if (queued) {
          setTimeout(() => this.speak(queued.text, queued.context), 100);
        }
      }
    }
  }

  /**
   * Speak executive summary with optimized C-level delivery
   * 
   * This method is specifically designed for executive briefings and summaries:
   * - Uses Nova voice profile with executive optimizations
   * - Implements intelligent pauses for emphasis on key findings
   * - Removes all informal language and punctuation announcements
   * - Provides measured, professional delivery suitable for leadership audiences
   * 
   * @param text - The executive summary text to speak
   * @param options - Optional configuration for the delivery
   */
  async speakExecutiveSummary(text: string, options?: {
    emphasizeRecommendations?: boolean;
    pauseBeforeConclusion?: boolean;
    customPauseMultiplier?: number;
  }): Promise<void> {
    // Ensure Nova profile is active for executive delivery
    const validation = this.validateVoiceConsistency();
    if (!validation.isValid) {
      console.log('[VoiceSynthesis] Voice corrected to Nova for executive summary');
    }

    // Enable executive mode for this delivery
    const previousExecutiveMode = this.executiveMode;
    this.executiveMode = true;

    // Apply executive voice overrides
    const previousSettings = { ...this.settings };
    this.settings = {
      ...this.settings,
      ...NOVA_EXECUTIVE_OVERRIDE
    };

    // Apply custom pause multiplier if provided
    if (options?.customPauseMultiplier) {
      this.settings.rate = NOVA_EXECUTIVE_OVERRIDE.rate * options.customPauseMultiplier;
    }

    // Preprocess text for executive delivery
    let processedText = executiveTextPreprocessor(text);

    // Add emphasis markers for recommendations if requested
    if (options?.emphasizeRecommendations) {
      processedText = processedText.replace(
        /\b(Recommendation|Action Required|Next Steps?):\s*/gi,
        '\n\n$1: '  // Add pause before recommendations
      );
    }

    // Create executive context
    const executiveContext: VoiceContext = {
      type: 'executive',
      emotionalTone: 'confident',
      importance: 'high',
      audience: 'leadership'
    };

    console.log('[VoiceSynthesis] Speaking executive summary with Nova profile...');
    console.log(`[VoiceSynthesis] Text length: ${processedText.length} characters`);

    // Speak with executive context
    await this.speak(processedText, executiveContext);

    // Restore previous state
    this.executiveMode = previousExecutiveMode;
    this.settings = previousSettings;
  }

  /**
   * Enable or disable executive mode
   * Executive mode applies C-level optimizations to all voice output
   */
  setExecutiveMode(enabled: boolean): void {
    this.executiveMode = enabled;
    
    if (enabled && this.currentProfile.id === DEFAULT_VOICE_PROFILE_ID) {
      this.settings = {
        ...this.settings,
        ...NOVA_EXECUTIVE_OVERRIDE
      };
    } else if (!enabled && this.currentProfile.id === DEFAULT_VOICE_PROFILE_ID) {
      // Restore base Nova settings
      const novaProfile = VOICE_PROFILES.find(p => p.id === DEFAULT_VOICE_PROFILE_ID);
      if (novaProfile) {
        this.settings = { ...novaProfile.baseSettings };
      }
    }
    
    this.persistSettings();
    console.log(`[VoiceSynthesis] Executive mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if executive mode is enabled
   */
  isExecutiveMode(): boolean {
    return this.executiveMode;
  }

  /**
   * Stop speaking with proper cleanup
   */
  stop(): void {
    try {
      window.speechSynthesis?.cancel();
      this.utteranceQueue = [];
      this.setSpeakingState(false);
      console.log('[VoiceSynthesis] Speech stopped and queue cleared');
    } catch (error) {
      console.error('[VoiceSynthesis] Error stopping speech:', error);
      // Force cleanup even on error
      this.utteranceQueue = [];
      this.setSpeakingState(false);
    }
  }

  /**
   * Get quality metrics
   */
  getMetrics(): VoiceQualityMetrics[] {
    return [...this.metrics];
  }

  /**
   * Submit user rating for voice quality
   */
  submitRating(rating: number): void {
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1].userRating = rating;
    }
  }

  /**
   * Get available browser voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  /**
   * Detect context from text content
   */
  detectContext(text: string): VoiceContext {
    const lowerText = text.toLowerCase();
    
    // Check for urgency/alerts
    if (/critical|urgent|emergency|immediate|alert/i.test(text)) {
      return {
        type: 'urgent',
        emotionalTone: 'urgent',
        importance: 'critical'
      };
    }
    
    // Check for warnings
    if (/warning|caution|attention|risk|vulnerable/i.test(text)) {
      return {
        type: 'warning',
        emotionalTone: 'concerned',
        importance: 'high'
      };
    }
    
    // Check for success/positive
    if (/success|secure|excellent|improved|great|good news/i.test(text)) {
      return {
        type: 'success',
        emotionalTone: 'confident',
        importance: 'medium'
      };
    }
    
    // Check for executive content
    if (/executive|summary|brief|board|ceo|cto|ciso|c-level|leadership/i.test(text)) {
      return {
        type: 'executive',
        emotionalTone: 'confident',
        importance: 'high'
      };
    }
    
    // Check for alerts
    if (/\balert\b|notification|notice/i.test(text)) {
      return {
        type: 'alert',
        emotionalTone: 'neutral',
        importance: 'medium'
      };
    }
    
    // Default conversational
    return {
      type: 'conversational',
      emotionalTone: 'friendly',
      importance: 'low'
    };
  }

  // ==========================================
  // PRIVATE METHODS - TEXT PROCESSING
  // ==========================================

  private cleanTextForSpeech(text: string): string {
    let cleaned = text;
    
    // ==========================================
    // STEP 1: Remove markdown formatting
    // ==========================================
    cleaned = cleaned
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
      .replace(/\*([^*]+)\*/g, '$1')       // Italic
      .replace(/`([^`]+)`/g, '$1')         // Code
      .replace(/#{1,6}\s*/g, '')           // Headers
      .replace(/\|[^\n]+\|/g, '')          // Table rows
      .replace(/[-]{3,}/g, '')             // Horizontal rules
      .replace(/•/g, '')                   // Bullets
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');  // Links
    
    // ==========================================
    // STEP 2: CRITICAL - Filter punctuation announcements
    // This prevents TTS from saying "full stop", "comma", etc.
    // ==========================================
    for (const pattern of PUNCTUATION_SPEECH_SUPPRESSIONS) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // ==========================================
    // STEP 3: Clean punctuation for natural reading
    // ==========================================
    cleaned = cleaned
      // Remove excessive punctuation
      .replace(/\.{2,}/g, '.')           // Multiple periods -> single
      .replace(/,{2,}/g, ',')            // Multiple commas -> single
      .replace(/!{2,}/g, '!')            // Multiple exclamations -> single
      .replace(/\?{2,}/g, '?')           // Multiple questions -> single
      
      // Convert special punctuation to speech-friendly form
      .replace(/\s*\.\s*\.\s*\.\s*/g, ', ')  // Ellipsis -> pause
      .replace(/\s*[-–—]+\s*/g, ', ')        // Dashes -> pause (comma)
      
      // Clean up parenthetical content (read it without announcing brackets)
      .replace(/\(([^)]+)\)/g, ', $1, ')     // Parentheses -> natural pauses
      .replace(/\[([^\]]+)\]/g, ', $1, ')    // Brackets -> natural pauses
      
      // Remove special characters that might be announced
      .replace(/[\*_~^]/g, '')               // Remove markdown-like chars
      .replace(/[\|]/g, ', ')                // Pipes -> pauses
      .replace(/@/g, ' at ')                 // @ sign -> "at"
      .replace(/&/g, ' and ')                // Ampersand -> "and"
      .replace(/#(?!\d)/g, ' number ')       // Hash (not followed by digit) -> "number"
      .replace(/\+/g, ' plus ')              // Plus sign -> "plus"
      .replace(/=/g, ' equals ')             // Equals sign -> "equals";
    
    // ==========================================
    // STEP 4: Clean up whitespace
    // ==========================================
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ',')           // Double commas from conversions
      .replace(/,\s*\./g, '.')          // Comma before period
      .replace(/\s+,/g, ',')            // Space before comma
      .replace(/,+/g, ',');             // Multiple commas
    
    // ==========================================
    // STEP 5: Improve number pronunciation
    // ==========================================
    cleaned = cleaned
      .replace(/(\d+),(\d{3})/g, '$1$2')   // Remove commas in numbers for cleaner speech
      .replace(/(\d+)%/g, '$1 percent')
      .replace(/\$(\d+)/g, '$1 dollars')
      .replace(/(\d+)\/(\d+)/g, '$1 of $2')
      .replace(/(\d{1,3})(?=\d{6}$)/g, '$1 million ')  // Large numbers
      .replace(/(\d{1,3})(?=\d{9}$)/g, '$1 billion '); // Very large numbers
    
    // ==========================================
    // STEP 6: Expand abbreviations for executive clarity
    // ==========================================
    cleaned = cleaned
      .replace(/\bML\b/g, 'machine learning')
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bSRE\b/g, 'S.R.E.')
      .replace(/\bKPI\b/g, 'K.P.I.')
      .replace(/\bKPIs\b/g, 'K.P.I.s')
      .replace(/\bCVE\b/g, 'C.V.E.')
      .replace(/\bFN\b/g, 'field notice')
      .replace(/\bFN(\d+)/g, 'field notice $1')  // FN12345 -> field notice 12345
      .replace(/\bCISO\b/g, 'C.I.S.O.')
      .replace(/\bCEO\b/g, 'C.E.O.')
      .replace(/\bCTO\b/g, 'C.T.O.')
      .replace(/\bCFO\b/g, 'C.F.O.')
      .replace(/\bCOO\b/g, 'C.O.O.')
      .replace(/\bROI\b/g, 'R.O.I.')
      .replace(/\bSLA\b/g, 'S.L.A.')
      .replace(/\bTAC\b/g, 'T.A.C.')
      .replace(/\bBE\b/g, 'business entity')
      .replace(/\bCX\b/g, 'customer experience')
      .replace(/\bAPI\b/g, 'A.P.I.')
      .replace(/\bURL\b/g, 'U.R.L.')
      .replace(/\bHTTP\b/gi, 'H.T.T.P.')
      .replace(/\bHTTPS\b/gi, 'H.T.T.P.S.')
      .replace(/\bSSL\b/g, 'S.S.L.')
      .replace(/\bTLS\b/g, 'T.L.S.')
      .replace(/\bDNS\b/g, 'D.N.S.')
      .replace(/\bVPN\b/g, 'V.P.N.')
      .replace(/\bIPv4\b/g, 'I.P. version 4')
      .replace(/\bIPv6\b/g, 'I.P. version 6')
      .replace(/\bvs\.?\b/g, 'versus')
      .replace(/\be\.g\.\b/gi, 'for example')
      .replace(/\bi\.e\.\b/gi, 'that is')
      .replace(/\betc\.?\b/gi, 'et cetera');
    
    // ==========================================
    // STEP 7: Final cleanup and length limit
    // ==========================================
    return cleaned
      .trim()
      .substring(0, 3000);  // Increased limit for executive summaries
  }

  private parseTextIntoSegments(text: string, context?: VoiceContext): SpeechSegment[] {
    const segments: SpeechSegment[] = [];
    const isExecutive = context?.type === 'executive' || this.executiveMode;
    
    // Split by paragraphs first for executive content
    const paragraphs = text.split(/\n\n+/);
    
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx].trim();
      if (!paragraph) continue;
      
      // Split paragraph into sentences
      const sentences = this.splitIntoSentences(paragraph);
      
      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
        const sentence = sentences[sIdx].trim();
        if (!sentence) continue;
        
        // Calculate pause duration based on content and position
        const pauseConfig = this.calculateIntelligentPause(sentence, {
          isEndOfParagraph: sIdx === sentences.length - 1,
          isEndOfText: pIdx === paragraphs.length - 1 && sIdx === sentences.length - 1,
          isFirstSentence: pIdx === 0 && sIdx === 0,
          paragraphIndex: pIdx,
          sentenceIndex: sIdx,
          isExecutive
        });
        
        // Apply prosody patterns
        let pitch: number | undefined;
        let rate: number | undefined;
        let emphasis = false;
        
        for (const pattern of PROSODY_PATTERNS) {
          if (pattern.pattern.test(sentence)) {
            if (pattern.pitchShift) pitch = 1.0 + pattern.pitchShift;
            if (pattern.rateShift) rate = 1.0 + pattern.rateShift;
          }
        }
        
        // Executive emphasis triggers
        if (isExecutive) {
          if (/\b(critical|immediate|urgent|priority|escalation)\b/i.test(sentence)) {
            emphasis = true;
            rate = (rate || 1.0) * 0.92;  // Slower for critical content
          } else if (/\b(key finding|recommendation|action required|executive summary)\b/i.test(sentence)) {
            emphasis = true;
            rate = (rate || 1.0) * 0.95;
          } else if (/\b(confident|excellent|improved|success)\b/i.test(sentence)) {
            pitch = (pitch || 1.0) + 0.02;  // Slight lift for positive
          }
        }
        
        // First sentence engagement
        if (pIdx === 0 && sIdx === 0) {
          pitch = (pitch || 1.0) + 0.015;  // Subtle engagement
        }
        
        segments.push({
          text: sentence,
          pauseAfter: pauseConfig.duration,
          rate,
          pitch,
          emphasis
        });
      }
      
      // Add paragraph pause (except after last paragraph)
      if (pIdx < paragraphs.length - 1 && segments.length > 0) {
        segments[segments.length - 1].pauseAfter = 
          isExecutive ? EXECUTIVE_PAUSE_CONFIG.executive.sectionTransition : 
          EXECUTIVE_PAUSE_CONFIG.contentPause.paragraph;
      }
    }
    
    // Insert breath pauses for long text
    if (this.settings.breathPauses) {
      this.insertBreathPauses(segments);
    }
    
    return segments;
  }

  /**
   * Split text into sentences with improved accuracy
   */
  private splitIntoSentences(text: string): string[] {
    // Handle common abbreviations that shouldn't split
    const preserved = text
      .replace(/Dr\./g, 'Dr__DOT__')
      .replace(/Mr\./g, 'Mr__DOT__')
      .replace(/Mrs\./g, 'Mrs__DOT__')
      .replace(/Ms\./g, 'Ms__DOT__')
      .replace(/Inc\./g, 'Inc__DOT__')
      .replace(/Ltd\./g, 'Ltd__DOT__')
      .replace(/Corp\./g, 'Corp__DOT__')
      .replace(/etc\./g, 'etc__DOT__')
      .replace(/e\.g\./gi, 'e__DOT__g__DOT__')
      .replace(/i\.e\./gi, 'i__DOT__e__DOT__')
      .replace(/vs\./gi, 'vs__DOT__')
      .replace(/No\./g, 'No__DOT__')
      .replace(/(\.\s*[A-Z])\.([A-Z])\.([A-Z])\.?/g, '$1__DOT__$2__DOT__$3__DOT__');  // Acronyms like C.E.O.
    
    // Split on sentence boundaries
    const sentences = preserved.split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s*$/)
      .map(s => s.replace(/__DOT__/g, '.').trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }

  /**
   * Calculate intelligent pause duration based on content analysis
   */
  private calculateIntelligentPause(text: string, context: {
    isEndOfParagraph: boolean;
    isEndOfText: boolean;
    isFirstSentence: boolean;
    paragraphIndex: number;
    sentenceIndex: number;
    isExecutive: boolean;
  }): { duration: number; reason: string } {
    const config = EXECUTIVE_PAUSE_CONFIG;
    let duration = config.sentenceEnd.period;  // Default
    let reason = 'default sentence pause';
    
    // Check ending punctuation
    if (text.endsWith('!')) {
      duration = config.sentenceEnd.exclamation;
      reason = 'exclamation';
    } else if (text.endsWith('?')) {
      duration = config.sentenceEnd.question;
      reason = 'question';
    }
    
    // Paragraph boundary
    if (context.isEndOfParagraph && !context.isEndOfText) {
      duration = Math.max(duration, config.contentPause.paragraph);
      reason = 'end of paragraph';
    }
    
    // Executive-specific pauses
    if (context.isExecutive) {
      // Key findings
      if (/\b(key finding|finding|insight)s?\b/i.test(text)) {
        duration = Math.max(duration, config.executive.keyFinding);
        reason = 'key finding';
      }
      
      // Recommendations
      if (/\b(recommend|action|suggest|advise)\b/i.test(text)) {
        duration = Math.max(duration, config.executive.recommendation);
        reason = 'recommendation';
      }
      
      // Callouts/alerts
      if (/\b(warning|alert|attention|critical|urgent|immediate)\b/i.test(text)) {
        duration = Math.max(duration, config.executive.callout);
        reason = 'alert/callout';
      }
      
      // Section transitions (detected by heading-like patterns)
      if (/^(EXECUTIVE|SUMMARY|OVERVIEW|FINDINGS|RECOMMENDATIONS|CONCLUSION|ANALYSIS)/i.test(text)) {
        duration = Math.max(duration, config.executive.sectionTransition);
        reason = 'section transition';
      }
      
      // Numbers and statistics pause
      if (/\d+\s*(?:percent|%|million|billion|thousand)/i.test(text)) {
        duration = Math.max(duration, config.contentPause.number);
        reason = 'statistic emphasis';
      }
    }
    
    return { duration, reason };
  }

  private insertBreathPauses(segments: SpeechSegment[]): void {
    let wordCount = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const words = segments[i].text.split(/\s+/).length;
      wordCount += words;
      
      if (wordCount >= 45) {
        // Add a subtle breath pause
        segments[i].pauseAfter = Math.max(segments[i].pauseAfter || 0, 200);
        wordCount = 0;
      }
    }
  }

  private applyContextModulation(context?: VoiceContext): VoiceSettings {
    const settings = { ...this.settings };
    
    if (context) {
      // Apply context type modulation
      const contextMod = CONTEXT_MODULATIONS[context.type];
      if (contextMod) {
        settings.rate = (settings.rate || 1) * (contextMod.rate || 1);
        settings.pitch = (settings.pitch || 1) * (contextMod.pitch || 1);
        settings.emphasis = contextMod.emphasis ?? settings.emphasis;
      }
      
      // Apply emotional tone modulation
      if (context.emotionalTone) {
        const emotionMod = EMOTIONAL_TONE_MODULATIONS[context.emotionalTone];
        if (emotionMod) {
          settings.rate = (settings.rate || 1) * (emotionMod.rate || 1);
          settings.pitch = (settings.pitch || 1) * (emotionMod.pitch || 1);
        }
      }
      
      // Apply importance modifier
      if (context.importance === 'critical') {
        settings.emphasis = Math.min(1, (settings.emphasis || 0.5) + 0.2);
      }
    }
    
    // Clamp values to valid ranges
    settings.rate = Math.max(0.5, Math.min(2.0, settings.rate));
    settings.pitch = Math.max(0.5, Math.min(2.0, settings.pitch));
    
    return settings;
  }

  // ==========================================
  // PRIVATE METHODS - SPEECH SYNTHESIS
  // ==========================================

  private async speakSegments(segments: SpeechSegment[], contextSettings: VoiceSettings): Promise<void> {
    // ==========================================
    // SEGMENT SPEAKING WITH ERROR HANDLING
    // ==========================================
    this.setSpeakingState(true);
    let segmentIndex = 0;
    
    try {
      for (let i = 0; i < segments.length; i++) {
        segmentIndex = i;
        
        // Check if speaking was stopped
        if (!this.isSpeaking) {
          console.log('[VoiceSynthesis] Speech stopped by user');
          break;
        }
        
        const segment = segments[i];
        
        // Validate segment
        if (!segment.text || segment.text.trim().length === 0) {
          console.log('[VoiceSynthesis] Skipping empty segment');
          continue;
        }
        
        try {
          // Create utterance
          const utterance = new SpeechSynthesisUtterance(segment.text);
          
          // Apply voice
          if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
          }
          
          // Calculate final rate and pitch with natural variation
          const variation = this.calculateNaturalVariation(i, segments.length);
          
          // Clamp values to safe ranges
          utterance.rate = Math.max(0.5, Math.min(2.0, (segment.rate || contextSettings.rate) * variation.rate));
          utterance.pitch = Math.max(0.5, Math.min(2.0, (segment.pitch || contextSettings.pitch) * variation.pitch));
          utterance.volume = Math.max(0, Math.min(1, contextSettings.volume));
          
          // Add emphasis by slightly lowering rate
          if (segment.emphasis && contextSettings.emphasis > 0.5) {
            utterance.rate = Math.max(0.5, utterance.rate * 0.95);
          }
          
          // Speak and wait for completion
          await this.speakUtterance(utterance);
          
          // Add pause after segment
          if (segment.pauseAfter && i < segments.length - 1 && this.isSpeaking) {
            await this.pause(segment.pauseAfter);
          }
        } catch (segmentError) {
          console.error(`[VoiceSynthesis] Error speaking segment ${i}:`, segmentError);
          // Continue to next segment on error
          continue;
        }
      }
    } catch (error) {
      console.error(`[VoiceSynthesis] Fatal error in speakSegments at segment ${segmentIndex}:`, error);
    } finally {
      this.setSpeakingState(false);
    }
  }

  private speakUtterance(utterance: SpeechSynthesisUtterance): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.warn('[VoiceSynthesis] Utterance timeout after 30s');
          window.speechSynthesis.cancel();
          resolved = true;
          resolve();
        }
      }, 30000);  // 30 second timeout per utterance
      
      utterance.onstart = () => {
        console.log('[VoiceSynthesis] Utterance started');
      };
      
      utterance.onend = () => {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve();
        }
      };
      
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.warn('[VoiceSynthesis] Utterance error:', event.error);
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve();  // Continue even on error
        }
      };
      
      utterance.onpause = () => {
        console.log('[VoiceSynthesis] Utterance paused');
      };
      
      utterance.onresume = () => {
        console.log('[VoiceSynthesis] Utterance resumed');
      };
      
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('[VoiceSynthesis] Error calling speak:', error);
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve();
        }
      }
    });
  }

  private pause(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  private calculateNaturalVariation(index: number, total: number): { rate: number; pitch: number } {
    // Add subtle natural variation to avoid robotic monotony
    const progress = index / Math.max(1, total - 1);
    
    // Slight pitch descent over long passages (natural speech pattern)
    const pitchVariation = 1 - (progress * 0.03);
    
    // Very subtle random variation
    const randomRate = 0.98 + (Math.random() * 0.04);
    const randomPitch = 0.99 + (Math.random() * 0.02);
    
    return {
      rate: randomRate,
      pitch: pitchVariation * randomPitch
    };
  }

  private setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    if (this.onSpeakingChange) {
      this.onSpeakingChange(speaking);
    }
  }

  private recordMetrics(metrics: VoiceQualityMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    // Log for debugging/analysis
    if (metrics.synthesisLatency > 200) {
      console.warn(`[VoiceSynthesis] High latency: ${metrics.synthesisLatency}ms`);
    }
  }

  // ==========================================
  // QUALITY METRICS & A/B TESTING
  // ==========================================

  /**
   * Get aggregated quality metrics
   */
  getAggregatedMetrics(): {
    avgLatency: number;
    avgUserRating: number;
    totalUtterances: number;
    naturalPausesAvg: number;
  } {
    if (this.metrics.length === 0) {
      return { avgLatency: 0, avgUserRating: 0, totalUtterances: 0, naturalPausesAvg: 0 };
    }
    
    const rated = this.metrics.filter(m => m.userRating !== undefined);
    
    return {
      avgLatency: this.metrics.reduce((sum, m) => sum + m.synthesisLatency, 0) / this.metrics.length,
      avgUserRating: rated.length > 0 
        ? rated.reduce((sum, m) => sum + (m.userRating || 0), 0) / rated.length 
        : 0,
      totalUtterances: this.metrics.length,
      naturalPausesAvg: this.metrics.reduce((sum, m) => sum + m.naturalPausesInserted, 0) / this.metrics.length
    };
  }

  /**
   * Set A/B test group
   */
  setABTestGroup(group: 'control' | 'enhanced'): void {
    this.abTestGroup = group;
    
    if (group === 'control') {
      // Use basic settings for control group
      this.settings = {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        emphasis: 0,
        breathPauses: false,
        naturalPauses: false
      };
    } else {
      // Use enhanced settings
      this.settings = { ...this.currentProfile.baseSettings };
    }
  }

  /**
   * Get A/B test group
   */
  getABTestGroup(): 'control' | 'enhanced' {
    return this.abTestGroup;
  }

  // ==========================================
  // VOICE ENHANCEMENT METHODS
  // ==========================================

  /**
   * Set emotional tone for natural voice inflection
   */
  setEmotionalTone(tone: EmotionalProfile['name']): void {
    this.currentEmotionalTone = tone;
    
    if (this.enhancementEnabled) {
      const emotionalProfile = EMOTIONAL_PROFILES[tone];
      
      // Apply emotional modulation
      this.settings.rate = this.settings.rate * emotionalProfile.rateModifier;
      this.settings.pitch = this.settings.pitch + (emotionalProfile.pitchShift * 0.01);
      this.settings.emphasis = emotionalProfile.emphasis;
      this.settings.breathingFrequency = emotionalProfile.breathingFrequency;
      
      // Update breathing pattern based on energy
      this.breathingPattern = emotionalProfile.energy > 0.7 ? 
        BREATHING_PATTERNS.excited : BREATHING_PATTERNS.natural;
    }
  }

  /**
   * Get current emotional tone
   */
  getEmotionalTone(): EmotionalProfile['name'] {
    return this.currentEmotionalTone;
  }

  /**
   * Set voice age and gender parameters for formant tuning
   */
  setVoiceAgeGender(ageGenderPreset: string): void {
    const preset = VOICE_AGE_GENDER_PRESETS[ageGenderPreset];
    if (preset) {
      this.currentVoiceAgeGender = preset;
      this.settings.ageGenderPreset = ageGenderPreset;
      
      // Apply formant-based adjustments
      if (this.enhancementEnabled) {
        // Adjust base pitch for formant shift
        this.settings.pitch = this.settings.pitch * preset.formantShift;
      }
    }
  }

  /**
   * Get current voice age/gender parameters
   */
  getVoiceAgeGender(): VoiceAgeGenderParams | null {
    return this.currentVoiceAgeGender;
  }

  /**
   * Enable/disable voice enhancement features
   */
  setEnhancementEnabled(enabled: boolean): void {
    this.enhancementEnabled = enabled;
  }

  /**
   * Check if enhancement is enabled
   */
  isEnhancementEnabled(): boolean {
    return this.enhancementEnabled;
  }

  /**
   * Apply prosody pattern to text for natural intonation
   */
  applyProsodyPattern(text: string, pattern: string): SpeechSegment[] {
    const prosody = PROSODY_PATTERNS[pattern as keyof typeof PROSODY_PATTERNS] || PROSODY_PATTERNS.statement;
    const words = text.split(/\s+/);
    const pitchContour = createPitchContour(words.length, prosody);
    
    const segments: SpeechSegment[] = [];
    let wordIndex = 0;

    // Split into phrases and apply pitch contour
    const sentences = text.split(/([.!?])/);
    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      const sentenceWords = sentence.split(/\s+/);
      let phraseText = '';

      for (const word of sentenceWords) {
        phraseText += (phraseText ? ' ' : '') + word;
        
        if (/[.!?]/.test(word)) {
          // End of sentence - create segment
          segments.push({
            text: phraseText,
            pitch: wordIndex < pitchContour.length ? pitchContour[wordIndex] : 1.0,
            pauseAfter: pattern === 'question' ? 350 : 250
          });
          phraseText = '';
        }

        if (wordIndex < pitchContour.length) {
          wordIndex++;
        }
      }

      if (phraseText.trim()) {
        segments.push({
          text: phraseText,
          pitch: wordIndex < pitchContour.length ? pitchContour[wordIndex] : 1.0
        });
      }
    }

    return segments;
  }

  /**
   * Apply context-aware pronunciation adjustments
   */
  applyPronunciationContext(text: string): string {
    let adjusted = text;

    for (const context of PRONUNCIATION_CONTEXTS) {
      if (typeof context.text === 'string') {
        // Simple string matching - add pause markers
        adjusted = adjusted.replace(context.text, ` [PAUSE:${context.pauseBefore}] ${context.text} [PAUSE:${context.pauseAfter}] `);
      } else {
        // Regex matching
        adjusted = adjusted.replace(context.text as RegExp, match => {
          return ` [PAUSE:${context.pauseBefore}] ${match} [PAUSE:${context.pauseAfter}] `;
        });
      }
    }

    return adjusted;
  }

  /**
   * Analyze current voice for robotic factors
   */
  analyzeVoiceQuality(): {
    severityScore: number;
    factors: Record<string, boolean>;
    recommendations: string[];
  } {
    const analysis = analyzeRoboticFactors(this.settings, this.currentProfile);
    return {
      severityScore: analysis.severityScore,
      factors: analysis.factors,
      recommendations: analysis.recommendations
    };
  }

  /**
   * Apply optimal natural voice settings based on context
   */
  applyNaturalVoiceOptimization(
    emotionalTone: EmotionalProfile['name'] = 'neutral',
    voiceAgeGender?: VoiceAgeGenderParams
  ): void {
    if (!this.enhancementEnabled) return;

    const optimized = calculateNaturalSettings(
      emotionalTone,
      voiceAgeGender || this.currentVoiceAgeGender || VOICE_AGE_GENDER_PRESETS['neutral'],
      this.settings.rate,
      this.settings.pitch
    );

    this.settings = {
      ...this.settings,
      rate: optimized.rate,
      pitch: optimized.pitch,
      emphasis: optimized.emphasis,
      vibratoRate: optimized.vibrato.rate,
      vibratoDepth: optimized.vibrato.depth,
      breathingFrequency: BREATHING_PATTERNS.natural.breathInterval
    };

    this.breathingPattern = optimized.breathingPattern;
    this.pitchContour = optimized.prosodyPattern as any;
  }

  /**
   * Add natural hesitations and speech patterns
   */
  injectNaturalHesitations(text: string, emotionalTone: EmotionalProfile['name'] = 'neutral'): string {
    const emotionalProfile = EMOTIONAL_PROFILES[emotionalTone];
    const hesitations = [];

    // Calculate number of hesitations based on emotional profile
    const wordCount = text.split(/\s+/).length;
    const hesitationCount = Math.floor(wordCount / 25 * emotionalProfile.hesitationProb * 10);

    for (let i = 0; i < hesitationCount; i++) {
      const randomPos = Math.floor(Math.random() * text.split(/\s+/).length);
      const hes = generateHesitations(emotionalProfile.hesitationProb, i, wordCount);
      if (hes) {
        hesitations.push({ pos: randomPos, text: hes });
      }
    }

    // Insert hesitations
    let result = text;
    hesitations.sort((a, b) => b.pos - a.pos);  // Sort in reverse to maintain positions
    for (const { pos, text: hesText } of hesitations) {
      const words = result.split(/\s+/);
      words.splice(pos, 0, hesText);
      result = words.join(' ');
    }

    return result;
  }

  /**
   * Set breathing pattern for natural speech
   */
  setBreathingPattern(pattern: 'natural' | 'formal' | 'casual' | 'excited' | 'measured'): void {
    this.breathingPattern = BREATHING_PATTERNS[pattern];
    this.settings.breathingFrequency = this.breathingPattern.breathInterval;
  }

  /**
   * Get current settings including enhancement parameters
   */
  getEnhancedSettings(): VoiceSettings {
    return {
      ...this.settings,
      emotionalTone: this.currentEmotionalTone,
      ageGenderPreset: this.currentVoiceAgeGender ? 
        Object.entries(VOICE_AGE_GENDER_PRESETS).find(([_, v]) => v === this.currentVoiceAgeGender)?.[0] : 
        undefined,
      vibratoRate: 5 + (EMOTIONAL_PROFILES[this.currentEmotionalTone].energy * 2),
      vibratoDepth: 15 + (EMOTIONAL_PROFILES[this.currentEmotionalTone].emphasis * 20)
    };
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

let voiceSynthesisInstance: VoiceSynthesisService | null = null;

export const getVoiceSynthesisService = (profileId?: string): VoiceSynthesisService => {
  if (!voiceSynthesisInstance) {
    voiceSynthesisInstance = new VoiceSynthesisService(profileId);
  }
  return voiceSynthesisInstance;
};

export const resetVoiceSynthesisService = (): void => {
  if (voiceSynthesisInstance) {
    voiceSynthesisInstance.stop();
    voiceSynthesisInstance = null;
  }
};

export default VoiceSynthesisService;
