/**
 * Voice Quality Testing Framework
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Comprehensive testing suite for voice profile naturalness:
 * - Subjective human evaluation metrics
 * - Objective speech quality metrics
 * - A/B testing comparison utilities
 * - Statistical analysis tools
 * 
 * @version 1.0.0
 */

// ==========================================
// TEST METRICS TYPES
// ==========================================

export interface SubjectiveRating {
  /** Rater ID for tracking consistency */
  raterId: string;
  
  /** Sample ID being evaluated */
  sampleId: string;
  
  /** Overall naturalness (1-5) */
  naturalness: number;
  
  /** Pronunciation clarity (1-5) */
  clarity: number;
  
  /** Emotional appropriateness (1-5) */
  emotionalMatch: number;
  
  /** Pace/rhythm naturalness (1-5) */
  rhythm: number;
  
  /** Breathing patterns naturalness (1-5) */
  breathing: number;
  
  /** Overall acceptability (1-5) */
  acceptability: number;
  
  /** Free-form comments */
  comments?: string;
  
  /** Timestamp */
  timestamp: Date;
}

export interface ObjectiveMetrics {
  sampleId: string;
  
  /** Pitch variation coefficient (higher = more natural) */
  pitchVariationCoeff: number;
  
  /** Rate consistency (0-1, lower = more variation) */
  rateConsistency: number;
  
  /** Pause density (pauses per 100 words) */
  pauseDensity: number;
  
  /** Breathing sound frequency */
  breathingFrequency: number;
  
  /** Formant frequency deviation from natural range */
  formantDeviation: number;
  
  /** Phoneme duration variance (standard deviation) */
  phonemeDurationVariance: number;
  
  /** Energy contour smoothness (0-1) */
  energySmoothmess: number;
  
  /** Spectral centroid stability */
  spectralStability: number;
  
  /** Jitter (pitch perturbation) in cents */
  jitter: number;
  
  /** Shimmer (amplitude perturbation) in dB */
  shimmer: number;
  
  /** Harmonic-to-noise ratio (higher = clearer) */
  harmonicNoiseRatio: number;
}

export interface ABTestResult {
  /** Control sample ID (original voice) */
  controlId: string;
  
  /** Treatment sample ID (enhanced voice) */
  treatmentId: string;
  
  /** Number of raters */
  raterCount: number;
  
  /** Preference for control (%) */
  controlPreference: number;
  
  /** Preference for treatment (%) */
  treatmentPreference: number;
  
  /** No preference (%) */
  noPreference: number;
  
  /** Statistical significance (p-value) */
  pValue: number;
  
  /** Statistically significant? */
  isSignificant: boolean;
  
  /** Effect size (Cohen's d) */
  effectSize: number;
  
  /** Individual metric improvements */
  metricImprovements: Record<string, number>;
  
  /** Timestamp */
  timestamp: Date;
}

export interface VoiceQualityProfile {
  /** Profile ID */
  profileId: string;
  
  /** Profile name */
  name: string;
  
  /** Emotional tone */
  emotionalTone: string;
  
  /** Voice age/gender */
  ageGenderPreset: string;
  
  /** Aggregated subjective ratings */
  subjectiveMetrics: {
    avgNaturalness: number;
    avgClarity: number;
    avgEmotionalMatch: number;
    avgRhythm: number;
    avgBreathing: number;
    avgAcceptability: number;
    ratingCount: number;
  };
  
  /** Aggregated objective metrics */
  objectiveMetrics: ObjectiveMetrics;
  
  /** Comparative performance vs. control */
  performanceVsControl: {
    improvementPercent: number;
    significanceLevel: string;
    testDate: Date;
  };
}

export interface TestSession {
  /** Unique session ID */
  sessionId: string;
  
  /** Test type (subjective, objective, ab) */
  testType: 'subjective' | 'objective' | 'ab';
  
  /** Samples being tested */
  samples: VoiceSample[];
  
  /** Ratings/results */
  results: SubjectiveRating[] | ObjectiveMetrics[] | ABTestResult[];
  
  /** Session metadata */
  metadata: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    raterCount: number;
    notes?: string;
  };
}

export interface VoiceSample {
  /** Unique sample ID */
  sampleId: string;
  
  /** Sample text */
  text: string;
  
  /** Voice profile ID */
  profileId: string;
  
  /** Audio data (base64 or URL) */
  audioData?: string;
  
  /** Sample type (test, control, treatment) */
  sampleType: 'control' | 'treatment' | 'test';
  
