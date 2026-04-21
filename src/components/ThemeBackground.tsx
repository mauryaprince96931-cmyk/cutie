import React from 'react';

export const ThemeBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none aria-hidden:true">
      {/* Container that provides the base color via opacity */}
      <div className="absolute inset-0 text-primary/15 dark:text-primary/5 transition-colors duration-500">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Large Blobs (Diagonal Balance) */}
          <circle 
            cx="15%" 
            cy="20%" 
            r="180" 
            fill="currentColor" 
            className="opacity-[0.06] animate-pulse" 
            style={{ animationDuration: '8s' }}
          />
          <circle 
            cx="85%" 
            cy="80%" 
            r="220" 
            fill="currentColor" 
            className="opacity-[0.08] animate-pulse" 
            style={{ animationDuration: '12s' }}
          />
          <circle 
            cx="50%" 
            cy="50%" 
            r="120" 
            fill="currentColor" 
            className="opacity-[0.03]" 
          />

          {/* Rings */}
          <circle 
            cx="25%" 
            cy="75%" 
            r="100" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            className="opacity-[0.1]" 
          />
          <circle 
            cx="75%" 
            cy="25%" 
            r="150" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1" 
            className="opacity-[0.07]" 
          />

          {/* Dotted Pattern */}
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect 
            width="100%" 
            height="100%" 
            fill="url(#dotPattern)" 
            className="opacity-[0.04]" 
          />
        </svg>
      </div>

      {/* CSS Fallback layer (Radial Gradients using CSS variables) */}
      <div 
        className="absolute inset-0 opacity-10 dark:opacity-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 10% 20%, var(--primary) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, var(--primary) 0%, transparent 40%)
          `,
          filter: 'blur(100px)'
        }}
      />
    </div>
  );
};
