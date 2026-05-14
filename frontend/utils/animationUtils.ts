/**
 * Animation Utilities
 * 
 * Sophisticated animation utilities for enhanced data visualization.
 * Includes smooth transitions, particle effects, and interactive animations.
 * 
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ==================== TYPES ====================

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring' | 'bounce';
  delay?: number;
  repeat?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate';
}

export interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  color: string | string[];
  opacity: { start: number; end: number };
  lifespan: number;
  shape: 'circle' | 'square' | 'star' | 'line';
  direction: 'up' | 'down' | 'radial' | 'random';
}

export interface TransitionState {
  from: number;
  to: number;
  current: number;
  progress: number;
  isAnimating: boolean;
}

// ==================== EASING FUNCTIONS ====================

export const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

// ==================== ANIMATION HOOKS ====================

/**
 * Hook for animating numeric values with smooth transitions
 */
export const useAnimatedValue = (
  targetValue: number,
  config: Partial<AnimationConfig> = {}
) => {
  const { duration = 1000, easing = 'easeOut', delay = 0 } = config;
  const [currentValue, setCurrentValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(targetValue);
  const prevTargetRef = useRef<number>(targetValue);

  useEffect(() => {
    if (prevTargetRef.current === targetValue) return;

    const startValue = currentValue;
    startValueRef.current = startValue;
    prevTargetRef.current = targetValue;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp + delay;
      }

      const elapsed = timestamp - startTimeRef.current;
      
      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      const newValue = startValue + (targetValue - startValue) * easedProgress;

      setCurrentValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        startTimeRef.current = 0;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, easing, delay, currentValue]);

  return currentValue;
};

/**
 * Hook for counting up animations
 */
export const useCountUp = (
  end: number,
  options: {
    start?: number;
    duration?: number;
    decimals?: number;
    easing?: keyof typeof easingFunctions;
    separator?: string;
    suffix?: string;
    prefix?: string;
    onComplete?: () => void;
  } = {}
) => {
  const {
    start = 0,
    duration = 2000,
    decimals = 0,
    easing = 'easeOut',
    separator = ',',
    suffix = '',
    prefix = '',
    onComplete
  } = options;

  const [displayValue, setDisplayValue] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef(start);

  const formatNumber = useCallback((num: number) => {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return `${prefix}${formatted}${decimal ? '.' + decimal : ''}${suffix}`;
  }, [decimals, separator, prefix, suffix]);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    startValueRef.current = displayValue;
    startTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      const newValue = startValueRef.current + (end - startValueRef.current) * easedProgress;

      setDisplayValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [displayValue, end, duration, easing, onComplete]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Auto-start on mount
  useEffect(() => {
    startAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);

  return {
    value: displayValue,
    formattedValue: formatNumber(displayValue),
    isAnimating,
    restart: startAnimation
  };
};

/**
 * Hook for staggered animations on lists
 */
export const useStaggeredAnimation = (
  itemCount: number,
  options: {
    baseDelay?: number;
    staggerDelay?: number;
    duration?: number;
  } = {}
) => {
  const { baseDelay = 0, staggerDelay = 100, duration = 500 } = options;
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, i]));
      }, baseDelay + i * staggerDelay);
      timeouts.push(timeout);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [itemCount, baseDelay, staggerDelay]);

  const getItemStyle = useCallback((index: number) => ({
    opacity: visibleItems.has(index) ? 1 : 0,
    transform: visibleItems.has(index) ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
  }), [visibleItems, duration]);

  const getItemClasses = useCallback((index: number) => 
    visibleItems.has(index) 
      ? 'opacity-100 translate-y-0' 
      : 'opacity-0 translate-y-5',
    [visibleItems]
  );

  return { visibleItems, getItemStyle, getItemClasses };
};

/**
 * Hook for pulse/heartbeat animations
 */
export const usePulseAnimation = (
  isActive: boolean,
  options: {
    minScale?: number;
    maxScale?: number;
    duration?: number;
  } = {}
) => {
  const { minScale = 0.95, maxScale = 1.05, duration = 1000 } = options;
  const [scale, setScale] = useState(1);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setScale(1);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = ((timestamp - startTime) % duration) / duration;
      const oscillation = Math.sin(progress * Math.PI * 2);
      const newScale = 1 + (oscillation * (maxScale - minScale) / 2);
      setScale(newScale);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, minScale, maxScale, duration]);

  return { scale, style: { transform: `scale(${scale})` } };
};

