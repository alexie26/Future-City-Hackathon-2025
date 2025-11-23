import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Sun, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, MapPin, MessageCircle } from 'lucide-react';
import axios from 'axios';
import Hero from './Hero';
import InputCard from './InputCard';
import ResultCard from './ResultCard';
import ApplicationModal from './ApplicationModal';
import ChatBot from './ChatBot';
import { getTranslation } from '../translations';

const OverlayMenu = ({ onCheck, result, lastRequest, loading, error, insights, insightsLoading, insightsError, onLoadInsights, lang = 'en' }) => {
    const t = (key) => getTranslation(lang, key);
    const [address, setAddress] = useState('');
    const [kw, setKw] = useState('');
    const [type, setType] = useState('load'); // 'load' or 'feed_in'
    const [expanded, setExpanded] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const [showBot, setShowBot] = useState(true);
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);

    const handleApply = () => {
        if (lastRequest) {
            setModalData({
                address: lastRequest.address,
                kw: lastRequest.kw,
                type: lastRequest.type
            });
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div className="absolute top-0 left-0 w-96 max-h-screen overflow-y-auto bg-white shadow-2xl z-[5000] rounded-r-2xl">
                <Hero lang={lang} />

                <div className="p-6 space-y-6">
                    <InputCard onCheck={onCheck} lang={lang} />

                    {loading && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <span className="ml-3 text-gray-600">{t('overlay_loading')}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-900 mb-1">{t('overlay_error')}</h4>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {result && !loading && !error && (
                        <ResultCard result={result} onApply={handleApply} lang={lang} />
                    )}

                    {/* ChatBot Assistant - appears after results */}
                    {result && !loading && !error && (
                        <div className="mt-6">
                            {/* Bot Toggle Header */}
                            <button
                                onClick={() => setShowBot(!showBot)}
                                className="w-full flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-3 mb-3 hover:from-blue-100 hover:to-green-100 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-gray-800">💬 {t('overlay_chat')}</span>
                                </div>
                                {showBot ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                            </button>

                            {/* ChatBot Component */}
                            {showBot && (
                                <ChatBot result={result} onApply={handleApply} lang={lang} />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={modalData}
                lang={lang}
            />
        </>
    );
};

export default OverlayMenu;
