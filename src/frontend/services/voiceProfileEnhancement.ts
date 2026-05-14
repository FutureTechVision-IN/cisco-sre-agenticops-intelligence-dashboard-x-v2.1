/**
 * Voice Profile Enhancement System
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Advanced voice synthesis enhancements to address robotic sound quality:
 * - Neural prosody simulation with natural pitch contours
 * - Emotional inflection with parametric modulation
 * - Context-aware pronunciation and pacing
 * - Voice age/gender parameter tuning
 * - Breathing and hesitation patterns
 * - Speech rate micro-variations
 * 
 * @version 1.0.0
 */

// ==========================================
// PROSODY ENHANCEMENT TYPES
// ==========================================

export interface ProsodyProfile {
  /** Pitch contour shape: linear, rising, falling, rising-falling */
  contourType: 'linear' | 'rising' | 'falling' | 'rising-falling' | 'undulating';
  
  /** Peak pitch offset from baseline (0.8-1.2) */
  peakIntensity: number;
  
  /** Duration of pitch rise/fall in segments */
  transitionDuration: number;
  
  /** Frequency variation per word (Hz) */
  vibrato?: {
    rate: number;      // 4-8 Hz for natural voice
    depth: number;     // 10-50 cents
  };
}

export interface EmotionalProfile {
  name: 'neutral' | 'happy' | 'serious' | 'excited' | 'concerned' | 'confident' | 'surprised' | 'sad';
  
  /** Rate multiplier (0.7-1.4) */
  rateModifier: number;
  
  /** Pitch shift in semitones */
  pitchShift: number;
  
  /** Emphasis/stress intensity (0-1) */
  emphasis: number;
  
  /** Breathing frequency (pauses per 100 words) */
  breathingFrequency: number;
  
  /** Hesitation probability (0-1) */
  hesitationProb: number;
  
  /** Voice energy/intensity (0-1) */
  energy: number;
}

export interface VoiceAgeGenderParams {
  /** Age category affecting formant frequencies */
  ageCategory: 'child' | 'young-adult' | 'adult' | 'mature' | 'senior';
  
  /** Gender-based formant tuning */
  gender: 'male' | 'female' | 'neutral';
  
  /** Formant shift factor (adjusts resonance) */
  formantShift: number;  // 0.8-1.3
  
  /** Vocal tract length simulation (affects naturalness) */
  vocalTractLength: number;  // 0.9-1.1
}

export interface PronunciationContext {
  /** Word or phrase requiring special handling */
  text: string;
  
  /** Rate adjustment for this segment */
  rateAdjustment: number;
  
  /** Pitch adjustment for this segment */
  pitchAdjustment: number;
  
  /** Pause before pronunciation (ms) */
  pauseBefore: number;
  
  /** Pause after pronunciation (ms) */
  pauseAfter: number;
  
  /** Emphasis level (0-1) */
  emphasis: number;
}

export interface BreathingPattern {
  /** Interval between breaths in words */
  breathInterval: number;
  
  /** Duration of breathing sound (ms) */
  breathDuration: number;
  
  /** Whether to simulate breath inhalation */
  includeInhalation: boolean;
  
  /** Randomness factor (0-1) */
  naturalVariation: number;
}

// ==========================================
// ROBOTIC FACTOR ANALYSIS
// ==========================================

export interface RoboticFactorsAnalysis {
  /** Identified robotic quality factors */
  factors: {
    /** Monotone pitch without natural variation */
    flatPitch: boolean;
    
    /** Lack of natural pauses and breathing */
    noBreathing: boolean;
    
    /** Unnatural speaking rate consistency */
    uniformRate: boolean;
    
    /** Missing stress and emphasis patterns */
    noEmphasis: boolean;
    
    /** Artificial consonant/vowel transitions */
    artifactTransitions: boolean;
    
    /** Missing emotional inflection */
    noEmotionalVariation: boolean;
    
    /** Lack of hesitations and filler words */
    noHesitations: boolean;
    
    /** Unnatural phrase boundaries */
    artificialPhrasing: boolean;
  };
  
