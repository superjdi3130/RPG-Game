import React, { useEffect, useState } from 'react';
import { ClassType } from '../types';

interface TransitionScreenProps {
  onComplete: () => void;
  selectedClass: ClassType;
  language: 'RU' | 'EN';
}

const TransitionScreen: React.FC<TransitionScreenProps> = ({ onComplete, selectedClass, language }) => {
  const [phase, setPhase] = useState<'fadeIn' | 'show' | 'fadeOut'>('fadeIn');
  const [textOpacity, setTextOpacity] = useState(0);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0);

  const message = language === 'RU' ? 'Удачи в новых завоеваниях!' : 'Good luck in your new conquests!';

  useEffect(() => {
    // Fade in
    const fadeInTimer = setTimeout(() => {
      setBackgroundOpacity(1);
      setPhase('show');
    }, 100);

    // Show text with delay
    const textTimer = setTimeout(() => {
      setTextOpacity(1);
    }, 800);

    // Hold for a bit, then fade out
    const fadeOutTimer = setTimeout(() => {
      setPhase('fadeOut');
      setBackgroundOpacity(0);
      setTextOpacity(0);
    }, 3500);

    // Complete transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(textTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Particle animation
  const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

  useEffect(() => {
    const particleCount = 50;
    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: Math.random()
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (phase === 'show') {
      const interval = setInterval(() => {
        setParticles(prev => prev.map(p => ({
          ...p,
          x: (p.x + p.vx + window.innerWidth) % window.innerWidth,
          y: (p.y + p.vy + window.innerHeight) % window.innerHeight,
          life: (p.life + 0.01) % 1
        })));
      }, 16);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
        transition: 'background-color 1s ease-in-out'
      }}
    >
      {/* Animated background with gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, rgba(139, 69, 19, ${backgroundOpacity * 0.3}), rgba(0, 0, 0, ${backgroundOpacity}))`,
          transition: 'opacity 1s ease-in-out'
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-amber-500 rounded-full"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            opacity: Math.sin(p.life * Math.PI) * 0.5 * backgroundOpacity,
            transform: `scale(${0.5 + Math.sin(p.life * Math.PI) * 0.5})`,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      ))}

      {/* Main message */}
      <div 
        className="relative z-10 text-center"
        style={{
          opacity: textOpacity,
          transform: `translateY(${(1 - textOpacity) * 20}px)`,
          transition: 'opacity 1s ease-in-out, transform 1s ease-in-out'
        }}
      >
        <h1 
          className="text-6xl md:text-8xl font-bold mb-6 text-amber-500 drop-shadow-2xl"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            textShadow: `
              0 0 10px rgba(251, 191, 36, 0.8),
              0 0 20px rgba(251, 191, 36, 0.6),
              0 0 30px rgba(251, 191, 36, 0.4),
              0 0 40px rgba(251, 191, 36, 0.2)
            `
          }}
        >
          {message}
        </h1>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-amber-500 rounded-full"
              style={{
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
                opacity: textOpacity
              }}
            />
          ))}
        </div>
      </div>

      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(251, 191, 36, ${textOpacity * 0.1}) 50%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          animation: phase === 'show' ? 'shimmer 3s infinite' : 'none',
          opacity: textOpacity
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default TransitionScreen;

