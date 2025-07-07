import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const LeadConversionWidget = () => {
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    const [metrics, setMetrics] = useState({
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        averageConversionTime: 0,
        leadsByStage: {},
        conversionTrend: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30'); // days

    // Load conversion metrics
    const loadMetrics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/leads/conversion-metrics?days=${timeRange}`, {
                withCredentials: true
            });
            setMetrics(response.data);
        } catch (error) {
            console.error('Error loading conversion metrics:', error);
            setError('Failed to load conversion metrics');
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    // Handle time range change
    const handleTimeRangeChange = useCallback((e) => {
        setTimeRange(e.target.value);
    }, []);

    // Calculate conversion rate percentage
    const conversionRatePercentage = useMemo(() => {
        if (metrics.totalLeads === 0) return 0;
        return ((metrics.convertedLeads / metrics.totalLeads) * 100).toFixed(1);
    }, [metrics.convertedLeads, metrics.totalLeads]);

    // Get stage color
    const getStageColor = useCallback((stage) => {
        const colors = {
            new: 'bg-blue-500',
            contacted: 'bg-yellow-500',
            qualified: 'bg-green-500',
            proposal: 'bg-purple-500',
            negotiation: 'bg-orange-500',
            closed_won: 'bg-green-600',
            closed_lost: 'bg-red-500'
        };
        return colors[stage] || 'bg-gray-500';
    }, []);

    // Format average conversion time
    const formatConversionTime = useCallback((days) => {
        if (days < 1) return '< 1 day';
        if (days === 1) return '1 day';
        return `${Math.round(days)} days`;
    }, []);

    if (error) {
        return (
            <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                <div className="font-medium">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Lead Conversion Analytics</h2>
                <select
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{metrics.totalLeads}</div>
                            <div className="text-sm text-blue-800">Total Leads</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{metrics.convertedLeads}</div>
                            <div className="text-sm text-green-800">Converted Leads</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{conversionRatePercentage}%</div>
                            <div className="text-sm text-purple-800">Conversion Rate</div>
                        </div>
                    </div>

                    {/* Conversion Time */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900 mb-2">Average Conversion Time</div>
                        <div className="text-3xl font-bold text-gray-700">
                            {formatConversionTime(metrics.averageConversionTime)}
                        </div>
                    </div>

                    {/* Leads by Stage */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Stage</h3>
                        <div className="space-y-3">
                            {Object.entries(metrics.leadsByStage || {}).map(([stage, count]) => (
                                <div key={stage} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full ${getStageColor(stage)} mr-3`}></div>
                                        <span className="text-sm font-medium text-gray-700 capitalize">
                                            {stage.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Conversion Trend */}
                    {metrics.conversionTrend && metrics.conversionTrend.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Trend</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-end justify-between h-32">
                                    {metrics.conversionTrend.map((data, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div 
                                                className="bg-blue-500 rounded-t w-8 mb-2"
                                                style={{ 
                                                    height: `${(data.conversions / Math.max(...metrics.conversionTrend.map(d => d.conversions))) * 80}px` 
                                                }}
                                            ></div>
                                            <div className="text-xs text-gray-600">{data.date}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center text-sm text-gray-600 mt-2">
                                    Daily conversions over the selected period
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Insights */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Insights</h3>
                        <div className="space-y-2 text-sm text-yellow-700">
                            {conversionRatePercentage > 20 ? (
                                <div>✅ Excellent conversion rate! Keep up the great work.</div>
                            ) : conversionRatePercentage > 10 ? (
                                <div>⚠️ Good conversion rate, but there's room for improvement.</div>
                            ) : (
                                <div>❌ Low conversion rate. Consider reviewing your lead qualification process.</div>
                            )}
                            
                            {metrics.averageConversionTime > 30 ? (
                                <div>⏱️ Long conversion cycle. Consider optimizing your sales process.</div>
                            ) : (
                                <div>⚡ Fast conversion cycle. Your sales process is efficient!</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(LeadConversionWidget); 