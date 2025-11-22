import React from 'react';
import { Sun, Battery, Car, Thermometer, Leaf, Users } from 'lucide-react';

const iconMap = {
    solar: Sun,
    battery: Battery,
    ev: Car,
    heatpump: Thermometer,
    behavior: Leaf,
    community: Users
};

const priorityColors = {
    high: 'border-green-500 bg-green-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-blue-500 bg-blue-50'
};

const RecommendationCard = ({ recommendation }) => {
    const Icon = iconMap[recommendation.type] || Leaf;
    const colorClass = priorityColors[recommendation.priority] || priorityColors.low;

    return (
        <div className={`border-l-4 ${colorClass} p-4 rounded-r-lg mb-3 transition-all hover:shadow-md`}>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                        {recommendation.title}
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                        {recommendation.description}
                    </p>
                    {recommendation.benefits && recommendation.benefits.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Benefits:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                {recommendation.benefits.map((benefit, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <span className="mr-1">•</span>
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
