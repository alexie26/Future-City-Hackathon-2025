import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

const LayersMenu = ({ layers, onLayerChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showHeatmapSettings, setShowHeatmapSettings] = useState(true);

    const toggleLayer = (layerId) => {
        onLayerChange(layerId, !layers[layerId].enabled);
    };

    const updateHeatmapSetting = (setting, value) => {
        onLayerChange('heatmap', true, { ...layers.heatmap.settings, [setting]: value });
    };

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
                <div className="p-4 space-y-3 overflow-y-auto">
                    {/* Low Voltage */}
                    <LayerToggle
                        label="Low voltage (LV)"
                        enabled={layers.lv.enabled}
                        onToggle={() => toggleLayer('lv')}
                    />

                    {/* Medium Voltage */}
                    <LayerToggle
                        label="Medium voltage (MV)"
                        enabled={layers.mv.enabled}
                        onToggle={() => toggleLayer('mv')}
                    />

                    {/* High Voltage */}
                    <LayerToggle
                        label="High voltage (HV)"
                        enabled={layers.hv.enabled}
                        onToggle={() => toggleLayer('hv')}
                    />

                    {/* Assets */}
                    <LayerToggle
                        label="Assets"
                        enabled={layers.assets.enabled}
                        onToggle={() => toggleLayer('assets')}
                    />

                    {/* Reservations */}
                    <LayerToggle
                        label="Reservations"
                        enabled={layers.reservations.enabled}
                        onToggle={() => toggleLayer('reservations')}
                    />

                    {/* Routing */}
                    <LayerToggle
                        label="Routing"
                        enabled={layers.routing.enabled}
                        onToggle={() => toggleLayer('routing')}
                    />

                    {/* Hosting Capacity Heatmap with Settings */}
                    <div className="border border-teal-200 rounded-lg p-3 bg-teal-50">
                        <LayerToggle
                            label="Hosting Capacity Heatmap"
                            enabled={layers.heatmap.enabled}
                            onToggle={() => toggleLayer('heatmap')}
                            activeColor="teal"
                        />

                        {/* Heatmap Sub-settings */}
                        {layers.heatmap.enabled && (
                            <div className="mt-2 pl-6 space-y-2">
                                {/* Voltage Level Setting */}
                                <div>
                                    <label htmlFor="voltage-level-select" className="block text-xs font-medium text-gray-600 mb-1">
                                        Voltage Level
                                    </label>
                                    <select
                                        id="voltage-level-select"
                                        name="voltageLevel"
                                        value={layers.heatmap.settings.voltageLevel}
                                        onChange={(e) => onLayerChange('heatmap', true, {
                                            ...layers.heatmap.settings,
                                            voltageLevel: e.target.value
                                        })}
                                        className="w-full text-xs border rounded p-1"
                                    >
                                        <option value="LV">Low Voltage</option>
                                        <option value="MV">Medium Voltage</option>
                                        <option value="HV">High Voltage</option>
                                    </select>
                                </div>

                                {/* Type Setting */}
                                <div>
                                    <label htmlFor="type-select" className="block text-xs font-medium text-gray-600 mb-1">
                                        Type
                                    </label>
                                    <select
                                        id="type-select"
                                        name="type"
                                        value={layers.heatmap.settings.type}
                                        onChange={(e) => onLayerChange('heatmap', true, {
                                            ...layers.heatmap.settings,
                                            type: e.target.value
                                        })}
                                        className="w-full text-xs border rounded p-1"
                                    >
                                        <option value="Loads">Loads</option>
                                        <option value="Generation">Generation</option>
                                        <option value="Capacity">Capacity</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Parcel Boundaries */}
                    <LayerToggle
                        label="Parcel Boundaries"
                        enabled={layers.parcels.enabled}
                        onToggle={() => toggleLayer('parcels')}
                    />
                </div>
            )}
        </div>
    );
};

// Reusable Toggle Component
const LayerToggle = ({ label, enabled, onToggle, activeColor = 'gray' }) => {
    const colors = {
        gray: {
            bg: 'bg-gray-300',
            translate: 'translate-x-5',
            activeBg: 'bg-gray-400'
        },
        teal: {
            bg: 'bg-teal-500',
            translate: 'translate-x-5',
            activeBg: 'bg-teal-600'
        }
    };

    const color = enabled ? colors[activeColor === 'teal' ? 'teal' : 'gray'] : colors.gray;

    return (
        <div className="flex items-center justify-between">
            <span className={`text-sm ${enabled ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                {label}
            </span>
            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled
                        ? activeColor === 'teal' ? 'bg-teal-500' : 'bg-gray-400'
                        : 'bg-gray-200'
                    }`}
            >
                <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
};

export default LayersMenu;
