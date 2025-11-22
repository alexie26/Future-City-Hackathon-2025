import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Sun, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import axios from 'axios';

const OverlayMenu = ({ onCheck, result, loading, error }) => {
    const [address, setAddress] = useState('');
    const [kw, setKw] = useState('');
    const [type, setType] = useState('load'); // 'load' or 'feed_in'
    const [expanded, setExpanded] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const searchTimeout = useRef(null);
    const suggestionsRef = useRef(null);

    // Auto-expand when result arrives
    useEffect(() => {
        if (result) {
            setExpanded(true);
        }
    }, [result]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced address search
    useEffect(() => {
        if (address.length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Set new timeout
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                // Using Photon API - better for autocomplete
                const response = await axios.get(
                    `https://photon.komoot.io/api/`,
                    {
                        params: {
                            q: address,
                            limit: 10,
                            lang: 'de',
                            lat: 49.142,
                            lon: 9.219,
                            location_bias_scale: 0.5
                        }
                    }
                );

                // Filter only Heilbronn results
                const heilbronnResults = response.data.features.filter(feature => {
                    const props = feature.properties;
                    return props.city === 'Heilbronn' || props.county === 'Heilbronn';
                });

                setSuggestions(heilbronnResults);
                setShowSuggestions(heilbronnResults.length > 0);
            } catch (err) {
                console.error('Address search failed:', err);
                setSuggestions([]);
            } finally {
                setSearchLoading(false);
            }
        }, 150); // 150ms debounce - faster response

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [address]);

    const handleSuggestionClick = (suggestion) => {
        // Photon returns GeoJSON format with coordinates
        const props = suggestion.properties;
        const coords = suggestion.geometry.coordinates; // [lon, lat]

        const displayName = [props.name, props.street, props.city, props.country]
            .filter(Boolean)
            .join(', ');
        setAddress(displayName);
        setSelectedCoordinates({ lat: coords[1], lon: coords[0] }); // Store coordinates
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (address && kw) {
            onCheck({ address, type, kw: parseFloat(kw), coordinates: selectedCoordinates });
            setShowSuggestions(false);
        }
    };

    const handleAddressChange = (e) => {
        setAddress(e.target.value);
        setSelectedCoordinates(null); // Clear stored coordinates when manually typing
    };

    // Get traffic light color and icon
    const getStatusDisplay = () => {
        if (!result) return null;

        const statusConfig = {
            green: {
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
                textColor: 'text-green-700',
                icon: CheckCircle
            },
            yellow: {
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-200',
                iconBg: 'bg-yellow-100',
                iconColor: 'text-yellow-600',
                textColor: 'text-yellow-700',
                icon: AlertCircle
            },
            red: {
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-600',
                textColor: 'text-red-700',
                icon: AlertCircle
            }
        };

        return statusConfig[result.status] || statusConfig.yellow;
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="absolute z-[1000] 
                    top-auto bottom-0 left-0 right-0 
                    md:top-4 md:left-4 md:bottom-auto md:right-auto md:w-96
                    bg-white rounded-t-2xl md:rounded-2xl shadow-xl 
                    flex flex-col transition-all duration-300 ease-in-out
                    max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900">Grid Check</h1>
                <p className="text-sm text-gray-500">Heilbronn</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {/* Address Input with Autocomplete */}
                <div className="relative" ref={suggestionsRef}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin z-10" />
                    )}
                    <input
                        type="text"
                        placeholder="Search Address in Heilbronn..."
                        value={address}
                        onChange={handleAddressChange}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                        autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                            {suggestions.map((suggestion, index) => {
                                const props = suggestion.properties;
                                const name = props.name || props.street || '';
                                const fullAddress = [props.street, props.housenumber, props.postcode, props.city]
                                    .filter(Boolean)
                                    .join(' ');

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-start gap-2 border-b border-gray-100 last:border-0 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {fullAddress}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Mode Toggle */}
                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                        type="button"
                        onClick={() => setType('load')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${type === 'load'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        Charge / Load
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('feed_in')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${type === 'feed_in'
                            ? 'bg-white text-orange-500 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Sun className="w-4 h-4" />
                        Feed-in / Solar
                    </button>
                </div>

                {/* Power Input */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Required Capacity
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            placeholder="50"
                            value={kw}
                            onChange={(e) => setKw(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                            required
                            min="1"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                            kW
                        </span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Action Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
            ${type === 'load' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}
            ${loading ? 'opacity-80 cursor-not-allowed' : ''}
          `}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Checking...
                        </>
                    ) : (
                        'Check Feasibility'
                    )}
                </button>
            </form>

            {/* Traffic Light Result */}
            {result && statusDisplay && (
                <div className={`border-t ${statusDisplay.borderColor} ${statusDisplay.bgColor} transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-6">
                        {/* Status Icon and Message */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className={`w-20 h-20 ${statusDisplay.iconBg} rounded-full flex items-center justify-center mb-4 animate-pulse`}>
                                <statusDisplay.icon className={`w-12 h-12 ${statusDisplay.iconColor}`} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{result.message}</h3>

                            {/* Capacity Information */}
                            <div className="mt-4 space-y-2 w-full">
                                <div className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-gray-200">
                                    <span className="text-gray-600 text-sm">Your Request:</span>
                                    <span className="font-bold text-gray-900">{result.kw_requested} kW</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-gray-200">
                                    <span className="text-gray-600 text-sm">Available Capacity:</span>
                                    <span className="font-bold text-gray-900">{Math.round(result.remaining_safe)} kW</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-gray-200">
                                    <span className="text-gray-600 text-sm">Distance to Grid:</span>
                                    <span className="font-bold text-gray-900">{result.distance_km} km</span>
                                </div>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className={`${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded-lg p-4 mb-4`}>
                            <h4 className={`font-semibold ${statusDisplay.textColor} mb-2`}>📋 Next Steps</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Grid Usage</span>
                                <span>{Math.round((result.kw_requested / result.remaining_safe) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        result.status === 'green' ? 'bg-green-500' :
                                            result.status === 'yellow' ? 'bg-yellow-500' :
                                                'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (result.kw_requested / result.remaining_safe) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 pt-2"
                        >
                            Hide Details <ChevronUp className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverlayMenu;
