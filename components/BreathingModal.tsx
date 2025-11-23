import React, { useEffect, useState, useRef } from 'react';
import { X, Wind } from 'lucide-react';

interface BreathingModalProps {
  onClose: () => void;
}

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale';

export const BreathingModal: React.FC<BreathingModalProps> = ({ onClose }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(3); // 3 sec countdown before start
  const [cycleCount, setCycleCount] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    if (window.Telegram?.WebApp?.HapticFeedback && window.Telegram.WebApp.isVersionAtLeast('6.1')) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
      } catch (e) {
        // ignore
      }
    } else if (window.navigator?.vibrate) {
      window.navigator.vibrate(style === 'heavy' ? 50 : 20);
    }
  };

  useEffect(() => {
    // Initial Countdown
    if (phase === 'idle') {
      if (timeLeft > 0) {
        const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(t);
      } else {
        startCycle();
      }
    }
  }, [phase, timeLeft]);

  const startCycle = () => {
    runPhase('inhale');
  };

  const runPhase = (currentPhase: Phase) => {
    setPhase(currentPhase);
    
    let duration = 0;
    let nextPhase: Phase = 'idle';

    if (currentPhase === 'inhale') {
      duration = 4000;
      nextPhase = 'hold';
      triggerHaptic('medium');
    } else if (currentPhase === 'hold') {
      duration = 7000;
      nextPhase = 'exhale';
      triggerHaptic('light');
    } else if (currentPhase === 'exhale') {
      duration = 8000;
      nextPhase = 'inhale';
      triggerHaptic('heavy');
    }

    timerRef.current = setTimeout(() => {
      if (currentPhase === 'exhale') {
        setCycleCount(c => c + 1);
      }
      runPhase(nextPhase);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getConfig = () => {
    switch (phase) {
      case 'idle':
        return { 
          text: timeLeft > 0 ? timeLeft.toString() : "Поехали", 
          subtext: "Приготовьтесь...",
          scale: 'scale-100', 
          color: 'bg-gray-200 dark:bg-gray-700',
          duration: 'duration-1000'
        };
      case 'inhale':
        return { 
          text: "Вдох", 
          subtext: "Носом, глубоко...", 
          scale: 'scale-[1.8]', 
          color: 'bg-blue-400 dark:bg-blue-500 shadow-[0_0_50px_rgba(96,165,250,0.6)]',
          duration: 'duration-[4000ms]'
        };
      case 'hold':
        return { 
          text: "Задержка", 
          subtext: "Не выдыхай...", 
          scale: 'scale-[1.8]', 
          color: 'bg-indigo-400 dark:bg-indigo-500 shadow-[0_0_50px_rgba(129,140,248,0.6)] animate-pulse', 
          duration: 'duration-0' // Instant color switch
        };
      case 'exhale':
        return { 
          text: "Выдох", 
          subtext: "Ртом, медленно...", 
          scale: 'scale-100', 
          color: 'bg-emerald-400 dark:bg-emerald-600 shadow-none',
          duration: 'duration-[8000ms]'
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 dark:bg-[#000000]/95 backdrop-blur-xl animate-fade-in touch-none">
      
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 transition-colors z-20"
      >
        <X className="w-6 h-6 dark:text-white" />
      </button>

      <div className="absolute top-10 flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
          <Wind className="w-5 h-5" />
          Техника 4-7-8
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Успокаивает нервную систему</p>
      </div>

      <div className="relative w-64 h-64 flex items-center justify-center mb-12">
        <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-white/5 scale-[1.8] opacity-30"></div>
        <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-white/5 scale-100 opacity-30"></div>

        <div 
          className={`
            w-32 h-32 rounded-full flex items-center justify-center
            transition-all ease-linear ${config.duration}
            ${config.scale} ${config.color}
          `}
        >
          <span className="text-2xl font-bold text-white tracking-widest animate-fade-in">
            {config.text}
          </span>
        </div>
      </div>

      <div className="text-center h-20 px-4">
        <p className="text-2xl font-medium text-gray-800 dark:text-gray-200 transition-all duration-500">
           {config.subtext}
        </p>
        {cycleCount > 0 && (
          <p className="text-xs text-gray-400 mt-4 font-mono uppercase">
            Циклов: {cycleCount}
          </p>
        )}
      </div>

      <button 
        onClick={onClose}
        className="mt-12 px-8 py-3 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white font-bold hover:bg-gray-200 transition-colors"
      >
        Закончить
      </button>
    </div>
  );
};