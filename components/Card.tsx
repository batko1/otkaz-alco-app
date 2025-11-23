import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, noPadding = false }) => {
  return (
    <div className={`glass-card rounded-[28px] shadow-ios dark:shadow-none transition-all duration-300 ${className}`}>
      {title && (
        <div className="px-6 pt-5 pb-2">
          <h3 className="text-secondary dark:text-[#98989D] text-[13px] uppercase tracking-wider font-bold">
            {title}
          </h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-5 pt-2'}>
        {children}
      </div>
    </div>
  );
};