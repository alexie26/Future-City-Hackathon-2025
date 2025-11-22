import React from 'react';
import { Zap } from 'lucide-react';

const Hero = () => {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-green-600 shadow-sm border-b border-gray-200 p-4 flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
                <Zap className="text-green-600 w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white">Electrify Heilbronn</h1>
                <p className="text-sm text-green-50">Smart Grid Recommendations for Sustainable Living</p>
            </div>
        </div>
    );
};

export default Hero;
