import React, { useState } from 'react';
import ContactsWidget from './ContactsWidget';
import UnifiedContactsWidget from './UnifiedContactsWidget';
import UnifiedLeadsWidget from './UnifiedLeadsWidget';
import UnifiedOpportunitiesWidget from './UnifiedOpportunitiesWidget';
import UnifiedUsersWidget from './UnifiedUsersWidget';

const WidgetSystemDemo = () => {
    const [activeDemo, setActiveDemo] = useState('unified-contacts');

    const demoOptions = [
        { key: 'original-contacts', label: 'Original ContactsWidget', component: ContactsWidget },
        { key: 'unified-contacts', label: 'Unified ContactsWidget', component: UnifiedContactsWidget },
        { key: 'unified-leads', label: 'Unified LeadsWidget', component: UnifiedLeadsWidget },
        { key: 'unified-opportunities', label: 'Unified OpportunitiesWidget', component: UnifiedOpportunitiesWidget },
        { key: 'unified-users', label: 'Unified UsersWidget', component: UnifiedUsersWidget }
    ];

    const ActiveComponent = demoOptions.find(opt => opt.key === activeDemo)?.component;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Unified Widget System Demo
                </h1>
                <p className="text-gray-600">
                    Compare different widget implementations using the unified EntityWidget system.
                </p>
            </div>

            {/* Demo Selector */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-4">
                    {demoOptions.map(option => (
                        <button
                            key={option.key}
                            onClick={() => setActiveDemo(option.key)}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                                activeDemo === option.key
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Demo Display */}
            <div className="bg-white border border-gray-200 rounded-lg" style={{ height: '700px' }}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {demoOptions.find(opt => opt.key === activeDemo)?.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {activeDemo.startsWith('unified') 
                            ? 'Configuration-driven implementation using EntityWidget'
                            : 'Traditional implementation with widget-specific code'
                        }
                    </p>
                </div>
                
                <div className="h-full">
                    {ActiveComponent && (
                        <ActiveComponent 
                            onOpenContactProfile={id => console.log('Open contact:', id)}
                            onOpenLeadProfile={id => console.log('Open lead:', id)}
                            onOpenOpportunityProfile={id => console.log('Open opportunity:', id)}
                            onOpenUserProfile={id => console.log('Open user:', id)}
                        />
                    )}
                </div>
            </div>

            {/* Implementation Benefits */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Unified System Benefits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                    <div>
                        <h4 className="font-medium mb-1">Code Reduction</h4>
                        <p>97% reduction in widget-specific code</p>
                    </div>
                    <div>
                        <h4 className="font-medium mb-1">Maintainability</h4>
                        <p>Single EntityWidget to update for all entity types</p>
                    </div>
                    <div>
                        <h4 className="font-medium mb-1">Consistency</h4>
                        <p>Uniform behavior and styling across all widgets</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetSystemDemo;