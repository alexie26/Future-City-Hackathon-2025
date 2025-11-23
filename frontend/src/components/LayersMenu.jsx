import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

const LayersMenu = ({ layers, onLayerChange, lang = 'en' }) => {
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
                    <h2 className="font-bold text-gray-900">{lang === 'de' ? 'Kartenebenen' : 'Map Layers'}</h2>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Layer Controls */}
            {isExpanded && (
                <div className="p-4 space-y-3 overflow-y-auto">
                    {/* Low Voltage */}
                    <LayerToggle
                        label={lang === 'de' ? 'Niederspannung (NS)' : 'Low voltage (LV)'}
                        enabled={layers.lv.enabled}
                        onToggle={() => toggleLayer('lv')}
                    />

                    {/* Medium Voltage */}
                    <LayerToggle
                        label={lang === 'de' ? 'Mittelspannung (MS)' : 'Medium voltage (MV)'}
                        enabled={layers.mv.enabled}
                        onToggle={() => toggleLayer('mv')}
                    />

                    {/* High Voltage */}
                    <LayerToggle
                        label={lang === 'de' ? 'Hochspannung (HS)' : 'High voltage (HV)'}
                        enabled={layers.hv.enabled}
                        onToggle={() => toggleLayer('hv')}
                    />

                    {/* Assets */}
                    <LayerToggle
                        label={lang === 'de' ? 'Anlagen' : 'Assets'}
                        enabled={layers.assets.enabled}
                        onToggle={() => toggleLayer('assets')}
                    />

                    {/* Reservations */}
                    <LayerToggle
                        label={lang === 'de' ? 'Reservierungen' : 'Reservations'}
                        enabled={layers.reservations.enabled}
                        onToggle={() => toggleLayer('reservations')}
                    />

                    {/* Routing */}
                    <LayerToggle
                        label={lang === 'de' ? 'Routen' : 'Routing'}
                        enabled={layers.routing.enabled}
                        onToggle={() => toggleLayer('routing')}
                    />

                    {/* Hosting Capacity Heatmap with Settings */}
                    <div className="border border-teal-200 rounded-lg p-3 bg-teal-50">
                        <LayerToggle
                            label={lang === 'de' ? 'Hosting-Kapazitäts-Heatmap' : 'Hosting Capacity Heatmap'}
                            enabled={layers.heatmap.enabled}
                            onToggle={() => toggleLayer('heatmap')}
                            activeColor="teal"
                        />

                        {/* Heatmap Sub-settings */}
                        {layers.heatmap.enabled && (
                            <div className="mt-3 space-y-2 pl-2 border-l-2 border-teal-300">
                                {/* Voltage Level Setting */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {lang === 'de' ? 'Spannungsebene' : 'Voltage Level'}
                                    </label>
                                    <div className="flex gap-2">
                                        {['LV', 'MV', 'HV'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => updateHeatmapSetting('voltageLevel', level)}
                                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${layers.heatmap.settings.voltageLevel === level
                                                        ? 'bg-teal-600 text-white shadow-sm'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type Setting */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {lang === 'de' ? 'Typ' : 'Type'}
                                    </label>
                                    <div className="flex gap-2">
                                        {['Loads', 'Generators'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => updateHeatmapSetting('type', type)}
                                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${layers.heatmap.settings.type === type
                                                        ? 'bg-teal-600 text-white shadow-sm'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {lang === 'de' ? (type === 'Loads' ? 'Lasten' : 'Erzeuger') : type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Parcel Boundaries */}
                    <LayerToggle
                        label={lang === 'de' ? 'Flurstücke' : 'Parcel Boundaries'}
                        enabled={layers.parcels.enabled}
                        onToggle={() => toggleLayer('parcels')}
                    />
                </div>
            )}
        </div>
    );
};

export default LayersMenu;
