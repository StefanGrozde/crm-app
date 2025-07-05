import React from 'react';

const RecentActivitiesWidget = () => {
    return (
        <div className="bg-green-100 p-4 rounded-lg h-full">
            <h3 className="font-bold text-green-800">Recent Activities</h3>
            {/* You would fetch and display real data here */}
            <ul className="mt-2 list-disc list-inside">
                <li>Email sent to John Doe</li>
                <li>Call logged with Jane Smith</li>
            </ul>
        </div>
    );
};

export default RecentActivitiesWidget;