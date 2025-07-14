import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MyTicketQueueWidget from './MyTicketQueueWidget';
import UnassignedTicketQueueWidget from './UnassignedTicketQueueWidget';
import TeamTicketQueueWidget from './TeamTicketQueueWidget';
import AllTicketQueueWidget from './AllTicketQueueWidget';

const TicketQueueDashboard = ({ onOpenTicketProfile }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('my');
    const [queueStats, setQueueStats] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch queue statistics
    const fetchQueueStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/queue/stats`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setQueueStats(data);
            }
        } catch (err) {
            console.error('Error fetching queue stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueueStats();
    }, []);

    const tabs = [
        {
            id: 'my',
            label: 'My Queue',
            count: queueStats.queues?.my || 0,
            component: MyTicketQueueWidget
        },
        {
            id: 'unassigned',
            label: 'Unassigned',
            count: queueStats.queues?.unassigned || 0,
            component: UnassignedTicketQueueWidget
        },
        {
            id: 'team',
            label: 'Team',
            count: queueStats.queues?.team || 0,
            component: TeamTicketQueueWidget
        },
        {
            id: 'all',
            label: 'All Tickets',
            count: queueStats.queues?.total || 0,
            component: AllTicketQueueWidget
        }
    ];

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || MyTicketQueueWidget;

    return (
        <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Ticket Queue Dashboard
                    </h2>
                    <button
                        onClick={fetchQueueStats}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Refresh Stats
                    </button>
                </div>

                {/* Quick Stats */}
                {!loading && queueStats.queues && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-blue-600 text-sm font-medium">My Queue</div>
                            <div className="text-blue-900 text-2xl font-bold">{queueStats.queues.my}</div>
                            <div className="text-blue-600 text-sm">tickets assigned to me</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="text-yellow-600 text-sm font-medium">Unassigned</div>
                            <div className="text-yellow-900 text-2xl font-bold">{queueStats.queues.unassigned}</div>
                            <div className="text-yellow-600 text-sm">tickets need assignment</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-green-600 text-sm font-medium">Team Total</div>
                            <div className="text-green-900 text-2xl font-bold">{queueStats.queues.team}</div>
                            <div className="text-green-600 text-sm">tickets in team queue</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-gray-600 text-sm font-medium">All Tickets</div>
                            <div className="text-gray-900 text-2xl font-bold">{queueStats.queues.total}</div>
                            <div className="text-gray-600 text-sm">total active tickets</div>
                        </div>
                    </div>
                )}

                {/* My Queue Priority Breakdown */}
                {!loading && queueStats.myQueue?.priority && (
                    <div className="mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">My Queue Priority Breakdown</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-red-50 p-3 rounded">
                                <div className="text-red-600 text-sm font-medium">Urgent</div>
                                <div className="text-red-900 text-xl font-bold">{queueStats.myQueue.priority.urgent || 0}</div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded">
                                <div className="text-orange-600 text-sm font-medium">High</div>
                                <div className="text-orange-900 text-xl font-bold">{queueStats.myQueue.priority.high || 0}</div>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded">
                                <div className="text-yellow-600 text-sm font-medium">Medium</div>
                                <div className="text-yellow-900 text-xl font-bold">{queueStats.myQueue.priority.medium || 0}</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded">
                                <div className="text-green-600 text-sm font-medium">Low</div>
                                <div className="text-green-900 text-xl font-bold">{queueStats.myQueue.priority.low || 0}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Queue Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                        activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Active Queue Component */}
                <div className="p-0">
                    <ActiveComponent onOpenTicketProfile={onOpenTicketProfile} />
                </div>
            </div>
        </div>
    );
};

export default TicketQueueDashboard;