import React from 'react';
import { Platform, getPlatformInfo, PLATFORM_CONFIGS } from '../services/platformService';

interface PlatformSelectorProps {
  selectedPlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  disabled?: boolean;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onPlatformChange,
  disabled = false
}) => {
  const platforms: Platform[] = ['meta', 'google'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-sm font-medium text-slate-700 mb-3">Target Platform</div>

      <div className="grid grid-cols-2 gap-3">
        {platforms.map((platform) => {
          const info = getPlatformInfo(platform);
          const config = PLATFORM_CONFIGS[platform];
          const isSelected = selectedPlatform === platform;

          return (
            <button
              key={platform}
              onClick={() => onPlatformChange(platform)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Platform icon */}
              <div className="flex items-center gap-2 mb-2">
                {platform === 'meta' ? (
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {info.name}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 mb-2">{info.description}</p>

              {/* Phone format example */}
              <div className="text-xs">
                <span className="text-slate-400">Phone format: </span>
                <code className={`px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                  {info.phoneExample}
                </code>
              </div>

              {/* Min rows indicator for Google */}
              {platform === 'google' && (
                <div className="mt-2 text-xs text-amber-600">
                  Min. {config.minRows} records required
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Requirements summary */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <div className="text-xs font-medium text-slate-600 mb-2">
          {getPlatformInfo(selectedPlatform).name} Requirements:
        </div>
        <ul className="text-xs text-slate-500 space-y-1">
          {getPlatformInfo(selectedPlatform).requirements.map((req, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Compact platform toggle for inline use
 */
export const PlatformToggle: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onPlatformChange,
  disabled = false
}) => {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => onPlatformChange('meta')}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-sm font-medium transition-colors
          ${selectedPlatform === 'meta'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        Meta
      </button>
      <button
        onClick={() => onPlatformChange('google')}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200
          ${selectedPlatform === 'google'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        Google
      </button>
    </div>
  );
};
