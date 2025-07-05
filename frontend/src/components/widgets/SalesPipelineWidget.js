import React from 'react';

const SalesPipelineWidget = () => {
    return (
        <div className="bg-blue-100 p-4 rounded-lg h-full">
            <h3 className="font-bold text-blue-800">Sales Pipeline</h3>
            {/* You would fetch and display real data here */}
            <p className="mt-2">Leads: 5</p>
            <p>Qualified: 3</p>
            <p>Closed: 1</p>
        </div>
    );
};

export default SalesPipelineWidget;