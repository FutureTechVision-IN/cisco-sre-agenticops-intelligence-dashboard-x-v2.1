/**
 * Voice Settings Panel Component
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Features:
 * - Voice profile selector with preview
 * - Rate, pitch, volume sliders
 * - Emotional tone presets
 * - Quality metrics display
 * - Test functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Mic, Sliders, Settings, Square, Play, CheckCircle, AlertTriangle, Star, ThumbsUp, Target,
  Zap, Smile, Frown, Heart, Brain, AlertCircle, TrendingUp, BarChart3, Volume2
} from 'lucide-react';
import { 
  VoiceSynthesisService, 
  VoiceProfile, 
  VoiceSettings, 
  VoiceContext,
  VOICE_PROFILES,
  getVoiceSynthesisService 
} from '../services/voiceSynthesisService';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  voiceService: VoiceSynthesisService;
  onProfileChange?: (profile: VoiceProfile) => void;
}

const EMOTIONAL_PRESETS = [
  { id: 'neutral', label: 'Neutral', icon: 'BarChart3', description: 'Balanced and professional' },
  { id: 'friendly', label: 'Friendly', icon: 'Smile', description: 'Warm and approachable' },
  { id: 'confident', label: 'Confident', icon: 'TrendingUp', description: 'Authoritative and assured' },
  { id: 'reassuring', label: 'Reassuring', icon: 'Heart', description: 'Calm and comforting' },
  { id: 'urgent', label: 'Urgent', icon: 'AlertCircle', description: 'Alert and attention-grabbing' },
  { id: 'concerned', label: 'Concerned', icon: 'Brain', description: 'Careful and attentive' },
];

const TEST_PHRASES = [
  "Hello! I'm your SRE AgenticOps AI assistant, powered by Cisco CIRCUIT AI. Let me help you with infrastructure intelligence.",
  "Critical alert: We've detected 3 high-severity vulnerabilities requiring immediate attention.",
  "Great news! Your security posture has improved by 15% this month.",
  "This is an executive summary of your infrastructure status for the board meeting.",
  "Warning: There are 5 field notices affecting your network equipment.",
];

// Icon renderer helper
const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
  const iconProps = { className, strokeWidth: 2 };
  const icons: Record<string, React.ReactNode> = {
    'BarChart3': <BarChart3 {...iconProps} />,
    'Smile': <Smile {...iconProps} />,
    'TrendingUp': <TrendingUp {...iconProps} />,
    'Heart': <Heart {...iconProps} />,
    'AlertCircle': <AlertCircle {...iconProps} />,
    'Brain': <Brain {...iconProps} />,
  };
  return icons[iconName] || <BarChart3 {...iconProps} />;
};

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  isOpen,
  onClose,
  voiceService,
  onProfileChange
}) => {
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile>(voiceService.getProfile());
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getSettings());
  const [selectedEmotion, setSelectedEmotion] = useState<string>('neutral');
  const [isTesting, setIsTesting] = useState(false);
  const [metrics, setMetrics] = useState(voiceService.getAggregatedMetrics());
  const [rating, setRating] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(voiceService.getAggregatedMetrics());
    }, 5000);
    return () => clearInterval(interval);
  }, [voiceService]);

  const handleProfileChange = useCallback((profileId: string) => {
    const profile = VOICE_PROFILES.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfile(profile);
      voiceService.setProfile(profileId);
      setSettings(voiceService.getSettings());
      onProfileChange?.(profile);
    }
  }, [voiceService, onProfileChange]);

  const handleSettingChange = useCallback((key: keyof VoiceSettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    voiceService.updateSettings({ [key]: value });
  }, [settings, voiceService]);

  const handleEmotionSelect = useCallback((emotionId: string) => {
    setSelectedEmotion(emotionId);
    
    // Apply emotion-based settings
    const emotionSettings: Record<string, Partial<VoiceSettings>> = {
      neutral: { rate: 1.0, pitch: 1.0, emphasis: 0.5 },
      friendly: { rate: 1.02, pitch: 1.08, emphasis: 0.7 },
      confident: { rate: 1.0, pitch: 0.95, emphasis: 0.55 },
      reassuring: { rate: 0.95, pitch: 0.98, emphasis: 0.4 },
      urgent: { rate: 1.12, pitch: 1.15, emphasis: 0.85 },
      concerned: { rate: 0.98, pitch: 1.05, emphasis: 0.6 },
    };
    
    const mods = emotionSettings[emotionId];
    if (mods) {
      const newSettings = { ...settings, ...mods };
      setSettings(newSettings);
      voiceService.updateSettings(mods);
    }
  }, [settings, voiceService]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    const phrase = TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)];
    
    const context: VoiceContext = {
      type: selectedEmotion === 'urgent' ? 'urgent' : 
            selectedEmotion === 'concerned' ? 'warning' : 
            selectedEmotion === 'confident' ? 'executive' : 'conversational',
      emotionalTone: selectedEmotion as VoiceContext['emotionalTone']
    };
    
    await voiceService.speak(phrase, context);
    setIsTesting(false);
  }, [voiceService, selectedEmotion]);

  const handleStopTest = useCallback(() => {
    voiceService.stop();
    setIsTesting(false);
  }, [voiceService]);

  const handleRating = useCallback((stars: number) => {
    setRating(stars);
    voiceService.submitRating(stars);
  }, [voiceService]);

  const handleReset = useCallback(() => {
    voiceService.setProfile(selectedProfile.id);
    setSettings(voiceService.getSettings());
    setSelectedEmotion('neutral');
    setRating(0);
  }, [voiceService, selectedProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Voice Settings</h2>
              <p className="text-xs text-gray-400">Customize your AI assistant's voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 space-y-6">
          {/* Voice Profiles */}
          <section>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <span>👤</span> Voice Profiles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {VOICE_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileChange(profile.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedProfile.id === profile.id
                      ? 'bg-purple-600/30 border-2 border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800 border-2 border-transparent hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {profile.gender === 'female' ? '👩' : profile.gender === 'male' ? '👨' : '🤖'}
                    </span>
                    <span className="font-medium text-white text-sm">{profile.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{profile.description}</p>
                  <div className="flex gap-1 mt-2">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                      {profile.accent}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                      {profile.age}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Emotional Tone Presets */}
          <section>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" /> Emotional Tone Profile
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {EMOTIONAL_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleEmotionSelect(preset.id)}
                  className={`p-2 rounded-xl text-center transition-all ${
                    selectedEmotion === preset.id
                      ? 'bg-blue-600/30 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800 border-2 border-transparent hover:border-gray-600'
                  }`}
                  title={preset.description}
                >
                  <div className="text-2xl block mb-1">{renderIcon(preset.icon, 'w-6 h-6')}</div>
                  <span className="text-xs text-white">{preset.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Voice Controls */}
          <section>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Voice Controls
            </h3>
            <div className="space-y-4 bg-gray-800/50 rounded-xl p-4">
              {/* Rate */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-300">Speed</label>
                  <span className="text-sm text-purple-400">{settings.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={settings.rate}
                  onChange={(e) => handleSettingChange('rate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>

              {/* Pitch */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-300">Pitch</label>
                  <span className="text-sm text-purple-400">{settings.pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={settings.pitch}
                  onChange={(e) => handleSettingChange('pitch', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Lower</span>
                  <span>Normal</span>
                  <span>Higher</span>
                </div>
              </div>

              {/* Volume */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-300">Volume</label>
                  <span className="text-sm text-purple-400">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </section>

          {/* Advanced Settings */}
          <section>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-white font-medium mb-3"
            >
              <Settings className={`w-4 h-4 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              Advanced Settings
            </button>
            
            {showAdvanced && (
              <div className="space-y-4 bg-gray-800/50 rounded-xl p-4">
                {/* Emphasis */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm text-gray-300">Prosody Emphasis</label>
                    <span className="text-sm text-purple-400">{Math.round(settings.emphasis * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.emphasis}
                    onChange={(e) => handleSettingChange('emphasis', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values add more variation for expressive speech
                  </p>
                </div>

                {/* Natural Features */}
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.breathPauses}
                      onChange={(e) => handleSettingChange('breathPauses', e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm text-white">Breath Pauses</span>
                      <p className="text-xs text-gray-500">Insert natural breathing pauses in long text</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.naturalPauses}
                      onChange={(e) => handleSettingChange('naturalPauses', e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm text-white">Natural Pauses</span>
                      <p className="text-xs text-gray-500">Add pauses at punctuation for natural rhythm</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* Test Section */}
          <section>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" /> Test Voice Quality
            </h3>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex gap-2 mb-4">
                {isTesting ? (
                  <button
                    onClick={handleStopTest}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 animate-pulse" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={handleTest}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Test Voice
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  title="Reset to defaults"
                >
                  ↺
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm text-gray-400">Rate voice quality:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Quality Metrics */}
          <section>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Quality Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {metrics.avgLatency.toFixed(0)}
                </div>
                <div className="text-xs text-gray-400">Avg Latency (ms)</div>
                <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${metrics.avgLatency < 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {metrics.avgLatency < 200 ? <><CheckCircle className="w-3 h-3" /> Good</> : <><AlertTriangle className="w-3 h-3" /> High</>}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {metrics.avgUserRating > 0 ? metrics.avgUserRating.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-gray-400">Avg Rating</div>
                <div className="text-xs mt-1 flex items-center justify-center gap-1">
                  {metrics.avgUserRating >= 4 ? <span className="text-amber-400"><Star className="w-3 h-3 inline fill-amber-400" /> Excellent</span> : metrics.avgUserRating >= 3 ? <span className="text-emerald-400"><ThumbsUp className="w-3 h-3 inline" /> Good</span> : <span className="text-slate-500">Not rated</span>}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {metrics.totalUtterances}
                </div>
                <div className="text-xs text-gray-400">Total Utterances</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {metrics.naturalPausesAvg.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400">Avg Pauses/Speech</div>
              </div>
            </div>
          </section>

          {/* Info Footer */}
          <div className="bg-gray-800/30 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Target className="w-3 h-3" /> Target: &lt;200ms latency, 90%+ positive feedback
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Voice synthesis powered by Web Speech API with enhanced prosody
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettingsPanel;