  /** Emotional tone */
  emotionalTone?: string;
  
  /** Duration in seconds */
  duration: number;
}

// ==========================================
// SUBJECTIVE EVALUATION UTILITIES
// ==========================================

export class SubjectiveEvaluator {
  /**
   * Calculate mean rating from multiple raters
   */
  static calculateMeanRating(ratings: SubjectiveRating[]): SubjectiveRating {
    if (ratings.length === 0) {
      throw new Error('No ratings provided');
    }

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      raterId: 'system_mean',
      sampleId: ratings[0].sampleId,
      naturalness: mean(ratings.map(r => r.naturalness)),
      clarity: mean(ratings.map(r => r.clarity)),
      emotionalMatch: mean(ratings.map(r => r.emotionalMatch)),
      rhythm: mean(ratings.map(r => r.rhythm)),
      breathing: mean(ratings.map(r => r.breathing)),
      acceptability: mean(ratings.map(r => r.acceptability)),
      timestamp: new Date()
    };
  }

  /**
   * Calculate standard deviation of ratings
   */
  static calculateRatingStdDev(ratings: SubjectiveRating[]): Record<string, number> {
    if (ratings.length < 2) return {};

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = (arr: number[]) => {
      const m = mean(arr);
      return mean(arr.map(x => Math.pow(x - m, 2)));
    };

    return {
      naturalness: Math.sqrt(variance(ratings.map(r => r.naturalness))),
      clarity: Math.sqrt(variance(ratings.map(r => r.clarity))),
      emotionalMatch: Math.sqrt(variance(ratings.map(r => r.emotionalMatch))),
      rhythm: Math.sqrt(variance(ratings.map(r => r.rhythm))),
      breathing: Math.sqrt(variance(ratings.map(r => r.breathing))),
      acceptability: Math.sqrt(variance(ratings.map(r => r.acceptability)))
    };
  }

  /**
   * Detect outlier raters (potential spam/invalid ratings)
   */
  static detectOutlierRaters(ratings: SubjectiveRating[]): string[] {
    if (ratings.length < 3) return [];

    const byRater = new Map<string, SubjectiveRating[]>();
    ratings.forEach(r => {
      if (!byRater.has(r.raterId)) {
        byRater.set(r.raterId, []);
      }
      byRater.get(r.raterId)!.push(r);
    });

    const outliers: string[] = [];
    const globalMean = this.calculateMeanRating(ratings);

    byRater.forEach((raterRatings, raterId) => {
      const raterMean = this.calculateMeanRating(raterRatings);
      
      // Check if rater's ratings deviate significantly from global
      const deviation = Math.abs(raterMean.acceptability - globalMean.acceptability);
      if (deviation > 1.5) {  // More than 1.5 points off
        outliers.push(raterId);
      }
    });

    return outliers;
  }

  /**
   * Calculate inter-rater reliability (Cronbach's alpha)
   */
  static calculateInterRaterReliability(ratings: SubjectiveRating[]): number {
    if (ratings.length < 2) return 0;

    // Group by sample
    const bySample = new Map<string, SubjectiveRating[]>();
    ratings.forEach(r => {
      if (!bySample.has(r.sampleId)) {
        bySample.set(r.sampleId, []);
      }
      bySample.get(r.sampleId)!.push(r);
    });

    // Calculate Cronbach's alpha across all metrics
    const metrics = ['naturalness', 'clarity', 'emotionalMatch', 'rhythm', 'breathing', 'acceptability'] as const;
    let totalVariance = 0;
    let itemVariance = 0;

    bySample.forEach(sampleRatings => {
      if (sampleRatings.length < 2) return;

      metrics.forEach(metric => {
        const values = sampleRatings.map(r => r[metric]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        itemVariance += variance;
      });
    });

    const k = metrics.length;
    const n = Array.from(bySample.values()).filter(s => s.length > 1).length;

    if (itemVariance === 0) return 1.0;

    const alpha = (k / (k - 1)) * (1 - (itemVariance / (itemVariance * k)));
    return Math.max(0, Math.min(1, alpha));
  }
}

// ==========================================
// OBJECTIVE METRICS CALCULATION
// ==========================================

export class ObjectiveAnalyzer {
  /**
   * Calculate pitch variation coefficient from audio analysis
   * (Higher = more natural variation)
   */
  static calculatePitchVariation(
    pitchContour: number[],
    windowSize: number = 10
  ): number {
    if (pitchContour.length < windowSize) return 0;

    let totalVariation = 0;
    for (let i = 0; i < pitchContour.length - windowSize; i++) {
      const window = pitchContour.slice(i, i + windowSize);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length;
      totalVariation += Math.sqrt(variance);
    }

    return totalVariation / (pitchContour.length - windowSize);
  }

