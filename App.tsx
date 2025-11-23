import React, { useState, useEffect } from 'react';
import { Moon, Sun, X, Loader2, Info, ChevronRight, ShieldAlert, CheckCircle2, Plus, PlusCircle, Wind, Home, Calendar as CalendarIcon, Zap, Cloud } from 'lucide-react';
import { Card } from './components/Card';
import { TRIGGERS } from './constants';
import { getSOSAdvice } from './services/geminiService';
import { saveReport, getReports } from './services/storage';
import { DailyReport } from './services/types';
import { HistoryView } from './components/HistoryView';
import { MotivationView } from './components/MotivationView';
import { BreathingModal } from './components/BreathingModal';

const ALCOHOL_TYPES = [
  { id: 'beer', label: 'Пиво', emoji: '🍺' },
  { id: 'wine', label: 'Вино', emoji: '🍷' },
  { id: 'spirits', label: 'Крепкое', emoji: '🥃' },
  { id: 'cocktail', label: 'Коктейль', emoji: '🍹' },
  { id: 'other', label: 'Другое', emoji: '🥤' },
];

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'motivation'>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [startDate, setStartDate] = useState<string>('2025-11-10');
  const [daysSober, setDaysSober] = useState(0);

  // Form State
  const [status, setStatus] = useState<'sober' | 'relapse'>('sober');
  const [mood, setMood] = useState(5);
  const [craving, setCraving] = useState(2);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [alcoholType, setAlcoholType] = useState<string>('');
  const [alcoholAmount, setAlcoholAmount] = useState<string>('');
  const [customTriggers, setCustomTriggers] = useState<string[]>([]);
  const [customInputText, setCustomInputText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [note, setNote] = useState('');
  
  // UI State
  const [sosLoading, setSosLoading] = useState(false);
  const [sosMessage, setSosMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Setup Telegram
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        try {
          // Check if expand is supported (v6.1+)
          if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
            window.Telegram.WebApp.expand(); 
          }
        } catch (e) {
          console.log('Expand not supported');
        }
        
        if (window.Telegram.WebApp.colorScheme === 'dark') {
          setIsDarkMode(true);
        }
      }

      // 2. Fetch Data (Cloud Sync)
      try {
        const reports = await getReports();
        
        // Find last relapse
        const sortedReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastRelapse = sortedReports.find(r => r.didDrink);
        
        if (lastRelapse) {
            // If there is a relapse recorded, the sobriety starts the day AFTER the relapse
            const relapseDate = new Date(lastRelapse.date);
            relapseDate.setDate(relapseDate.getDate() + 1);
            setStartDate(relapseDate.toISOString().split('T')[0]);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Recalculate sober days when startDate changes
  useEffect(() => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Prevent negative days if start date is in future
    if (start > today) {
        setDaysSober(0);
        return;
    }

    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    setDaysSober(diffDays);
  }, [startDate]);

  // --- Helpers ---
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    // HapticFeedback introduced in v6.1
    if (window.Telegram?.WebApp?.HapticFeedback && window.Telegram.WebApp.isVersionAtLeast('6.1')) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
      } catch (e) {
        // ignore
      }
      return;
    }
    // Fallback for browser
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(style === 'medium' ? 15 : 10);
    }
  };

  const triggerSuccessHaptic = () => {
    if (window.Telegram?.WebApp?.HapticFeedback && window.Telegram.WebApp.isVersionAtLeast('6.1')) {
       try {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
       } catch (e) {
         // ignore
       }
    } else if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([50, 50, 50]);
    }
  }

  // --- Handlers ---
  const toggleTrigger = (id: string) => {
    triggerHaptic('light');
    setSelectedTriggers(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAddCustomTrigger = () => {
    if (customInputText.trim()) {
      triggerHaptic('medium');
      setCustomTriggers([...customTriggers, customInputText.trim()]);
      setCustomInputText('');
    }
  };

  const handleRemoveCustomTrigger = (index: number) => {
    triggerHaptic('light');
    setCustomTriggers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSOS = async () => {
    triggerHaptic('heavy');
    setSosLoading(true);
    setSosMessage(null);

    const activeTriggerLabels = TRIGGERS
      .filter(t => selectedTriggers.includes(t.id))
      .map(t => t.label);

    activeTriggerLabels.push(...customTriggers);

    const advice = await getSOSAdvice(
      craving,
      activeTriggerLabels,
      mood
    );
    setSosMessage(advice);
    setSosLoading(false);
    triggerSuccessHaptic();
  };

  const handleSubmit = async () => {
    triggerHaptic('medium');
    setIsSubmitting(true);
    
    const reportData: DailyReport = {
        date: new Date().toISOString(),
        didDrink: status === 'relapse',
        moodLevel: mood,
        cravingLevel: craving,
        triggers: [...selectedTriggers, ...customTriggers],
        note,
        alcoholType: status === 'relapse' ? alcoholType : undefined,
        alcoholAmount: status === 'relapse' ? alcoholAmount : undefined
    };
    
    // Async save to Cloud
    await saveReport(reportData);

    // Update local state if relapse occurred to reset counter visually immediately
    if (status === 'relapse') {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        setStartDate(nextDay.toISOString().split('T')[0]);
    }

    setIsSubmitting(false);
    triggerSuccessHaptic();

    // Reset Form
    setCraving(0);
    setSelectedTriggers([]);
    setCustomTriggers([]);
    setCustomInputText('');
    setShowCustomInput(false);
    setNote('');
    setAlcoholType('');
    setAlcoholAmount('');
    
    setActiveTab('history');
  };

  const getMoodEmoji = (val: number) => {
    if (val < 3) return '😫';
    if (val < 5) return '😟';
    if (val === 5) return '😐';
    if (val < 8) return '🙂';
    return '😁';
  };

  const getCravingColor = (val: number) => {
      if (val < 3) return 'bg-green-500';
      if (val < 7) return 'bg-yellow-500';
      return 'bg-red-500';
  };
  
  const getCravingHex = (val: number) => {
      if (val < 3) return '#22C55E';
      if (val < 7) return '#EAB308';
      return '#EF4444'; 
  };

  const getCravingText = (val: number) => {
    if (val === 0) return 'Нет тяги';
    if (val < 3) return 'Слабая';
    if (val < 7) return 'Умеренная';
    return 'Сильная';
  }

  const getSliderStyle = (value: number, max: number, activeColor: string) => {
    const percentage = (value / max) * 100;
    return {
      background: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percentage}%, var(--track-color) ${percentage}%, var(--track-color) 100%)`
    };
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-background dark:bg-black flex flex-col items-center justify-center p-4">
              <Cloud className="w-12 h-12 text-blue-500 animate-bounce mb-4" />
              <h2 className="text-xl font-bold dark:text-white mb-2">Загрузка...</h2>
              <p className="text-gray-500 text-sm">Синхронизация данных</p>
          </div>
      );
  }

  const renderContent = () => {
      if (activeTab === 'home') {
          return (
            <div className="space-y-6 animate-fade-in pb-24">
                
              <Card noPadding className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black dark:from-[#2C2C2E] dark:to-black z-0"></div>
                
                <div className="relative z-10 p-8 flex flex-col items-center justify-center text-center">
                  <div className="absolute top-4 right-4 text-white/10 group-hover:text-white/20 transition-colors">
                      <ShieldAlert className="w-24 h-24" />
                  </div>
                  
                  <span className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-1">Мой прогресс</span>
                  
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                      <span className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-sm">
                      {daysSober}
                      </span>
                  </div>
                  <span className="text-lg text-gray-400 font-medium -mt-2">дней свободы</span>
                  
                  <button 
                      onClick={() => { triggerHaptic('light'); setShowSettings(!showSettings); }}
                      className="mt-6 flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
                  >
                      <span>Старт: {startDate}</span>
                      <ChevronRight className="w-3 h-3" />
                  </button>
  
                  {showSettings && (
                      <div className="w-full mt-4 pt-4 border-t border-white/10 animate-fade-in">
                          <label className="text-xs text-gray-400 mb-2 block text-left">Изменить дату начала:</label>
                          <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                          />
                      </div>
                  )}
                </div>
              </Card>
  
              <Card title="Чек-ин состояния">
                <div className="bg-gray-100 dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/5 p-1.5 rounded-2xl mb-6 flex relative">
                  <div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-[#3A3A3C] rounded-[14px] shadow-sm transition-all duration-300 ease-out ${status === 'relapse' ? 'translate-x-[100%] translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}
                  ></div>
  
                  <button 
                    onClick={() => { triggerHaptic('light'); setStatus('sober'); }}
                    className={`flex-1 relative z-10 py-2.5 text-[15px] font-bold text-center rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 ${status === 'sober' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <span>👍</span> Я молодец
                  </button>
                  <button 
                    onClick={() => { triggerHaptic('light'); setStatus('relapse'); }}
                    className={`flex-1 relative z-10 py-2.5 text-[15px] font-bold text-center rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 ${status === 'relapse' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <span>⚠️</span> Был срыв
                  </button>
                </div>
  
                {status === 'relapse' && (
                  <div className="animate-fade-in mb-8 bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-100 dark:border-red-900/20">
                      <div className="mb-4">
                          <label className="text-xs font-bold text-red-500/80 dark:text-red-400/80 uppercase tracking-wide mb-3 block">Что выпили?</label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {ALCOHOL_TYPES.map((type) => (
                                  <button
                                      key={type.id}
                                      onClick={() => { triggerHaptic('light'); setAlcoholType(type.id); }}
                                      className={`
                                          flex flex-col items-center justify-center p-2 rounded-xl border transition-all
                                          ${alcoholType === type.id 
                                              ? 'bg-white dark:bg-[#2C2C2E] border-red-400 shadow-md transform scale-105' 
                                              : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10'
                                          }
                                      `}
                                  >
                                      <span className="text-2xl mb-1">{type.emoji}</span>
                                      <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{type.label}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-red-500/80 dark:text-red-400/80 uppercase tracking-wide mb-2 block">Сколько?</label>
                        <input
                          type="text"
                          value={alcoholAmount}
                          onChange={(e) => setAlcoholAmount(e.target.value)}
                          placeholder="Например: 2 банки пива, 100гр..."
                          className="w-full bg-white dark:bg-[#2C2C2E] border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 transition-all dark:text-white placeholder:text-gray-400"
                        />
                      </div>
                  </div>
                )}
  
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Настроение</span>
                      <span className="text-3xl animate-blob">
                          {getMoodEmoji(mood)}
                      </span>
                    </div>
                    <div className="relative h-8 w-full flex items-center">
                      <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="1"
                          value={mood}
                          onChange={(e) => {
                              setMood(parseInt(e.target.value));
                          }}
                          className="w-full rounded-full"
                          style={getSliderStyle(mood, 10, '#3B82F6')} 
                      />
                    </div>
                    <div className="flex justify-between px-1 mt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ужасно</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Отлично</span>
                    </div>
                  </div>
                </div>
              </Card>
  
              <Card title="Анализ тяги">
                  <div className="mb-8 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Сила желания выпить</span>
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${getCravingColor(craving)} bg-opacity-10 dark:bg-opacity-20`}>
                              <div className={`w-2 h-2 rounded-full ${getCravingColor(craving)}`}></div>
                              <span className={`text-xs font-bold ${craving < 7 ? 'text-black dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                                  {getCravingText(craving)}
                              </span>
                          </div>
                      </div>
                      <div className="relative h-8 w-full flex items-center">
                          <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              step="1"
                              value={craving}
                              onChange={(e) => setCraving(parseInt(e.target.value))}
                              className="w-full rounded-full"
                              style={getSliderStyle(craving, 10, getCravingHex(craving))}
                          />
                      </div>
                  </div>
  
                  <div className="mb-3 px-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Что провоцирует?</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {TRIGGERS.map((trigger) => {
                      const isSelected = selectedTriggers.includes(trigger.id);
                      return (
                        <button
                          key={trigger.id}
                          onClick={() => toggleTrigger(trigger.id)}
                          className={`
                            relative flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 border-2
                            active:scale-95 touch-manipulation group
                            ${isSelected 
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600 text-white shadow-xl shadow-blue-500/30 animate-pop' 
                              : 'bg-white dark:bg-[#2C2C2E] border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-200 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-md'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                              <span className="text-2xl filter drop-shadow-sm">{trigger.emoji}</span>
                              <span className="text-sm font-bold leading-tight">{trigger.label}</span>
                          </div>
                          
                          {isSelected && (
                              <div className="animate-fade-in">
                                  <CheckCircle2 className="w-5 h-5 text-white fill-blue-500/20" />
                              </div>
                          )}
                        </button>
                      );
                    })}
                    
                    {customTriggers.map((text, index) => (
                        <button
                          key={`custom-${index}`}
                          onClick={() => handleRemoveCustomTrigger(index)}
                          className="relative flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 border-2 active:scale-95 touch-manipulation bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-xl shadow-purple-500/30 animate-pop"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-2xl filter drop-shadow-sm">⚡</span>
                              <span className="text-sm font-bold leading-tight truncate">{text}</span>
                          </div>
                          <div className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition-colors">
                              <X className="w-3 h-3 text-white" />
                          </div>
                        </button>
                    ))}
  
                    <button
                        onClick={() => { triggerHaptic('light'); setShowCustomInput(!showCustomInput); }}
                        className={`
                          relative flex items-center justify-center gap-2 px-4 py-4 rounded-2xl transition-all duration-300 border-2 border-dashed
                          active:scale-95 touch-manipulation
                          ${showCustomInput 
                            ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-500/50 text-blue-600 dark:text-blue-400' 
                            : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5'
                          }
                        `}
                      >
                        {showCustomInput ? (
                            <>
                              <span className="text-sm font-bold">Отмена</span>
                            </>
                        ) : (
                            <>
                              <PlusCircle className="w-5 h-5 opacity-70" />
                              <span className="text-sm font-bold">Добавить...</span>
                            </>
                        )}
                      </button>
                  </div>
  
                  {showCustomInput && (
                      <div className="mt-4 animate-fade-in p-1">
                          <div className="flex gap-2 items-center">
                              <input 
                                  type="text"
                                  value={customInputText}
                                  onChange={(e) => setCustomInputText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTrigger()}
                                  placeholder="Например: Ссора с женой..."
                                  className="flex-1 bg-white dark:bg-[#2C2C2E] text-gray-800 dark:text-white text-[15px] rounded-xl px-4 py-3 outline-none ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-gray-400"
                                  autoFocus
                              />
                              <button 
                                  onClick={handleAddCustomTrigger}
                                  disabled={!customInputText.trim()}
                                  className="bg-blue-600 text-white p-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                              >
                                  <Plus className="w-6 h-6" />
                              </button>
                          </div>
                      </div>
                  )}
              </Card>
  
              <Card title="Заметки">
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="О чем думаешь? (нажми чтобы писать)"
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-[#2C2C2E] dark:text-white rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm placeholder:text-gray-400 leading-relaxed border border-slate-200 dark:border-white/5 shadow-inner"
                />
              </Card>
  
              {/* --- Actions --- */}
              <div className="space-y-4 pt-2">
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleSOS}
                    disabled={sosLoading}
                    className="flex-1 relative overflow-hidden bg-white dark:bg-[#1C1C1E] border-2 border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 font-bold text-lg py-4 rounded-3xl hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-[0.97] transition-all shadow-lg shadow-red-500/5 flex items-center justify-center gap-2 group"
                  >
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                    {sosLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <ShieldAlert className="w-6 h-6 animate-pulse" />}
                    <span>SOS — AI</span>
                  </button>

                  <button 
                    onClick={() => { triggerHaptic('medium'); setShowBreathing(true); }}
                    className="w-[30%] relative overflow-hidden bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 font-bold py-4 rounded-3xl hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 group"
                  >
                    <Wind className="w-6 h-6" />
                    <span className="text-[10px] uppercase tracking-wide">Дыхание</span>
                  </button>
                </div>
  
                <button 
                  id="submit-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`w-full font-bold text-lg py-5 rounded-3xl transition-all active:scale-[0.98] flex items-center justify-center relative overflow-hidden
                    ${selectedTriggers.length > 0 || note.length > 0 || status === 'relapse' || craving > 0 || customTriggers.length > 0
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl shadow-black/20 dark:shadow-white/10' 
                        : 'bg-gray-200 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500 cursor-not-allowed'}
                  `}
                >
                  <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-[shimmer_2s_infinite]"></div>
                  
                  {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : "Сохранить запись"}
                </button>
              </div>
  
            </div>
          );
      } 
      
      if (activeTab === 'motivation') {
          return <MotivationView daysSober={daysSober} />
      }

      return <HistoryView />;
  };

  return (
    <div className="min-h-screen pb-safe relative font-sans transition-colors duration-300">
      
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={`absolute top-0 left-[-20%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[80px] animate-blob`}></div>
        <div className={`absolute top-0 right-[-20%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[80px] animate-blob animation-delay-2000`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-pink-400/20 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[80px] animate-blob animation-delay-4000`}></div>
      </div>

      <header className="sticky top-0 z-20 pt-2 pb-2">
        <div className="px-5 h-14 flex justify-between items-center max-w-md mx-auto bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md rounded-full shadow-sm border border-white/40 dark:border-white/5 mx-4 mt-2">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight dark:text-white">OtkazAlco</h1>
            </div>
            
            <button 
            onClick={() => { triggerHaptic('light'); setIsDarkMode(!isDarkMode); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-black dark:text-white transition-all active:scale-90 hover:bg-gray-200 dark:hover:bg-[#3A3A3C]"
            >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 transition-all duration-300">
        {renderContent()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom">
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 pb-6 pt-3 px-6 rounded-t-[30px] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] max-w-md mx-auto flex justify-between items-center">
            <button 
                onClick={() => { triggerHaptic('light'); setActiveTab('home'); }}
                className={`flex flex-col items-center gap-1 transition-all w-16 ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-bold">Главная</span>
            </button>
            
            <button 
                onClick={() => { triggerHaptic('light'); setActiveTab('motivation'); }}
                className={`flex flex-col items-center gap-1 transition-all w-16 ${activeTab === 'motivation' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <Zap className={`w-6 h-6 ${activeTab === 'motivation' ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-bold">Мотивация</span>
            </button>

            <button 
                onClick={() => { triggerHaptic('light'); setActiveTab('history'); }}
                className={`flex flex-col items-center gap-1 transition-all w-16 ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <CalendarIcon className={`w-6 h-6 ${activeTab === 'history' ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-bold">История</span>
            </button>
        </div>
      </div>

      {showBreathing && (
        <BreathingModal onClose={() => setShowBreathing(false)} />
      )}

      {sosMessage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
          <div 
             className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-fade-in"
             onClick={() => setSosMessage(null)}
          />
          <div className="bg-white dark:bg-[#1C1C1E] rounded-t-[36px] sm:rounded-[36px] p-8 max-w-sm w-full shadow-2xl pointer-events-auto transform transition-all animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)] m-0 sm:m-4 relative overflow-hidden border-t border-white/20">
             <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Info className="w-6 h-6" />
                   </div>
                   <div>
                        <h3 className="text-xl font-bold dark:text-white leading-tight">Совет помощника</h3>
                        <p className="text-xs text-gray-500 font-medium">Сгенерировано AI</p>
                   </div>
               </div>
               <button onClick={() => setSosMessage(null)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full hover:bg-gray-200 transition-colors">
                 <X className="w-5 h-5 text-gray-500 dark:text-white" />
               </button>
             </div>
             
             <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl p-6 mb-8 border border-blue-100 dark:border-blue-900/20">
                <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed font-medium">
                {sosMessage}
                </p>
             </div>
             
             <button 
               onClick={() => setSosMessage(null)}
               className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-lg py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
             >
               Я справлюсь
             </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;