import React from 'react';
import { Zap } from 'lucide-react';

const Hero = () => {
    return (
        <div className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="text-white w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Electrify Heilbronn</h1>
                <p className="text-sm text-gray-500">Instant Grid Check</p>
            </div>
        </div>
    );
};

export default Hero;
