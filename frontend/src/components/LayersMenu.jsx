import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

const LayersMenu = ({ activeLayers = [], onLayerChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const layers = [
        { id: 'voltage-regions', label: 'Voltage Regions' },
        { id: 'stations', label: 'Grid Stations' }
    ];

    return (
        <div className="absolute z-[1000] top-4 right-4 w-80 bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-700" />
                    <h2 className="font-bold text-gray-900">Map Layers</h2>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Layer Controls */}
            {isExpanded && (
                <div className="p-4 space-y-2">
                    {layers.map(layer => {
                        const isActive = activeLayers.includes(layer.id);
                        return (
                            <button
                                key={layer.id}
                                onClick={() => onLayerChange(layer.id)}
                                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                                    isActive 
                                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                                {layer.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LayersMenu;
