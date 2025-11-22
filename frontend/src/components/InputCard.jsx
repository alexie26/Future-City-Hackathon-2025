import React, { useState } from 'react';
import { Search, Home, Sun, BatteryCharging } from 'lucide-react';

const InputCard = ({ onCheck }) => {
    const [address, setAddress] = useState('');
    const [type, setType] = useState('consumer');
    const [kw, setKw] = useState('');

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
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Enter address in Heilbronn..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
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