  /** Severity score (0-100) */
  severityScore: number;
  
  /** Recommended enhancements */
  recommendations: string[];
}

// ==========================================
// EMOTIONAL TONE CONFIGURATIONS
// ==========================================

export const EMOTIONAL_PROFILES: Record<EmotionalProfile['name'], EmotionalProfile> = {
  neutral: {
    name: 'neutral',
    rateModifier: 1.0,
    pitchShift: 0,
    emphasis: 0.5,
    breathingFrequency: 2,
    hesitationProb: 0,
    energy: 0.5
  },
  happy: {
    name: 'happy',
    rateModifier: 1.1,
    pitchShift: 4,        // Higher pitch
    emphasis: 0.7,
    breathingFrequency: 2.5,
    hesitationProb: 0.05,
    energy: 0.8
  },
  serious: {
    name: 'serious',
    rateModifier: 0.92,
    pitchShift: -3,       // Lower pitch
    emphasis: 0.65,
    breathingFrequency: 1.5,
    hesitationProb: 0.1,
    energy: 0.4
  },
  excited: {
    name: 'excited',
    rateModifier: 1.25,
    pitchShift: 6,        // Higher pitch
    emphasis: 0.9,
    breathingFrequency: 4,
    hesitationProb: 0.15,
    energy: 1.0
  },
  concerned: {
    name: 'concerned',
    rateModifier: 0.95,
    pitchShift: 2,        // Slightly higher
    emphasis: 0.75,
    breathingFrequency: 3,
    hesitationProb: 0.2,
    energy: 0.6
  },
  confident: {
    name: 'confident',
    rateModifier: 1.0,
    pitchShift: -2,       // Slightly lower
    emphasis: 0.6,
    breathingFrequency: 1.5,
    hesitationProb: 0.02,
    energy: 0.7
  },
  surprised: {
    name: 'surprised',
    rateModifier: 1.15,
    pitchShift: 8,        // Much higher
    emphasis: 0.85,
    breathingFrequency: 3.5,
    hesitationProb: 0.25,
    energy: 0.8
  },
  sad: {
    name: 'sad',
    rateModifier: 0.88,
    pitchShift: -4,       // Lower pitch
    emphasis: 0.4,
    breathingFrequency: 1.2,
    hesitationProb: 0.15,
    energy: 0.3
  }
};

// ==========================================
// PROSODY PATTERNS FOR NATURAL SPEECH
// ==========================================

export const PROSODY_PATTERNS: Record<string, ProsodyProfile> = {
  statement: {
    contourType: 'falling',
    peakIntensity: 1.15,
    transitionDuration: 3,
    vibrato: { rate: 5, depth: 20 }
  },
  question: {
    contourType: 'rising',
    peakIntensity: 1.2,
    transitionDuration: 2,
    vibrato: { rate: 6, depth: 25 }
  },
  emphasis: {
    contourType: 'rising-falling',
    peakIntensity: 1.25,
    transitionDuration: 2,
    vibrato: { rate: 6, depth: 30 }
  },
  continuation: {
    contourType: 'rising',
    peakIntensity: 1.1,
    transitionDuration: 2,
    vibrato: { rate: 5, depth: 15 }
  },
  excited: {
    contourType: 'undulating',
    peakIntensity: 1.3,
    transitionDuration: 1,
    vibrato: { rate: 7, depth: 35 }
  }
};

// ==========================================
// VOICE AGE/GENDER PARAMETER SETS
// ==========================================

