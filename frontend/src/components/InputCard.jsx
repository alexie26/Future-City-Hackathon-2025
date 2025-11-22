import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Search, Home, Sun, BatteryCharging } from 'lucide-react';

const InputCard = ({ onCheck }) => {
    const [address, setAddress] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);
    const [type, setType] = useState('consumer');
    const [kw, setKw] = useState('');


    // Fetch suggestions from Nominatim
    const fetchSuggestions = async (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }
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
                    limit: 10,
                },
                headers: {
                    'Accept-Language': 'de',
                    'User-Agent': 'FutureCityHackathon/1.0 (your@email.com)'
                },
            });
            // Filter to only addresses in Heilbronn
            const filtered = res.data.filter((s) => {
                const addr = s.address || {};
                return (
                    (addr.city && /heilbronn/i.test(addr.city)) ||
                    (addr.town && /heilbronn/i.test(addr.town)) ||
                    (addr.village && /heilbronn/i.test(addr.village))
                );
            });
            setSuggestions(filtered);
        } catch (err) {
            setSuggestions([]);
        }
    };

    const handleAddressChange = (e) => {
        const value = e.target.value;
        setAddress(value);
        setShowSuggestions(true);
        fetchSuggestions(value);
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
        inputRef.current.blur();
    };

    const handleBlur = () => {
        setTimeout(() => setShowSuggestions(false), 200); // Increased delay to allow click
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Enter address in Heilbronn..."
                        value={address}
                        onChange={handleAddressChange}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={handleBlur}
                        autoComplete="off"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 max-h-56 overflow-y-auto shadow-lg">
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
                                return (
                                    <li
                                        key={s.place_id}
                                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSuggestionClick(s);
                                        }}
                                    >
                                        {main}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Connection Type</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setType('consumer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${type === 'consumer'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                    >
                        <BatteryCharging className="w-6 h-6 mb-1" />
                        <span className="text-sm font-medium">Consume</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('producer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${type === 'producer'
                                ? 'border-green-600 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                    >
                        <Sun className="w-6 h-6 mb-1" />
                        <span className="text-sm font-medium">Feed-in</span>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Power Need (kW)</label>
                <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. 11, 50, 200"
                    value={kw}
                    onChange={(e) => setKw(e.target.value)}
                />
            </div>

            <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg transform active:scale-95"
            >
                Check Feasibility
            </button>
        </div>
    );
};

export default InputCard;
