import React, { useState } from 'react';
import ContactsWidget from './ContactsWidget';
import UnifiedContactsWidget from './UnifiedContactsWidget';
import UnifiedLeadsWidget from './UnifiedLeadsWidget';
import UnifiedCompaniesWidget from './UnifiedCompaniesWidget';

const WidgetSystemDemo = () => {
    const [activeDemo, setActiveDemo] = useState('unified-contacts');

    const demoOptions = [
        { key: 'original-contacts', label: 'Original ContactsWidget', component: ContactsWidget },
        { key: 'unified-contacts', label: 'Unified ContactsWidget', component: UnifiedContactsWidget },
        { key: 'unified-leads', label: 'Unified LeadsWidget', component: UnifiedLeadsWidget },
        { key: 'unified-companies', label: 'Unified CompaniesWidget', component: UnifiedCompaniesWidget }
    ];

    const ActiveComponent = demoOptions.find(opt => opt.key === activeDemo)?.component;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Unified Widget System Demo
                </h1>
                <p className="text-gray-600">
                    Compare the original widget implementations with the new unified system.
                </p>
            </div>

            {/* Demo Selector */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                    {demoOptions.map(option => (
                        <button
                            key={option.key}
                            onClick={() => setActiveDemo(option.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeDemo === option.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Benefits Overview */}
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-green-800 mb-2">
                    Unified Widget System Benefits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                        <h3 className="font-medium text-green-700">Code Reduction</h3>
                        <p className="text-green-600">~80% less duplicate code across widgets</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-700">Consistency</h3>
                        <p className="text-green-600">Uniform behavior and styling</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-700">Maintainability</h3>
                        <p className="text-green-600">Single place to update common features</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-700">Configuration</h3>
                        <p className="text-green-600">Entity-specific behavior via config</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-700">Scalability</h3>
                        <p className="text-green-600">Easy to add new entity types</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-700">Testing</h3>
                        <p className="text-green-600">Centralized logic easier to test</p>
                    </div>
                </div>
            </div>

            {/* Configuration Example */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">
                    Configuration-Driven Approach
                </h2>
                <p className="text-blue-600 text-sm mb-3">
                    Each widget is now defined by a simple configuration object:
                </p>
                <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`const contactsConfig = {
    title: 'Contacts',
    apiEndpoint: 'contacts',
    features: {
        listManagement: true,
        bulkSelection: true,
        filtering: true
    },
    fields: {
        display: [
            { name: 'name', label: 'Contact' },
            { name: 'email', label: 'Email' },
            { name: 'status', type: 'status' }
        ],
        form: [
            { name: 'firstName', type: 'text', required: true },
            { name: 'email', type: 'email' }
        ]
    }
}`}
                </pre>
            </div>

            {/* Widget Demo Area */}
            <div className="bg-white border border-gray-200 rounded-lg" style={{ height: '600px' }}>
                {ActiveComponent && (
                    <ActiveComponent
                        onOpenContactProfile={(id) => console.log('Open contact profile:', id)}
                        onOpenLeadProfile={(id) => console.log('Open lead profile:', id)}
                        onOpenCompanyProfile={(id) => console.log('Open company profile:', id)}
                    />
                )}
            </div>

            {/* Technical Details */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Technical Implementation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                        <h3 className="font-medium text-gray-700 mb-1">Core Files</h3>
                        <ul className="space-y-1">
                            <li>• <code>EntityWidget.js</code> - Unified widget component</li>
                            <li>• <code>entityConfigs.js</code> - Configuration definitions</li>
                            <li>• <code>UnifiedXxxWidget.js</code> - Wrapper components</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-700 mb-1">Features Unified</h3>
                        <ul className="space-y-1">
                            <li>• CRUD operations and API calls</li>
                            <li>• Search and filtering</li>
                            <li>• List management integration</li>
                            <li>• Bulk selection</li>
                            <li>• Modal forms</li>
                            <li>• Pagination</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetSystemDemo;