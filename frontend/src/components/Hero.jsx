import React from 'react';
import { Zap } from 'lucide-react';

const Hero = ({ lang = 'en', onToggleLang }) => {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-green-600 shadow-sm border-b border-gray-200 p-4 flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                    <Zap className="text-green-600 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">
                        {lang === 'de' ? 'Elektrifiziere Heilbronn' : 'Electrify Heilbronn'}
                    </h1>
                    <p className="text-sm text-green-50">
                        {lang === 'de'
                            ? 'Intelligente Netzempfehlungen für nachhaltiges Leben'
                            : 'Smart Grid Recommendations for Sustainable Living'}
                    </p>
                </div>
            </div>
            {onToggleLang && (
                <button
                    type="button"
                    onClick={onToggleLang}
                    className="px-3 py-1 rounded-full bg-white/90 border border-blue-100 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                    aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'}
                >
                    {lang === 'de' ? 'EN' : 'DE'}
                </button>
            )}
        </div>
    );
};

export default Hero;