// ==================== PARTICLE SYSTEM ====================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

/**
 * Hook for creating particle effects
 */
export const useParticleEffect = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  config: Partial<ParticleConfig> = {}
) => {
  const {
    count = 50,
    size = { min: 2, max: 6 },
    speed = { min: 0.5, max: 2 },
    color = ['#06b6d4', '#3b82f6', '#8b5cf6'],
    opacity = { start: 1, end: 0 },
    lifespan = 2000,
    shape = 'circle',
    direction = 'up'
  } = config;

  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const colors = Array.isArray(color) ? color : [color];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    let vx = 0, vy = 0;
    const particleSpeed = speed.min + Math.random() * (speed.max - speed.min);

    switch (direction) {
      case 'up':
        vx = (Math.random() - 0.5) * particleSpeed;
        vy = -particleSpeed;
        break;
      case 'down':
        vx = (Math.random() - 0.5) * particleSpeed;
        vy = particleSpeed;
        break;
      case 'radial':
        const angle = Math.random() * Math.PI * 2;
        vx = Math.cos(angle) * particleSpeed;
        vy = Math.sin(angle) * particleSpeed;
        break;
      case 'random':
        vx = (Math.random() - 0.5) * particleSpeed * 2;
        vy = (Math.random() - 0.5) * particleSpeed * 2;
        break;
    }

    return {
      x: Math.random() * canvas.width,
      y: direction === 'up' ? canvas.height : direction === 'down' ? 0 : canvas.height / 2,
      vx,
      vy,
      size: size.min + Math.random() * (size.max - size.min),
      color: randomColor,
      opacity: opacity.start,
      life: 0,
      maxLife: lifespan * (0.5 + Math.random() * 0.5)
    };
  }, [color, size, speed, direction, opacity, lifespan]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
        break;
      case 'star':
        drawStar(ctx, particle.x, particle.y, 5, particle.size, particle.size / 2);
        break;
      case 'line':
        ctx.lineWidth = particle.size / 2;
        ctx.strokeStyle = particle.color;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
        ctx.stroke();
        break;
    }

    ctx.globalAlpha = 1;
  }, [shape]);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsActive(true);
    particlesRef.current = Array.from({ length: count }, () => createParticle(canvas));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(particle => {
        particle.life += deltaTime;
        
        if (particle.life >= particle.maxLife) {
          return false;
        }

        const lifeProgress = particle.life / particle.maxLife;
        particle.opacity = opacity.start + (opacity.end - opacity.start) * lifeProgress;

        particle.x += particle.vx * (deltaTime / 16);
        particle.y += particle.vy * (deltaTime / 16);

        drawParticle(ctx, particle);
        return true;
      });

      // Respawn particles
      while (particlesRef.current.length < count) {
        particlesRef.current.push(createParticle(canvas));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [canvasRef, count, createParticle, drawParticle, opacity]);

  const stop = useCallback(() => {
    setIsActive(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const burst = useCallback((x: number, y: number, burstCount: number = 20) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = Array.isArray(color) ? color : [color];
    
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.5;
      const particleSpeed = speed.min + Math.random() * (speed.max - speed.min) * 2;
      
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * particleSpeed,
        vy: Math.sin(angle) * particleSpeed,
        size: size.min + Math.random() * (size.max - size.min),
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: opacity.start,
        life: 0,
        maxLife: lifespan * 0.5
      });
    }
  }, [canvasRef, color, size, speed, opacity, lifespan]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { isActive, start, stop, burst };
};

// Helper function to draw a star
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// ==================== CSS ANIMATION GENERATORS ====================

