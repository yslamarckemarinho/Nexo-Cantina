import React from 'react';

interface NexoLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const NexoLogo: React.FC<NexoLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textClassName = 'text-white'
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-md"
      >
        <defs>
          {/* Gradients matching the official Nexo logo */}
          <linearGradient id="nexo-cyan-blue" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="35%" stopColor="#0099FF" />
            <stop offset="70%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>

          <linearGradient id="nexo-navy-deep" x1="40" y1="160" x2="160" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#001845" />
            <stop offset="50%" stopColor="#023E8A" />
            <stop offset="100%" stopColor="#0077B6" />
          </linearGradient>

          <linearGradient id="nexo-ribbon-front" x1="50" y1="50" x2="150" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0052CC" />
            <stop offset="50%" stopColor="#0070F3" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>

          <linearGradient id="nexo-corner-accent" x1="0" y1="100" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F5D4" />
            <stop offset="100%" stopColor="#00BBF9" />
          </linearGradient>
          
          <filter id="nexo-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0099FF" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer subtle shadow/glow */}
        <g filter="url(#nexo-glow)">
          {/* Base Diamond Background Shape / Interlinked Loop 1 (Navy Blue Loop) */}
          <path
            d="M 100 12 
               L 188 100 
               C 192 104, 192 110, 188 114 
               L 114 188 
               C 110 192, 104 192, 100 188 
               L 12 100 
               C 8 96, 8 90, 12 86 
               L 86 12 
               C 90 8, 96 8, 100 12 Z"
            fill="url(#nexo-navy-deep)"
          />

          {/* Cyan/Blue Interlocking Ribbon Outer Frame */}
          <path
            d="M 100 20
               L 175 95
               C 178 98, 178 102, 175 105
               L 105 175
               C 102 178, 98 178, 95 175
               L 25 105
               C 22 102, 22 98, 25 95
               L 95 25
               C 98 22, 102 22, 105 25
               Z"
            fill="url(#nexo-cyan-blue)"
          />

          {/* Intertwined Ribbon Layer (Front Overlap) */}
          <path
            d="M 100 32
               L 165 97
               C 167 99, 167 101, 165 103
               L 103 165
               C 101 167, 99 167, 97 165
               L 62 130
               C 56 124, 56 114, 62 108
               L 108 62
               C 114 56, 124 56, 130 62
               L 142 74
               L 125 91
               L 118 84
               C 116 82, 112 82, 110 84
               L 84 110
               C 82 112, 82 116, 84 118
               L 98 132
               L 138 92
               C 140 90, 140 88, 138 86
               L 100 48
               Z"
            fill="url(#nexo-ribbon-front)"
          />

          {/* Cyan Corner Link Highlight */}
          <path
            d="M 25 95
               L 62 58
               C 66 54, 72 54, 76 58
               L 92 74
               L 75 91
               L 68 84
               C 66 82, 62 82, 60 84
               L 42 102
               C 40 104, 40 108, 42 110
               L 58 126
               L 41 143
               L 25 105
               C 22 102, 22 98, 25 95 Z"
            fill="url(#nexo-corner-accent)"
            opacity="0.95"
          />

          {/* Deep Navy Interlock Arm */}
          <path
            d="M 100 188
               L 145 143
               C 149 139, 149 133, 145 129
               L 129 113
               L 112 130
               C 110 132, 106 132, 104 130
               L 82 108
               C 80 106, 80 102, 82 100
               L 99 83
               L 82 66
               L 46 102
               C 42 106, 42 112, 46 116
               L 95 165
               C 98 168, 102 168, 105 165
               Z"
            fill="url(#nexo-navy-deep)"
          />

          {/* Center Cutout Window (Diamond) */}
          <path
            d="M 100 70
               L 130 100
               L 100 130
               L 70 100
               Z"
            fill="#020617"
            className="fill-slate-950"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span className={`font-black tracking-tight text-lg ${textClassName}`}>
              NEXO
            </span>
            <span className="font-extrabold text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 uppercase tracking-wider">
              Cantinas
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Multi-Cantinas & PDV
          </span>
        </div>
      )}
    </div>
  );
};