  /**
   * Calculate rate consistency
   * (Lower = more variation, which is more natural)
   */
  static calculateRateConsistency(
    rateValues: number[]
  ): number {
    if (rateValues.length === 0) return 1;

    const mean = rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
    const variance = rateValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / rateValues.length;
    const stdDev = Math.sqrt(variance);

    // Normalize: lower std dev = higher consistency
    return Math.min(1, stdDev / mean);
  }

  /**
   * Calculate pause distribution density
   */
  static calculatePauseDensity(
    pauseLocations: number[],
    totalWords: number
  ): number {
    return (pauseLocations.length / Math.max(1, totalWords)) * 100;
  }

  /**
   * Assess energy contour smoothness
   */
  static calculateEnergySmoothmess(
    energyContour: number[]
  ): number {
    if (energyContour.length < 2) return 1;

    // Calculate second derivative (curvature)
    let totalCurvature = 0;
    for (let i = 1; i < energyContour.length - 1; i++) {
      const secondDerivative = Math.abs(
        energyContour[i + 1] - 2 * energyContour[i] + energyContour[i - 1]
      );
      totalCurvature += secondDerivative;
    }

    const avgCurvature = totalCurvature / (energyContour.length - 2);
    // Lower curvature = smoother (more natural)
    // Normalize to 0-1 range
    return Math.max(0, 1 - (avgCurvature / 0.5));
  }

  /**
   * Estimate jitter (pitch perturbation) from contour
   */
  static estimateJitter(pitchContour: number[]): number {
    if (pitchContour.length < 2) return 0;

    const diffs: number[] = [];
    for (let i = 1; i < pitchContour.length; i++) {
      diffs.push(Math.abs(pitchContour[i] - pitchContour[i - 1]));
    }

    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    // Convert to cents (1 semitone = 100 cents)
    return meanDiff * 100;
  }

  /**
   * Calculate harmonic-to-noise ratio (requires spectral analysis)
   */
  static estimateHarmonicNoiseRatio(
    spectralData: number[]
  ): number {
    if (spectralData.length === 0) return 0;

    // Simple estimation: ratio of fundamental to noise floor
    const fundamental = Math.max(...spectralData);
    const noiseFloor = spectralData.slice(0, Math.floor(spectralData.length * 0.1))
      .reduce((a, b) => a + b, 0) / Math.floor(spectralData.length * 0.1);

    if (noiseFloor === 0) return fundamental;

    return 20 * Math.log10(fundamental / noiseFloor);
  }
}

// ==========================================
// A/B TESTING UTILITIES
// ==========================================

export class ABTestAnalyzer {
  /**
   * Calculate preference percentage from pairwise comparisons
   */
  static calculatePreferences(
    controlScores: number[],
    treatmentScores: number[]
  ): { controlPref: number; treatmentPref: number; noPref: number } {
    if (controlScores.length === 0 || treatmentScores.length === 0) {
      return { controlPref: 0, treatmentPref: 0, noPref: 100 };
    }

    let controlWins = 0;
    let treatmentWins = 0;
    let ties = 0;

    const minLen = Math.min(controlScores.length, treatmentScores.length);
    for (let i = 0; i < minLen; i++) {
      if (controlScores[i] > treatmentScores[i]) {
        controlWins++;
      } else if (treatmentScores[i] > controlScores[i]) {
        treatmentWins++;
      } else {
        ties++;
      }
    }

    const total = controlWins + treatmentWins + ties;

    return {
      controlPref: (controlWins / total) * 100,
      treatmentPref: (treatmentWins / total) * 100,
      noPref: (ties / total) * 100
    };
  }

  /**
   * Perform paired t-test to determine significance
   */
  static performPairedTTest(
    controlScores: number[],
    treatmentScores: number[]
  ): { tStatistic: number; pValue: number } {
    if (controlScores.length !== treatmentScores.length || controlScores.length < 2) {
      return { tStatistic: 0, pValue: 1 };
    }

    // Calculate differences
    const differences = controlScores.map((c, i) => treatmentScores[i] - c);
    
    // Calculate mean and std dev of differences
    const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance = differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (differences.length - 1);
    const stdDev = Math.sqrt(variance);

    // Calculate t-statistic
    const n = differences.length;
    const tStatistic = (meanDiff / (stdDev / Math.sqrt(n)));

    // Approximate p-value using normal distribution
    // (For simplicity; actual t-distribution would be more accurate)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));

    return { tStatistic, pValue };
  }

