import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { getSettings, saveSettings } from '../services/storage';
import { UserSettings } from '../services/types';
import { Wallet, Heart, Trophy, Lock, CheckCircle2, ChevronRight, Edit2 } from 'lucide-react';

interface MotivationViewProps {
  daysSober: number;
}

const HEALTH_TIMELINE = [
  { days: 1, title: 'Похмелье уходит', desc: 'Алкоголь полностью выведен из крови.', icon: '🩸' },
  { days: 3, title: 'Возвращение вкуса', desc: 'Восстанавливается водный баланс и рецепторы.', icon: '👅' },
  { days: 7, title: 'Глубокий сон', desc: 'Нормализуются фазы сна, вы начинаете высыпаться.', icon: '🛌' },
  { days: 14, title: 'Ясный ум', desc: 'Когнитивные способности и память улучшаются.', icon: '🧠' },
  { days: 30, title: 'Печень ликует', desc: 'Жир в печени уменьшается на 15-20%.', icon: '🩺' },
  { days: 90, title: 'Новый уровень', desc: 'Риск сердечно-сосудистых заболеваний снижается.', icon: '❤️' },
];

const ACHIEVEMENTS = [
  { days: 1, title: 'Первый шаг', icon: '🥉' },
  { days: 3, title: 'Трое суток', icon: '🎗️' },
  { days: 7, title: 'Неделя', icon: '🥈' },
  { days: 14, title: 'Две недели', icon: '🛡️' },
  { days: 30, title: 'Месяц', icon: '🥇' },
  { days: 60, title: 'Два месяца', icon: '🚀' },
  { days: 100, title: 'Сотник', icon: '💎' },
  { days: 365, title: 'Легенда', icon: '👑' },
];

export const MotivationView: React.FC<MotivationViewProps> = ({ daysSober }) => {
  const [settings, setSettings] = useState<UserSettings>({ costPerDay: 500, currency: '₽' });
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [tempCost, setTempCost] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
        const saved = await getSettings();
        setSettings(saved);
        setTempCost(saved.costPerDay.toString());
    };
    loadSettings();
  }, []);

  const handleSaveCost = async () => {
    const newCost = parseInt(tempCost) || 0;
    const newSettings = { ...settings, costPerDay: newCost };
    setSettings(newSettings);
    await saveSettings(newSettings);
    setIsEditingCost(false);
  };

  const savings = daysSober * settings.costPerDay;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* --- Economy Section --- */}
      <Card noPadding className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-32 h-32" />
        </div>
        
        <div className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-2">
                <span className="text-emerald-100 font-bold uppercase text-xs tracking-wider">Сэкономлено денег</span>
                <button 
                    onClick={() => setIsEditingCost(!isEditingCost)}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                    <Edit2 className="w-4 h-4 text-white" />
                </button>
            </div>

            {isEditingCost ? (
                <div className="mt-2 animate-fade-in">
                    <label className="text-xs text-emerald-100 mb-1 block">Сколько тратил в день ({settings.currency})?</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            value={tempCost}
                            onChange={(e) => setTempCost(e.target.value)}
                            className="w-full bg-white/20 text-white rounded-lg px-3 py-2 outline-none border border-white/30 focus:border-white"
                            autoFocus
                        />
                        <button onClick={handleSaveCost} className="bg-white text-emerald-600 font-bold px-4 rounded-lg text-sm">OK</button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="text-4xl font-black tracking-tight mt-1 mb-1">
                        {savings.toLocaleString('ru-RU')} {settings.currency}
                    </div>
                    <p className="text-xs text-emerald-100 opacity-80">
                        (~{settings.costPerDay} {settings.currency} в день × {daysSober} дней)
                    </p>
                </div>
            )}
        </div>
      </Card>

      {/* --- Achievements Grid --- */}
      <div>
        <h3 className="text-lg font-bold mb-4 px-2 flex items-center gap-2 dark:text-white">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Достижения
        </h3>
        <div className="grid grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((ach, idx) => {
                const isUnlocked = daysSober >= ach.days;
                return (
                    <div 
                        key={idx}
                        className={`
                            aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center border transition-all duration-500
                            ${isUnlocked 
                                ? 'bg-white dark:bg-[#1C1C1E] border-yellow-200 dark:border-yellow-900/30 shadow-md scale-100' 
                                : 'bg-gray-100 dark:bg-white/5 border-transparent opacity-50 grayscale scale-95'
                            }
                        `}
                    >
                        <span className="text-2xl mb-1 filter drop-shadow-sm">{ach.icon}</span>
                        <span className={`text-[10px] font-bold leading-tight ${isUnlocked ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                            {ach.title}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5">{ach.days} дн.</span>
                    </div>
                )
            })}
        </div>
      </div>

      {/* --- Health Timeline --- */}
      <div>
        <h3 className="text-lg font-bold mb-4 px-2 flex items-center gap-2 dark:text-white">
          <Heart className="w-5 h-5 text-pink-500" />
          Восстановление тела
        </h3>
        
        <div className="space-y-4 relative">
            {/* Connection Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-white/10 -z-10"></div>

            {HEALTH_TIMELINE.map((item, idx) => {
                const isCompleted = daysSober >= item.days;
                const isNext = !isCompleted && (idx === 0 || daysSober >= HEALTH_TIMELINE[idx-1].days);

                return (
                    <div 
                        key={idx} 
                        className={`flex gap-4 items-start relative ${isCompleted ? 'opacity-100' : 'opacity-60 grayscale'}`}
                    >
                        {/* Status Icon */}
                        <div className={`
                            w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-4 z-10 transition-colors
                            ${isCompleted 
                                ? 'bg-white dark:bg-[#2C2C2E] border-green-500 text-2xl shadow-sm' 
                                : isNext 
                                    ? 'bg-white dark:bg-[#2C2C2E] border-blue-400 text-2xl animate-pulse'
                                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-gray-700 text-xl'
                            }
                        `}>
                            {isCompleted ? item.icon : (isNext ? item.icon : <Lock className="w-5 h-5 text-gray-400" />)}
                        </div>

                        {/* Content Card */}
                        <div className={`
                            flex-1 p-4 rounded-2xl border transition-all
                            ${isCompleted
                                ? 'bg-white dark:bg-[#1C1C1E] border-green-100 dark:border-green-900/20 shadow-sm'
                                : isNext
                                    ? 'bg-white dark:bg-[#1C1C1E] border-blue-200 dark:border-blue-900/30'
                                    : 'bg-transparent border-transparent'
                            }
                        `}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold text-sm ${isNext ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                                    {item.title}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500">
                                    {item.days} дн.
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {item.desc}
                            </p>
                            
                            {isNext && (
                                <div className="mt-2 w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full transition-all duration-1000" 
                                        style={{ width: `${Math.min(100, (daysSober / item.days) * 100)}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

    </div>
  );
};