export const VOICE_AGE_GENDER_PRESETS: Record<string, VoiceAgeGenderParams> = {
  'young-female': {
    ageCategory: 'young-adult',
    gender: 'female',
    formantShift: 1.2,
    vocalTractLength: 0.95
  },
  'adult-female': {
    ageCategory: 'adult',
    gender: 'female',
    formantShift: 1.1,
    vocalTractLength: 1.0
  },
  'mature-female': {
    ageCategory: 'mature',
    gender: 'female',
    formantShift: 0.95,
    vocalTractLength: 1.02
  },
  'young-male': {
    ageCategory: 'young-adult',
    gender: 'male',
    formantShift: 0.9,
    vocalTractLength: 1.05
  },
  'adult-male': {
    ageCategory: 'adult',
    gender: 'male',
    formantShift: 1.0,
    vocalTractLength: 1.0
  },
  'mature-male': {
    ageCategory: 'mature',
    gender: 'male',
    formantShift: 0.85,
    vocalTractLength: 1.08
  },
  'neutral': {
    ageCategory: 'adult',
    gender: 'neutral',
    formantShift: 1.0,
    vocalTractLength: 1.0
  }
};

// ==========================================
// PRONUNCIATION ADJUSTMENT DATABASE
// ==========================================

export const PRONUNCIATION_CONTEXTS: PronunciationContext[] = [
  // Numbers and percentages - add emphasis
  { text: /\b\d+(?:\.\d+)?(?:%|percent)\b/g, rateAdjustment: 0.92, pitchAdjustment: 0.05, pauseBefore: 100, pauseAfter: 150, emphasis: 0.8 },
  
  // Acronyms - spell out with pauses
  { text: /\b[A-Z]{2,}\b/, rateAdjustment: 0.85, pitchAdjustment: 0, pauseBefore: 50, pauseAfter: 100, emphasis: 0.6 },
  
  // Important keywords - emphasize
  { text: /\b(critical|urgent|important|essential|must|required)\b/gi, rateAdjustment: 0.95, pitchAdjustment: 0.1, pauseBefore: 80, pauseAfter: 120, emphasis: 0.9 },
  
  // Questions - raise pitch
  { text: /\?$/, rateAdjustment: 1.05, pitchAdjustment: 0.15, pauseBefore: 0, pauseAfter: 200, emphasis: 0.7 },
  
  // Technical terms - slow down
  { text: /\b(algorithm|architecture|implementation|optimization|parameter)\b/gi, rateAdjustment: 0.88, pitchAdjustment: 0, pauseBefore: 60, pauseAfter: 80, emphasis: 0.6 },
  
  // Transitions - add natural pause
  { text: /\b(however|therefore|furthermore|meanwhile|subsequently)\b/gi, rateAdjustment: 1.0, pitchAdjustment: 0, pauseBefore: 150, pauseAfter: 100, emphasis: 0.5 }
];

// ==========================================
// BREATHING PATTERNS
// ==========================================

export const BREATHING_PATTERNS: Record<string, BreathingPattern> = {
  natural: {
    breathInterval: 45,
    breathDuration: 150,
    includeInhalation: true,
    naturalVariation: 0.3
  },
  formal: {
    breathInterval: 60,
    breathDuration: 120,
    includeInhalation: false,
    naturalVariation: 0.15
  },
  casual: {
    breathInterval: 35,
    breathDuration: 180,
    includeInhalation: true,
    naturalVariation: 0.5
  },
  excited: {
    breathInterval: 25,
    breathDuration: 200,
    includeInhalation: true,
    naturalVariation: 0.6
  },
  measured: {
    breathInterval: 50,
    breathDuration: 100,
    includeInhalation: false,
    naturalVariation: 0.1
  }
};

// ==========================================
// ENHANCEMENT ANALYSIS FUNCTION
// ==========================================

/**
 * Analyze current voice settings to identify robotic factors
 */