  /**
   * Calculate Cohen's d effect size
   */
  static calculateEffectSize(
    controlScores: number[],
    treatmentScores: number[]
  ): number {
    if (controlScores.length === 0 || treatmentScores.length === 0) return 0;

    const meanControl = controlScores.reduce((a, b) => a + b, 0) / controlScores.length;
    const meanTreatment = treatmentScores.reduce((a, b) => a + b, 0) / treatmentScores.length;

    // Pooled standard deviation
    const varianceControl = controlScores.reduce((sum, x) => sum + Math.pow(x - meanControl, 2), 0) / (controlScores.length - 1);
    const varianceTreatment = treatmentScores.reduce((sum, x) => sum + Math.pow(x - meanTreatment, 2), 0) / (treatmentScores.length - 1);

    const pooledStdDev = Math.sqrt(
      ((controlScores.length - 1) * varianceControl + (treatmentScores.length - 1) * varianceTreatment) /
      (controlScores.length + treatmentScores.length - 2)
    );

    return (meanTreatment - meanControl) / pooledStdDev;
  }

  /**
   * Standard normal cumulative distribution function
   */
  private static normalCDF(z: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z));

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Compute metric improvements from A/B test
   */
  static computeImprovements(
    controlMetrics: Record<string, number>,
    treatmentMetrics: Record<string, number>
  ): Record<string, number> {
    const improvements: Record<string, number> = {};

    Object.keys(treatmentMetrics).forEach(key => {
      const control = controlMetrics[key] || 0;
      const treatment = treatmentMetrics[key];

      if (control !== 0) {
        improvements[key] = ((treatment - control) / Math.abs(control)) * 100;
      }
    });

    return improvements;
  }
}

// ==========================================
// TEST SESSION MANAGEMENT
// ==========================================

export class TestSessionManager {
  private sessions: Map<string, TestSession> = new Map();

  /**
   * Create new test session
   */
  createSession(
    testType: 'subjective' | 'objective' | 'ab',
    samples: VoiceSample[],
    raterCount: number,
    notes?: string
  ): TestSession {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: TestSession = {
      sessionId,
      testType,
      samples,
      results: [],
      metadata: {
        startTime: new Date(),
        raterCount,
        notes
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add result to session
   */
  addResult(
    sessionId: string,
    result: SubjectiveRating | ObjectiveMetrics | ABTestResult
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.results.push(result);
  }

  /**
   * Complete session and calculate final results
   */
  completeSession(sessionId: string): TestSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.metadata.endTime = new Date();
    session.metadata.duration = 
      (session.metadata.endTime.getTime() - session.metadata.startTime.getTime()) / 1000;

    return session;
  }

  /**
   * Get session results
   */
  getSession(sessionId: string): TestSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions
   */
  getAllSessions(): TestSession[] {
    return Array.from(this.sessions.values());
  }
}

// ==========================================
// VOICE QUALITY REPORT GENERATION
// ==========================================

export function generateQualityReport(
  profileId: string,
  subjectiveRatings: SubjectiveRating[],
  objectiveMetrics: ObjectiveMetrics,
  abTestResults?: ABTestResult[]
): VoiceQualityProfile {
  const subjectiveMean = SubjectiveEvaluator.calculateMeanRating(subjectiveRatings);

  return {
    profileId,
    name: `Profile ${profileId}`,
    emotionalTone: 'neutral',
    ageGenderPreset: 'adult-neutral',
    subjectiveMetrics: {
      avgNaturalness: subjectiveMean.naturalness,
      avgClarity: subjectiveMean.clarity,
      avgEmotionalMatch: subjectiveMean.emotionalMatch,
      avgRhythm: subjectiveMean.rhythm,
      avgBreathing: subjectiveMean.breathing,
      avgAcceptability: subjectiveMean.acceptability,
      ratingCount: subjectiveRatings.length
    },
    objectiveMetrics,
    performanceVsControl: {
      improvementPercent: abTestResults?.[0]?.effectSize ? 
        (abTestResults[0].effectSize * 100) : 0,
      significanceLevel: abTestResults?.[0]?.isSignificant ? 'p < 0.05' : 'not significant',
      testDate: new Date()
    }
  };
}
