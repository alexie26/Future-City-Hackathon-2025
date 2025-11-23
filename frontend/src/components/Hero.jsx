import React from 'react';
import { Zap } from 'lucide-react';
import { getTranslation } from '../translations';

const Hero = ({ lang = 'en' }) => {
    const t = (key) => getTranslation(lang, key);
    
    return (
        <div className="bg-gradient-to-r from-blue-600 to-green-600 shadow-sm border-b border-gray-200 p-4 flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
                <Zap className="text-green-600 w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white">{t('hero_title')}</h1>
                <p className="text-sm text-green-50">{t('hero_subtitle')}</p>
            </div>
        </div>
    );
};

export default Hero;