export function analyzeRoboticFactors(
  currentSettings: any,
  currentProfile: any
): RoboticFactorsAnalysis {
  const factors = {
    flatPitch: currentSettings.pitch === 1.0 && !currentSettings.vibrato,
    noBreathing: !currentSettings.breathPauses,
    uniformRate: currentSettings.rate === 1.0 && !currentSettings.rateVariation,
    noEmphasis: currentSettings.emphasis < 0.4,
    artifactTransitions: !currentSettings.smoothTransitions,
    noEmotionalVariation: !currentSettings.emotionalTone,
    noHesitations: !currentSettings.hesitations,
    artificialPhrasing: !currentSettings.naturalPhrasing
  };

  // Calculate severity score
  let severityScore = 0;
  const trueCount = Object.values(factors).filter(f => f).length;
  severityScore = (trueCount / Object.keys(factors).length) * 100;

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.flatPitch) recommendations.push('Enable natural pitch variation and vibrato');
  if (factors.noBreathing) recommendations.push('Enable breath pauses and inhalation sounds');
  if (factors.uniformRate) recommendations.push('Implement dynamic speech rate variation');
  if (factors.noEmphasis) recommendations.push('Increase prosody emphasis for stress patterns');
  if (factors.artifactTransitions) recommendations.push('Smooth consonant/vowel transitions');
  if (factors.noEmotionalVariation) recommendations.push('Apply emotional tone modulation');
  if (factors.noHesitations) recommendations.push('Add natural hesitations and fillers');
  if (factors.artificialPhrasing) recommendations.push('Implement natural phrase boundaries');

  return { factors, severityScore, recommendations };
}

/**
 * Calculate optimal settings for natural sound
 */
export function calculateNaturalSettings(
  emotionalTone: EmotionalProfile['name'],
  voiceAgeGender: VoiceAgeGenderParams,
  baseRate: number = 1.0,
  basePitch: number = 1.0
): {
  rate: number;
  pitch: number;
  emphasis: number;
  vibrato: { rate: number; depth: number };
  breathingPattern: BreathingPattern;
  prosodyPattern: ProsodyProfile;
} {
  const emotionalProfile = EMOTIONAL_PROFILES[emotionalTone] || EMOTIONAL_PROFILES.neutral;
  const formantAdjustment = voiceAgeGender.formantShift;

  return {
    rate: baseRate * emotionalProfile.rateModifier,
    pitch: basePitch + (emotionalProfile.pitchShift * 0.01),  // Convert semitones to ratio
    emphasis: emotionalProfile.emphasis,
    vibrato: {
      rate: 5 + (emotionalProfile.energy * 2),  // 5-7 Hz based on energy
      depth: 15 + (emotionalProfile.emphasis * 20)  // 15-35 cents
    },
    breathingPattern: emotionalProfile.energy > 0.7 ? BREATHING_PATTERNS.excited : BREATHING_PATTERNS.natural,
    prosodyPattern: PROSODY_PATTERNS.statement
  };
}

/**
 * Generate hesitations and fillers for natural speech
 */
export function generateHesitations(
  hesitationProb: number,
  position: number,
  totalWords: number
): string {
  if (Math.random() > hesitationProb) return '';

  const hesitations = [
    'uh,',
    'um,',
    'well,',
    'you know,',
    'actually,',
    'I mean,'
  ];

  return hesitations[Math.floor(Math.random() * hesitations.length)];
}

/**
 * Create natural pitch contour for a phrase
 */
export function createPitchContour(
  wordCount: number,
  prosodyPattern: ProsodyProfile
): number[] {
  const contour: number[] = [];

  for (let i = 0; i < wordCount; i++) {
    let pitch = 1.0;
    const progress = i / Math.max(1, wordCount - 1);

    switch (prosodyPattern.contourType) {
      case 'rising':
        pitch = 1.0 + (progress * (prosodyPattern.peakIntensity - 1.0));
        break;
      case 'falling':
        pitch = prosodyPattern.peakIntensity - (progress * (prosodyPattern.peakIntensity - 1.0));
        break;
      case 'rising-falling':
        if (progress < 0.5) {
          pitch = 1.0 + ((progress * 2) * (prosodyPattern.peakIntensity - 1.0));
        } else {
          pitch = prosodyPattern.peakIntensity - (((progress - 0.5) * 2) * (prosodyPattern.peakIntensity - 1.0));
        }
        break;
      case 'undulating':
        pitch = 1.0 + (Math.sin(progress * Math.PI * 2) * (prosodyPattern.peakIntensity - 1.0) * 0.5);
        break;
      default:
        pitch = 1.0;
    }

    contour.push(Math.max(0.8, Math.min(1.3, pitch)));
  }

  return contour;
}
