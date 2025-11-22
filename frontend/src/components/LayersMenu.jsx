import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

const LayersMenu = ({ activeLayer, onLayerChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const layers = [
        { id: 'lv', label: 'Low Voltage (LV)' },
        { id: 'mv', label: 'Medium Voltage (MV)' },
        { id: 'hv', label: 'High Voltage (HV)' }
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
                    <h2 className="font-bold text-gray-900">Voltage Layers</h2>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Layer Controls */}
            {isExpanded && (
                <div className="p-4 space-y-3">
                    {layers.map(layer => (
                        <div key={layer.id} className="flex items-center justify-between">
                            <span className={`text-sm ${activeLayer === layer.id ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {layer.label}
                            </span>
                            <button
                                onClick={() => onLayerChange(activeLayer === layer.id ? null : layer.id)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${activeLayer === layer.id ? 'bg-teal-500' : 'bg-gray-200'
                                    }`}
                            >
                                <div
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${activeLayer === layer.id ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LayersMenu;