export const generateKeyframes = (
  name: string,
  keyframes: Record<string, Record<string, string | number>>
): string => {
  const keyframeEntries = Object.entries(keyframes)
    .map(([position, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ');
      return `${position} { ${styleString} }`;
    })
    .join(' ');

  return `@keyframes ${name} { ${keyframeEntries} }`;
};

export const animationPresets = {
  fadeIn: {
    animation: 'fadeIn 0.5s ease-out forwards',
    keyframes: generateKeyframes('fadeIn', {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 }
    })
  },
  slideUp: {
    animation: 'slideUp 0.5s ease-out forwards',
    keyframes: generateKeyframes('slideUp', {
      '0%': { opacity: 0, transform: 'translateY(20px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' }
    })
  },
  slideDown: {
    animation: 'slideDown 0.5s ease-out forwards',
    keyframes: generateKeyframes('slideDown', {
      '0%': { opacity: 0, transform: 'translateY(-20px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' }
    })
  },
  scaleIn: {
    animation: 'scaleIn 0.3s ease-out forwards',
    keyframes: generateKeyframes('scaleIn', {
      '0%': { opacity: 0, transform: 'scale(0.9)' },
      '100%': { opacity: 1, transform: 'scale(1)' }
    })
  },
  pulse: {
    animation: 'pulse 2s ease-in-out infinite',
    keyframes: generateKeyframes('pulse', {
      '0%, 100%': { transform: 'scale(1)', opacity: 1 },
      '50%': { transform: 'scale(1.05)', opacity: 0.9 }
    })
  },
  glow: {
    animation: 'glow 2s ease-in-out infinite',
    keyframes: generateKeyframes('glow', {
      '0%, 100%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.5)' },
      '50%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)' }
    })
  },
  shimmer: {
    animation: 'shimmer 2s linear infinite',
    keyframes: generateKeyframes('shimmer', {
      '0%': { backgroundPosition: '-1000px 0' },
      '100%': { backgroundPosition: '1000px 0' }
    })
  },
  float: {
    animation: 'float 3s ease-in-out infinite',
    keyframes: generateKeyframes('float', {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' }
    })
  },
  shake: {
    animation: 'shake 0.5s ease-in-out',
    keyframes: generateKeyframes('shake', {
      '0%, 100%': { transform: 'translateX(0)' },
      '25%': { transform: 'translateX(-5px)' },
      '75%': { transform: 'translateX(5px)' }
    })
  },
  bounce: {
    animation: 'bounce 0.6s ease-out',
    keyframes: generateKeyframes('bounce', {
      '0%': { transform: 'scale(0)', opacity: 0 },
      '50%': { transform: 'scale(1.2)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { transform: 'scale(1)', opacity: 1 }
    })
  }
};

// ==================== TRANSITION HELPERS ====================

export const createSmoothTransition = (
  properties: string[],
  duration: number = 300,
  easing: string = 'ease-out'
): string => {
  return properties.map(prop => `${prop} ${duration}ms ${easing}`).join(', ');
};

export const transitionPresets = {
  default: createSmoothTransition(['all'], 300, 'ease-out'),
  fast: createSmoothTransition(['all'], 150, 'ease-out'),
  slow: createSmoothTransition(['all'], 500, 'ease-in-out'),
  transform: createSmoothTransition(['transform', 'opacity'], 300, 'ease-out'),
  color: createSmoothTransition(['color', 'background-color', 'border-color'], 200, 'ease'),
  size: createSmoothTransition(['width', 'height', 'padding', 'margin'], 300, 'ease-out'),
  spring: createSmoothTransition(['transform'], 500, 'cubic-bezier(0.68, -0.55, 0.265, 1.55)')
};

// ==================== INTERSECTION OBSERVER HOOK ====================

export const useIntersectionAnimation = (
  ref: React.RefObject<HTMLElement>,
  options: {
    threshold?: number;
    triggerOnce?: boolean;
    animationClass?: string;
  } = {}
) => {
  const { threshold = 0.1, triggerOnce = true, animationClass = 'animate-in' } = options;
  const [isVisible, setIsVisible] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasAnimated.current)) {
          setIsVisible(true);
          hasAnimated.current = true;
          element.classList.add(animationClass);
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
          element.classList.remove(animationClass);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, triggerOnce, animationClass]);

  return isVisible;
};

// ==================== DATA STREAMING ANIMATION ====================

export const useStreamingData = <T,>(
  data: T[],
  options: {
    chunkSize?: number;
    interval?: number;
    onChunk?: (chunk: T[], index: number) => void;
  } = {}
) => {
  const { chunkSize = 10, interval = 100, onChunk } = options;
  const [visibleData, setVisibleData] = useState<T[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setVisibleData([]);
    setProgress(0);

    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      const endIndex = Math.min(currentIndex + chunkSize, data.length);
      const chunk = data.slice(currentIndex, endIndex);
      
      setVisibleData(prev => [...prev, ...chunk]);
      setProgress((endIndex / data.length) * 100);
      
      onChunk?.(chunk, currentIndex);
      currentIndex = endIndex;

      if (currentIndex >= data.length) {
        setIsStreaming(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, interval);
  }, [data, chunkSize, interval, onChunk]);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    visibleData,
    isStreaming,
    progress,
    startStreaming,
    stopStreaming,
    remainingCount: data.length - visibleData.length
  };
};
