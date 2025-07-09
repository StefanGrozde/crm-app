import React, { useState } from 'react';
import ContactsWidget from './ContactsWidget';
import UnifiedContactsWidget from './UnifiedContactsWidget';

const ContactsWidgetComparison = () => {
    const [activeWidget, setActiveWidget] = useState('unified');

    const handleOpenContactProfile = (contactId) => {
        console.log('Open contact profile:', contactId);
        alert(`Opening contact profile for ID: ${contactId}`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    ContactsWidget Comparison
                </h1>
                <p className="text-gray-600">
                    Compare the original ContactsWidget with the new unified EntityWidget system.
                </p>
            </div>

            {/* Widget Selector */}
            <div className="mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveWidget('original')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                            activeWidget === 'original'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Original ContactsWidget
                    </button>
                    <button
                        onClick={() => setActiveWidget('unified')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                            activeWidget === 'unified'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Unified EntityWidget
                    </button>
                </div>
            </div>

            {/* Feature Comparison */}
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Feature Comparison
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Original ContactsWidget</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                ~1,450 lines of code
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Extensive use of refs for forms
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Complex state management
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Hardcoded field definitions
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Custom form handling logic
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Unified EntityWidget</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                ~35 lines wrapper + config
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Configuration-driven fields
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Centralized state management
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Declarative field definitions
                            </li>
                            <li className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Reusable form logic
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Both support these features */}
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Unified Features (Both Support)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-700">
                    <div>✅ Search with debouncing</div>
                    <div>✅ Advanced filtering</div>
                    <div>✅ List management</div>
                    <div>✅ Bulk operations</div>
                    <div>✅ CRUD operations</div>
                    <div>✅ Pagination</div>
                    <div>✅ Undo delete</div>
                    <div>✅ Custom actions</div>
                    <div>✅ Tags system</div>
                    <div>✅ Form validation</div>
                    <div>✅ Status badges</div>
                    <div>✅ Responsive design</div>
                </div>
            </div>

            {/* Active Widget Display */}
            <div className="bg-white border border-gray-200 rounded-lg" style={{ height: '700px' }}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {activeWidget === 'original' ? 'Original ContactsWidget' : 'Unified EntityWidget'}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {activeWidget === 'original' 
                            ? 'Traditional implementation with widget-specific code'
                            : 'Configuration-driven implementation using EntityWidget'
                        }
                    </p>
                </div>
                
                <div className="h-full">
                    {activeWidget === 'original' ? (
                        <ContactsWidget onOpenContactProfile={handleOpenContactProfile} />
                    ) : (
                        <UnifiedContactsWidget onOpenContactProfile={handleOpenContactProfile} />
                    )}
                </div>
            </div>

            {/* Implementation Details */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Implementation Benefits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                    <div>
                        <h4 className="font-medium mb-1">Code Reduction</h4>
                        <p>97% reduction in widget-specific code (1,450 → 35 lines)</p>
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

export default ContactsWidgetComparison;