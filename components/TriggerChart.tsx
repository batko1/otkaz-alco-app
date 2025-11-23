import React from 'react';
import { TriggerStat } from '../services/types';

interface TriggerChartProps {
  data: TriggerStat[];
}

export const TriggerChart: React.FC<TriggerChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
           Недостаточно данных для аналитики. <br/> Отмечай триггеры в отчетах.
        </div>
      ) : (
        data.map((item) => (
          <div key={item.id} className="group">
            <div className="flex justify-between items-end mb-1 text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </span>
              <span className="font-mono text-gray-400">{item.count} раз(а)</span>
            </div>
            
            <div className="h-2.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};