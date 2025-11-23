import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, Home, Sun, BatteryCharging } from 'lucide-react';
import { getTranslation } from '../translations';

const InputCard = ({ onCheck, lang = 'en' }) => {
    const t = (key) => getTranslation(lang, key);
    const [address, setAddress] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);
    const [type, setType] = useState('consumer');
    const [kw, setKw] = useState('');
    const debounceTimer = useRef(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);


    // Fetch suggestions from Nominatim
    const fetchSuggestions = async (query) => {
        // Only fetch if query has at least 3 characters
        if (!query || query.length < 3) {
            setSuggestions([]);
            setSearchError(null);
            return;
        }
        
        setSearchLoading(true);
        setSearchError(null);
        
        let searchQuery = query;
        // Only append if not already present
        if (!/heilbronn/i.test(query)) {
            searchQuery += ', Heilbronn, Germany';
        }
        
        try {
            const res = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: searchQuery,
                    format: 'json',
                    addressdetails: 1,
                    limit: 20, // Increased limit
                    bounded: 1, // Stay within bounds
                    viewbox: '9.0,49.0,9.5,49.3', // Heilbronn bounding box
                },
                headers: {
                    'Accept-Language': 'de',
                    'User-Agent': 'FutureCityHackathon/1.0'
                },
                timeout: 5000
            });
            
            console.log(`Found ${res.data.length} results for: ${searchQuery}`);
            
            // Filter to only addresses in Heilbronn (more lenient)
            const filtered = res.data.filter((s) => {
                const addr = s.address || {};
                const displayName = s.display_name || '';
                
                // Check if Heilbronn is mentioned anywhere
                const hasHeilbronn = (
                    (addr.city && /heilbronn/i.test(addr.city)) ||
                    (addr.town && /heilbronn/i.test(addr.town)) ||
                    (addr.village && /heilbronn/i.test(addr.village)) ||
                    (addr.county && /heilbronn/i.test(addr.county)) ||
                    /heilbronn/i.test(displayName)
                );
                
                // Check coordinates are in Heilbronn area
                const lat = parseFloat(s.lat);
                const lon = parseFloat(s.lon);
                const inBounds = !isNaN(lat) && !isNaN(lon) && 
                                lat >= 49.0 && lat <= 49.3 && 
                                lon >= 9.0 && lon <= 9.5;
                
                return hasHeilbronn && inBounds;
            });
            
            console.log(`Filtered to ${filtered.length} Heilbronn results`);
            
            if (filtered.length === 0 && res.data.length > 0) {
                setSearchError('No results found in Heilbronn area');
            }
            
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0); // Only show if we have results
            
        } catch (err) {
            console.error('Address search error:', err);
            setSearchError('Unable to search addresses. Please try again.');
            setSuggestions([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddressChange = (e) => {
        const value = e.target.value;
        setAddress(value);
        setSearchError(null);
        
        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        // Show suggestions dropdown when we have 3+ characters
        if (value.length >= 3) {
            setShowSuggestions(true); // Show immediately (even if loading)
            // Debounce the API call by 300ms
            debounceTimer.current = setTimeout(() => {
                fetchSuggestions(value);
            }, 300);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        // Prefer street + house number + city for input value
        const addr = suggestion.address || {};
        let main = '';
        if (addr.road) main += addr.road;
        if (addr.house_number) main += ' ' + addr.house_number;
        if (main && addr.city) main += ', ' + addr.city;
        else if (main && addr.town) main += ', ' + addr.town;
        else if (main && addr.village) main += ', ' + addr.village;
        if (!main) main = suggestion.display_name;
        
        setAddress(main);
        setShowSuggestions(false);
        setSuggestions([]);
        setSearchError(null);
    };

    const handleBlur = () => {
        // Longer delay to ensure clicking a suggestion works
        setTimeout(() => {
            setShowSuggestions(false);
        }, 250);
    };

    const handleFocus = () => {
        // Show suggestions if we already have some from previous search
        if (address.length >= 3 && suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (address && kw) {
            onCheck({ address, type, kw: parseFloat(kw) });
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('input_address')}</label>
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder={t('input_address_placeholder')}
                        value={address}
                        onChange={handleAddressChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        autoComplete="off"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    
                    {/* Loading indicator */}
                    {searchLoading && (
                        <div className="absolute right-3 top-2.5">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                    
                    {/* Suggestions dropdown */}
                    {showSuggestions && (
                        <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {searchLoading && suggestions.length === 0 && (
                                <li className="px-4 py-3 text-sm text-gray-500 text-center">
                                    {t('input_searching')}
                                </li>
                            )}
                            
                            {!searchLoading && suggestions.length === 0 && address.length >= 3 && (
                                <li className="px-4 py-3 text-sm text-gray-500 text-center">
                                    {searchError || t('input_no_results')}
                                </li>
                            )}
                            
                            {suggestions.map((s) => {
                                const addr = s.address || {};
                                // Compose a readable address: street + house_number + city
                                let main = '';
                                if (addr.road) main += addr.road;
                                if (addr.house_number) main += ' ' + addr.house_number;
                                if (main && addr.city) main += ', ' + addr.city;
                                else if (main && addr.town) main += ', ' + addr.town;
                                else if (main && addr.village) main += ', ' + addr.village;
                                // Fallback to display_name if not enough info
                                if (!main) main = s.display_name;
                                
                                // Show additional context
                                const context = addr.suburb || addr.neighbourhood || '';
                                
                                return (
                                    <li
                                        key={s.place_id}
                                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm transition-colors border-b last:border-b-0"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSuggestionClick(s);
                                        }}
                                    >
                                        <div className="font-medium">{main}</div>
                                        {context && (
                                            <div className="text-xs text-gray-500">{context}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    
                    {/* Error message */}
                    {searchError && !showSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 text-xs text-red-600">
                            {searchError}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('input_connection_type')}</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setType('consumer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${type === 'consumer'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-md'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-gray-600 hover:scale-105'
                            }`}
                    >
                        <BatteryCharging className="w-6 h-6 mb-1" />
                        <span className="text-sm font-medium">{t('input_consumer')}</span>
                        <span className="text-xs text-gray-500">{t('input_consumer_desc')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('producer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${type === 'producer'
                                ? 'border-green-600 bg-green-50 text-green-700 scale-105 shadow-md'
                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30 text-gray-600 hover:scale-105'
                            }`}
                    >
                        <Sun className="w-6 h-6 mb-1" />
                        <span className="text-sm font-medium">{t('input_producer')}</span>
                        <span className="text-xs text-gray-500">{t('input_producer_desc')}</span>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('input_power')}
                    <span className="text-xs text-gray-500 ml-2">{t('input_power_hint')}</span>
                </label>
                <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={t('input_power_placeholder')}
                    value={kw}
                    onChange={(e) => setKw(e.target.value)}
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!address || !kw}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95"
            >
                {t('input_button')}
            </button>
        </div>
    );
};

export default InputCard;
