import React from 'react';
import ContactsWidgetComparison from '../components/ContactsWidgetComparison';

const TestContactsWidget = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto py-8">
                <ContactsWidgetComparison />
            </div>
        </div>
    );
};

export default TestContactsWidget;