import React, { useState, useEffect } from 'react';
import { Search, Zap, Sun, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const OverlayMenu = ({ onCheck, result, loading, error }) => {
    const [address, setAddress] = useState('');
    const [kw, setKw] = useState('');
    const [type, setType] = useState('load'); // 'load' or 'feed_in'
    const [expanded, setExpanded] = useState(false);

    // Auto-expand when result arrives
    useEffect(() => {
        if (result) {
            setExpanded(true);
        }
    }, [result]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (address && kw) {
            onCheck({ address, type, kw: parseFloat(kw) });
        }
    };

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

                {/* Address Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                    />
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

            {/* Result Expansion */}
            {result && (
                <div className={`border-t border-gray-100 bg-gray-50 transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            {result.kw_requested <= result.remaining_safe ? (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Approved</h3>
                                    <p className="text-green-600 font-medium">Grid capacity available</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                        <AlertCircle className="w-10 h-10 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Grid Expansion Needed</h3>
                                    <p className="text-red-600 font-medium">Capacity exceeded</p>
                                </>
                            )}

                            <div className="mt-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-gray-500 text-sm mr-2">Available:</span>
                                <span className="font-bold text-gray-900">{Math.round(result.remaining_safe)} kW</span>
                            </div>
                        </div>

                        {/* Technical Details Toggle */}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 pb-2"
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
