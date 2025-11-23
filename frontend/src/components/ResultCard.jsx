import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Leaf, Clock, ArrowRightCircle, Zap } from 'lucide-react';
import RecommendationCard from './RecommendationCard';

const ResultCard = ({ result, onApply }) => {
    const statusConfig = {
        green: {
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        yellow: {
            icon: AlertCircle,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200'
        },
        red: {
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        }
    };

    const config = statusConfig[result.status] || statusConfig.yellow;
    const StatusIcon = config.icon;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            {/* Status Header */}
            <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-4 flex items-center gap-3`}>
                <StatusIcon className={`${config.color} w-8 h-8 flex-shrink-0`} />
                <div className="flex-1">
                    <h3 className={`${config.color} font-bold text-lg`}>
                        {result.message}
                    </h3>
                </div>
            </div>

            {/* Grid Details (Timeline, Next Steps, Voltage) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Timeline */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Est. Timeline</span>
                    </div>
                    <p className="font-medium text-gray-900">{result.timeline || "Unknown"}</p>
                </div>

                {/* Voltage Level */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Voltage Level</span>
                    </div>
                    <p className="font-medium text-gray-900">{result.grid_level || "Niederspannung"}</p>
                </div>

                {/* Next Steps */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowRightCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Next Steps</span>
                    </div>
                    <p className="font-medium text-gray-900">{result.next_steps || "Contact support"}</p>
                </div>
            </div>

            {/* Apply Button - Always Visible */}
            <button
                onClick={onApply}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
            >
                {result.status === 'not_feasible' ? 'Contact Support' : 'Apply for Connection'}
                <ArrowRightCircle className="w-5 h-5" />
            </button>

            {/* Eco Score */}
            {result.eco_score !== undefined && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Leaf className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-900">Eco-Friendliness Score</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                            {result.eco_score}/100
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${result.eco_score}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                    {result.recommendation}
                </p>
            </div>

            {/* Green Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-gray-900">
                            Personalized Green Recommendations
                        </h4>
                    </div>
                    {result.recommendations.map((rec, idx) => (
                        <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultCard;
