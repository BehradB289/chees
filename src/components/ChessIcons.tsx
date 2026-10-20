import React from 'react';
import { PieceSymbol, Color } from 'chess.js';

export const PieceSvgIcon: React.FC<{
  type: PieceSymbol;
  color: Color;
  className?: string;
}> = ({ type, color, className = 'w-5 h-5' }) => {
  const fill = color === 'w' ? '#f8fafc' : '#334155';
  const stroke = color === 'w' ? '#d4a853' : '#f59e0b';

  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm-3 9c-1 2.5-2.5 4.5-2.5 6h11c0-1.5-1.5-3.5-2.5-6H9zm-3.5 7.5h13v1.5h-13v-1.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'r':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M6 4h2.5v2.5h2V4h3v2.5h2V4H18v4.5l-1.5 1.5v7l2 2v1.5h-13V19l2-2v-7L6 8.5V4z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'n':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M16 4l-1.5 2C11 6 8 8.5 7 12l2.5 1 2-1.5c.5 1.5-1 3.5-3.5 5.5v2h10c.5-4.5 0-11-2-15z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'b':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 3.5c-3 2-4.5 5.5-3.5 9.5l-2 2.5v2h11v-2l-2-2.5C16.5 11.5 15 8 12 6zm-1.5 3.5l3 3"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'q':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M4 7l3.5 6L12 6l4.5 7L20 7l-2 10H6L4 7zm1.5 11.5h13v2h-13v-2z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'k':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2v4m-2-2h4m-6 6c0-2.5 2-4 4-4s4 1.5 4 4c0 2-1.5 4.5-2 7H10c-.5-2.5-2-5-2-7zm-2.5 8.5h13v2h-13v-2z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

export const RoyalTitleCrestSvg: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <polygon
      points="32,4 56,16 50,46 32,60 14,46 8,16"
      fill="#111520"
      stroke="#d4a853"
      strokeWidth="2"
    />
    <polygon
      points="32,9 51,19 46,43 32,54 18,43 13,19"
      fill="none"
      stroke="#f59e0b"
      strokeOpacity="0.4"
      strokeWidth="1"
    />
    <path
      d="M32 14v8m-4-4h8M20 34l4-10 8 6 8-6 4 10H20zm-2 4h28v4H18v-4z"
      fill="#f59e0b"
      stroke="#fde68a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
