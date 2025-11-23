import React from 'react';
import { Clock, TrendingDown, TrendingUp, Zap } from 'lucide-react';

const TimeOfUseChart = ({ timeOfUse }) => {
  if (!timeOfUse) return null;

  const { all_hours, best_3_hours, period_summary, current_status, request_type } = timeOfUse;

  const getHourColor = (hour) => {
    if (!hour.is_suitable) return 'bg-red-100 border-red-300';
    if (hour.priority_score >= 0.8) return 'bg-green-100 border-green-300';
    if (hour.priority_score >= 0.5) return 'bg-yellow-100 border-yellow-300';
    return 'bg-orange-100 border-orange-300';
  };

  const getHourHeight = (loadFactor) => {
    return `${Math.max(loadFactor * 100, 20)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-lg">
          {request_type === 'load' ? 'Optimal Charging Times' : 'Best Feed-In Windows'}
        </h3>
      </div>

      {/* Current Status */}
      {current_status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Current Time: {current_status.time_label}</span>
          </div>
          <div className="text-sm text-blue-700">
            Grid Load: {(current_status.load_factor * 100).toFixed(0)}% • 
            Available Capacity: {current_status.effective_capacity.toFixed(0)} kW
            {current_status.is_suitable ? (
              <span className="text-green-600 font-medium ml-2">✓ Good time to proceed</span>
            ) : (
              <span className="text-orange-600 font-medium ml-2">⚠ Consider waiting for off-peak</span>
            )}
          </div>
        </div>
      )}

      {/* Best Time Windows */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          Top 3 Recommended Time Slots
        </h4>
        <div className="space-y-2">
          {best_3_hours.map((hour, idx) => (
            <div key={hour.hour} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{hour.time_label}</div>
                  <div className="text-xs text-gray-500">
                    Load: {(hour.load_factor * 100).toFixed(0)}% • 
                    Capacity: {hour.effective_capacity.toFixed(0)} kW
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-green-600">
                  {hour.cost_savings}% {request_type === 'load' ? 'savings' : 'premium'}
                </div>
                {hour.is_suitable && (
                  <div className="text-xs text-green-600">✓ Available</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 24-Hour Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">24-Hour Grid Capacity Overview</h4>
        <div className="flex items-end justify-between gap-1 h-32 mb-2">
          {all_hours.map((hour) => (
            <div
              key={hour.hour}
              className="flex-1 relative group cursor-pointer"
              title={`${hour.time_label}: ${hour.is_suitable ? 'Available' : 'Limited'}`}
            >
              <div
                className={`${getHourColor(hour)} border rounded-t transition-all hover:opacity-80 ${
                  hour.is_current ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{ height: getHourHeight(hour.load_factor) }}
              />
              {hour.hour % 3 === 0 && (
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                  {hour.hour}h
                </div>
              )}
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {hour.time_label}
                  <br />
                  {hour.cost_savings}% {request_type === 'load' ? 'savings' : 'premium'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 text-xs text-gray-600 mt-6">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
            <span>Fair</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Limited</span>
          </div>
        </div>
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(period_summary).map(([key, period]) => (
          <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-1">{period.label}</div>
            <div className="text-lg font-bold text-gray-900">
              {period.suitable_hours}/{period.total_hours}
            </div>
            <div className="text-xs text-gray-500 mt-1">{period.recommendation}</div>
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Smart Timing Tips
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {request_type === 'load' ? (
            <>
              <li>• Schedule charging during off-peak hours (23:00-06:00) for maximum savings</li>
              <li>• Avoid peak hours (17:00-22:00) when electricity costs are highest</li>
              <li>• Use smart charging features to automatically optimize timing</li>
            </>
          ) : (
            <>
              <li>• Feed-in during peak hours (17:00-22:00) maximizes compensation rates</li>
              <li>• Morning peak (07:00-09:00) is also favorable for solar generation</li>
              <li>• Consider battery storage to shift generation to peak demand periods</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TimeOfUseChart;
