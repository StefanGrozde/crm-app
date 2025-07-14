// Entity configurations for the unified widget system

const entityConfigs = {
    contacts: {
        title: 'Contacts',
        apiEndpoint: 'contacts',
        dataKey: 'contacts', // Key in response for data array
        features: {
            listManagement: true,
            bulkSelection: true,
            filtering: true,
            filterOptions: true,
            undoDelete: true,
            tags: true,
            customActions: true
        },
        defaultFilters: {
            status: '',
            assignedTo: '',
            source: '',
            department: '',
            city: '',
            state: '',
            country: ''
        },
        customActions: [
            {
                key: 'startLead',
                label: 'Lead',
                className: 'px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors',
                title: 'Start Lead'
            },
            {
                key: 'startOpportunity', 
                label: 'Opp',
                className: 'px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors',
                title: 'Start Opportunity'
            },
            {
                key: 'startSale',
                label: 'Sale', 
                className: 'px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors',
                title: 'Start Sale'
            }
        ],
        fields: {
            display: [
                { 
                    name: 'name', 
                    label: 'Contact',
                    render: (value, item, onOpenProfile) => (
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-blue-600">
                                    {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <div 
                                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                    onClick={() => onOpenProfile && onOpenProfile(item.id)}
                                >
                                    {item.firstName} {item.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {item.companyName || 'No Company'}
                                </div>
                            </div>
                        </div>
                    )
                },
                { name: 'email', label: 'Email' },
                { name: 'phone', label: 'Phone' },
                { name: 'jobTitle', label: 'Job Title' },
                { name: 'department', label: 'Department' },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        active: 'bg-green-100 text-green-800',
                        inactive: 'bg-red-100 text-red-800',
                        prospect: 'bg-yellow-100 text-yellow-800'
                    }
                }
            ],
            form: [
                { name: 'firstName', type: 'text', label: 'First Name', required: true },
                { name: 'lastName', type: 'text', label: 'Last Name', required: true },
                { name: 'email', type: 'email', label: 'Email' },
                { name: 'phone', type: 'tel', label: 'Phone' },
                { name: 'mobile', type: 'tel', label: 'Mobile' },
                { name: 'jobTitle', type: 'text', label: 'Job Title' },
                { name: 'department', type: 'text', label: 'Department' },
                { name: 'address', type: 'textarea', label: 'Address', rows: 2 },
                { name: 'city', type: 'text', label: 'City' },
                { name: 'state', type: 'text', label: 'State' },
                { name: 'zipCode', type: 'text', label: 'ZIP Code' },
                { name: 'country', type: 'text', label: 'Country' },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'active',
                    options: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'prospect', label: 'Prospect' }
                    ]
                },
                { name: 'source', type: 'text', label: 'Source', placeholder: 'e.g., Website, Referral, Trade Show' },
                { 
                    name: 'assignedTo', 
                    type: 'select', 
                    label: 'Assigned To', 
                    source: 'users',
                    displayField: 'username'
                },
                { name: 'tags', type: 'tags', label: 'Tags' },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 }
            ]
        },
        filters: {
            status: { 
                type: 'select', 
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'prospect', label: 'Prospect' }
                ]
            },
            assignedTo: { type: 'select', source: 'users', displayField: 'username' },
            source: { type: 'select', displayField: 'value' },
            department: { type: 'select', displayField: 'value' },
            city: { type: 'select', displayField: 'value' },
            state: { type: 'select', displayField: 'value' },
            country: { type: 'select', displayField: 'value' }
        }
    },

    leads: {
        title: 'Leads',
        apiEndpoint: 'leads',
        dataKey: 'leads',
        features: {
            listManagement: true,
            bulkSelection: true,
            filtering: true,
            filterOptions: false  // Disabled until backend endpoint exists
        },
        defaultFilters: {
            status: '',
            priority: '',
            assignedTo: '',
            source: '',
            company: ''
        },
        fields: {
            display: [
                { 
                    name: 'title', 
                    label: 'Title',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="text-sm text-gray-500">{item.source}</div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        new: 'bg-blue-100 text-blue-800',
                        contacted: 'bg-yellow-100 text-yellow-800',
                        qualified: 'bg-green-100 text-green-800',
                        lost: 'bg-red-100 text-red-800'
                    }
                },
                { 
                    name: 'priority', 
                    label: 'Priority', 
                    type: 'status',
                    statusColors: {
                        high: 'bg-red-100 text-red-800',
                        medium: 'bg-yellow-100 text-yellow-800',
                        low: 'bg-green-100 text-green-800'
                    }
                },
                { 
                    name: 'estimatedValue', 
                    label: 'Value', 
                    type: 'currency',
                    currencyField: 'currency'
                },
                { 
                    name: 'assignedUser', 
                    label: 'Assigned To',
                    render: (value, item) => value?.username || 'Unassigned'
                }
            ],
            form: [
                { name: 'title', type: 'text', label: 'Title', required: true },
                { name: 'description', type: 'textarea', label: 'Description', rows: 3 },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'new',
                    options: [
                        { value: 'new', label: 'New' },
                        { value: 'contacted', label: 'Contacted' },
                        { value: 'qualified', label: 'Qualified' },
                        { value: 'lost', label: 'Lost' }
                    ]
                },
                { 
                    name: 'priority', 
                    type: 'select', 
                    label: 'Priority', 
                    defaultValue: 'medium',
                    options: [
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' }
                    ]
                },
                { name: 'estimatedValue', type: 'number', label: 'Estimated Value', step: '0.01', min: '0' },
                { 
                    name: 'currency', 
                    type: 'select', 
                    label: 'Currency', 
                    defaultValue: 'USD',
                    options: [
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' }
                    ]
                },
                { name: 'source', type: 'text', label: 'Source' },
                { name: 'expectedCloseDate', type: 'date', label: 'Expected Close Date' },
                { 
                    name: 'assignedTo', 
                    type: 'select', 
                    label: 'Assigned To', 
                    source: 'users',
                    displayField: 'username'
                },
                { 
                    name: 'companyId', 
                    type: 'select', 
                    label: 'Company', 
                    source: 'companies',
                    displayField: 'name'
                },
                { 
                    name: 'contactId', 
                    type: 'select', 
                    label: 'Contact', 
                    source: 'contacts',
                    displayField: 'firstName',
                    render: (item) => `${item.firstName} ${item.lastName}`
                },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 }
            ]
        }
    },

    opportunities: {
        title: 'Opportunities',
        apiEndpoint: 'opportunities',
        dataKey: 'opportunities',
        features: {
            listManagement: true,
            bulkSelection: true,
            filtering: true
        },
        defaultFilters: {
            stage: '',
            assignedTo: '',
            company: ''
        },
        fields: {
            display: [
                { 
                    name: 'name', 
                    label: 'Name',
                    render: (value, item, onOpenProfile) => (
                        <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => onOpenProfile && onOpenProfile(item.id)}
                        >
                            {value}
                        </div>
                    )
                },
                { 
                    name: 'stage', 
                    label: 'Stage', 
                    type: 'status',
                    statusColors: {
                        prospecting: 'bg-blue-100 text-blue-800',
                        qualification: 'bg-yellow-100 text-yellow-800',
                        proposal: 'bg-orange-100 text-orange-800',
                        negotiation: 'bg-purple-100 text-purple-800',
                        'closed-won': 'bg-green-100 text-green-800',
                        'closed-lost': 'bg-red-100 text-red-800'
                    }
                },
                { 
                    name: 'amount', 
                    label: 'Amount', 
                    type: 'currency',
                    currencyField: 'currency'
                },
                { 
                    name: 'probability', 
                    label: 'Probability',
                    render: (value) => value ? `${value}%` : '-'
                },
                { name: 'expectedCloseDate', label: 'Close Date', type: 'date' }
            ],
            form: [
                { name: 'name', type: 'text', label: 'Name', required: true },
                { name: 'description', type: 'textarea', label: 'Description', rows: 3 },
                { 
                    name: 'stage', 
                    type: 'select', 
                    label: 'Stage', 
                    defaultValue: 'prospecting',
                    options: [
                        { value: 'prospecting', label: 'Prospecting' },
                        { value: 'qualification', label: 'Qualification' },
                        { value: 'proposal', label: 'Proposal' },
                        { value: 'negotiation', label: 'Negotiation' },
                        { value: 'closed-won', label: 'Closed Won' },
                        { value: 'closed-lost', label: 'Closed Lost' }
                    ]
                },
                { name: 'amount', type: 'number', label: 'Amount', step: '0.01', min: '0' },
                { 
                    name: 'currency', 
                    type: 'select', 
                    label: 'Currency', 
                    defaultValue: 'USD',
                    options: [
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' }
                    ]
                },
                { name: 'probability', type: 'number', label: 'Probability (%)', min: '0', max: '100', step: '1' },
                { name: 'expectedCloseDate', type: 'date', label: 'Expected Close Date' },
                { 
                    name: 'assignedTo', 
                    type: 'select', 
                    label: 'Assigned To', 
                    source: 'users',
                    displayField: 'username'
                },
                { 
                    name: 'companyId', 
                    type: 'select', 
                    label: 'Company', 
                    source: 'companies',
                    displayField: 'name'
                },
                { 
                    name: 'contactId', 
                    type: 'select', 
                    label: 'Contact', 
                    source: 'contacts',
                    displayField: 'firstName',
                    render: (item) => `${item.firstName} ${item.lastName}`
                },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 }
            ]
        }
    },

    companies: {
        title: 'Companies',
        apiEndpoint: 'companies',
        dataKey: 'companies',
        features: {
            bulkSelection: true,
            filtering: true,
            filterOptions: false  // Disabled until backend endpoint exists
        },
        defaultFilters: {
            industry: '',
            size: '',
            status: ''
        },
        fields: {
            display: [
                { name: 'name', label: 'Company Name' },
                { name: 'industry', label: 'Industry' },
                { name: 'size', label: 'Size' },
                { name: 'website', label: 'Website' },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        active: 'bg-green-100 text-green-800',
                        inactive: 'bg-red-100 text-red-800',
                        prospect: 'bg-yellow-100 text-yellow-800'
                    }
                }
            ],
            form: [
                { name: 'name', type: 'text', label: 'Company Name', required: true },
                { name: 'industry', type: 'text', label: 'Industry' },
                { 
                    name: 'size', 
                    type: 'select', 
                    label: 'Company Size',
                    options: [
                        { value: '1-10', label: '1-10 employees' },
                        { value: '11-50', label: '11-50 employees' },
                        { value: '51-200', label: '51-200 employees' },
                        { value: '201-500', label: '201-500 employees' },
                        { value: '501-1000', label: '501-1000 employees' },
                        { value: '1000+', label: '1000+ employees' }
                    ]
                },
                { name: 'website', type: 'url', label: 'Website' },
                { name: 'email', type: 'email', label: 'Email' },
                { name: 'phone', type: 'tel', label: 'Phone' },
                { name: 'address', type: 'textarea', label: 'Address', rows: 2 },
                { name: 'city', type: 'text', label: 'City' },
                { name: 'state', type: 'text', label: 'State' },
                { name: 'zipCode', type: 'text', label: 'ZIP Code' },
                { name: 'country', type: 'text', label: 'Country' },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'active',
                    options: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'prospect', label: 'Prospect' }
                    ]
                },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 }
            ]
        }
    },

    users: {
        title: 'Users',
        apiEndpoint: 'users',
        dataKey: 'users',
        features: {
            bulkSelection: true,
            filtering: true,
            filterOptions: false,  // Disabled until backend endpoint exists
            invite: true  // Enable invite functionality
        },
        defaultFilters: {
            role: '',
            status: ''
        },
        fields: {
            display: [
                { 
                    name: 'username', 
                    label: 'User',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {item.firstName} {item.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{value}</div>
                        </div>
                    )
                },
                { name: 'email', label: 'Email' },
                { 
                    name: 'role', 
                    label: 'Role', 
                    type: 'status',
                    statusColors: {
                        Administrator: 'bg-red-100 text-red-800',
                        Manager: 'bg-blue-100 text-blue-800',
                        Employee: 'bg-green-100 text-green-800'
                    }
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        active: 'bg-green-100 text-green-800',
                        inactive: 'bg-red-100 text-red-800',
                        pending: 'bg-yellow-100 text-yellow-800'
                    }
                }
            ],
            form: [
                { name: 'firstName', type: 'text', label: 'First Name', required: true },
                { name: 'lastName', type: 'text', label: 'Last Name', required: true },
                { name: 'username', type: 'text', label: 'Username', required: true },
                { name: 'email', type: 'email', label: 'Email', required: true },
                { name: 'phone', type: 'tel', label: 'Phone' },
                { 
                    name: 'role', 
                    type: 'select', 
                    label: 'Role', 
                    defaultValue: 'Employee',
                    options: [
                        { value: 'Administrator', label: 'Administrator' },
                        { value: 'Manager', label: 'Manager' },
                        { value: 'Employee', label: 'Employee' }
                    ]
                },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'active',
                    options: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'pending', label: 'Pending' }
                    ]
                },
                { 
                    name: 'companyId', 
                    type: 'select', 
                    label: 'Company', 
                    source: 'companies',
                    displayField: 'name'
                }
            ]
        }
    },

    tasks: {
        title: 'Tasks',
        apiEndpoint: 'tasks',
        dataKey: 'tasks',
        features: {
            listManagement: true,
            bulkSelection: true,
            filtering: true,
            filterOptions: false,
            undoDelete: true,
            tags: true,
            customActions: false
        },
        defaultFilters: {
            status: '',
            priority: '',
            assignedTo: '',
            assignmentType: '',
            category: '',
            overdue: false
        },
        fields: {
            display: [
                { 
                    name: 'title', 
                    label: 'Task',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {item.priority}
                                </span>
                                {item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed' && (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                        Overdue
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        pending: 'bg-yellow-100 text-yellow-800',
                        in_progress: 'bg-blue-100 text-blue-800',
                        completed: 'bg-green-100 text-green-800',
                        cancelled: 'bg-red-100 text-red-800'
                    }
                },
                { 
                    name: 'assignmentType', 
                    label: 'Assignment',
                    render: (value) => (
                        <span className="text-sm text-gray-700 capitalize">
                            {value.replace('_', ' ')}
                        </span>
                    )
                },
                { 
                    name: 'dueDate', 
                    label: 'Due Date',
                    type: 'date',
                    render: (value, item) => {
                        if (!value) return '-';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return 'Invalid Date';
                        const isOverdue = date < new Date() && item.status !== 'completed';
                        return (
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                {date.toLocaleDateString()}
                            </span>
                        );
                    }
                },
                { 
                    name: 'assignments', 
                    label: 'Assigned To',
                    render: (value) => {
                        if (!value || value.length === 0) return 'Unassigned';
                        if (value.length === 1) return value[0].user?.username || 'Unknown';
                        return `${value.length} users`;
                    }
                },
                { 
                    name: 'category', 
                    label: 'Category',
                    render: (value) => value || '-'
                }
            ],
            form: [
                { name: 'title', type: 'text', label: 'Title', required: true },
                { name: 'description', type: 'textarea', label: 'Description', rows: 3 },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'pending',
                    options: [
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' }
                    ]
                },
                { 
                    name: 'priority', 
                    type: 'select', 
                    label: 'Priority', 
                    defaultValue: 'medium',
                    options: [
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' }
                    ]
                },
                { name: 'dueDate', type: 'date', label: 'Due Date' },
                { name: 'estimatedHours', type: 'number', label: 'Estimated Hours', step: '0.5', min: '0' },
                { 
                    name: 'assignmentType', 
                    type: 'select', 
                    label: 'Assignment Type', 
                    defaultValue: 'individual',
                    options: [
                        { value: 'individual', label: 'Individual' },
                        { value: 'multiple', label: 'Multiple Users' },
                        { value: 'all_company', label: 'All Company' }
                    ]
                },
                { name: 'category', type: 'text', label: 'Category' },
                { 
                    name: 'contactId', 
                    type: 'select', 
                    label: 'Related Contact', 
                    source: 'contacts',
                    displayField: 'firstName',
                    render: (item) => `${item.firstName} ${item.lastName}`
                },
                { 
                    name: 'leadId', 
                    type: 'select', 
                    label: 'Related Lead', 
                    source: 'leads',
                    displayField: 'title'
                },
                { 
                    name: 'opportunityId', 
                    type: 'select', 
                    label: 'Related Opportunity', 
                    source: 'opportunities',
                    displayField: 'name'
                },
                { 
                    name: 'saleId', 
                    type: 'select', 
                    label: 'Related Sale', 
                    source: 'sales',
                    displayField: 'title'
                },
                { name: 'tags', type: 'tags', label: 'Tags' },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 }
            ]
        },
        filters: {
            status: { 
                type: 'select', 
                options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                ]
            },
            priority: { 
                type: 'select', 
                options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                ]
            },
            assignmentType: { 
                type: 'select', 
                options: [
                    { value: 'individual', label: 'Individual' },
                    { value: 'multiple', label: 'Multiple Users' },
                    { value: 'all_company', label: 'All Company' }
                ]
            },
            assignedTo: { type: 'select', source: 'users', displayField: 'username' },
            category: { type: 'text' },
            overdue: { type: 'checkbox', label: 'Show overdue only' }
        }
    },

    tickets: {
        title: 'Tickets',
        apiEndpoint: 'tickets',
        dataKey: 'tickets',
        features: {
            listManagement: true,
            bulkSelection: true,
            filtering: true,
            filterOptions: true,
            undoDelete: true,
            tags: true,
            customActions: true
        },
        defaultFilters: {
            status: '',
            priority: '',
            type: '',
            assignedTo: '',
            contactId: ''
        },
        customActions: [
            {
                key: 'addComment',
                label: 'Comment',
                className: 'px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors',
                title: 'Add Comment'
            },
            {
                key: 'resolve',
                label: 'Resolve',
                className: 'px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors',
                title: 'Mark as Resolved'
            }
        ],
        fields: {
            display: [
                { 
                    name: 'ticketNumber', 
                    label: 'Ticket #',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'title', 
                    label: 'Title',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.type === 'bug' ? 'bg-red-100 text-red-800' :
                                    item.type === 'feature_request' ? 'bg-blue-100 text-blue-800' :
                                    item.type === 'support' ? 'bg-green-100 text-green-800' :
                                    item.type === 'incident' ? 'bg-purple-100 text-purple-800' :
                                    item.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {item.type?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {item.priority}
                                </span>
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        open: 'bg-blue-100 text-blue-800',
                        in_progress: 'bg-yellow-100 text-yellow-800',
                        resolved: 'bg-green-100 text-green-800',
                        closed: 'bg-gray-100 text-gray-800',
                        on_hold: 'bg-orange-100 text-orange-800'
                    }
                },
                { 
                    name: 'contact', 
                    label: 'Contact',
                    render: (value) => value ? `${value.firstName} ${value.lastName}` : '-'
                },
                { 
                    name: 'assignedUser', 
                    label: 'Assigned To',
                    render: (value) => value ? value.username : 'Unassigned'
                },
                { 
                    name: 'createdAt', 
                    label: 'Created',
                    type: 'date',
                    render: (value) => {
                        if (!value) return '-';
                        const date = new Date(value);
                        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                    }
                }
            ],
            form: [
                { name: 'title', type: 'text', label: 'Title', required: true },
                { name: 'description', type: 'textarea', label: 'Description', rows: 4 },
                { 
                    name: 'status', 
                    type: 'select', 
                    label: 'Status', 
                    defaultValue: 'open',
                    options: [
                        { value: 'open', label: 'Open' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' },
                        { value: 'on_hold', label: 'On Hold' }
                    ]
                },
                { 
                    name: 'priority', 
                    type: 'select', 
                    label: 'Priority', 
                    defaultValue: 'medium',
                    options: [
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' }
                    ]
                },
                { 
                    name: 'type', 
                    type: 'select', 
                    label: 'Type', 
                    defaultValue: 'support',
                    options: [
                        { value: 'bug', label: 'Bug' },
                        { value: 'feature_request', label: 'Feature Request' },
                        { value: 'support', label: 'Support' },
                        { value: 'question', label: 'Question' },
                        { value: 'task', label: 'Task' },
                        { value: 'incident', label: 'Incident' }
                    ]
                },
                { 
                    name: 'contactId', 
                    type: 'select', 
                    label: 'Contact', 
                    source: 'contacts',
                    displayField: 'firstName',
                    render: (item) => `${item.firstName} ${item.lastName}`
                },
                { 
                    name: 'assignedTo', 
                    type: 'select', 
                    label: 'Assign To', 
                    source: 'users',
                    displayField: 'username'
                },
                { 
                    name: 'relatedLeadId', 
                    type: 'select', 
                    label: 'Related Lead', 
                    source: 'leads',
                    displayField: 'title'
                },
                { 
                    name: 'relatedOpportunityId', 
                    type: 'select', 
                    label: 'Related Opportunity', 
                    source: 'opportunities',
                    displayField: 'name'
                },
                { 
                    name: 'relatedSaleId', 
                    type: 'select', 
                    label: 'Related Sale', 
                    source: 'sales',
                    displayField: 'title'
                },
                { 
                    name: 'relatedTaskId', 
                    type: 'select', 
                    label: 'Related Task', 
                    source: 'tasks',
                    displayField: 'title'
                },
                { name: 'estimatedHours', type: 'number', label: 'Estimated Hours', step: '0.5', min: '0' },
                { name: 'tags', type: 'tags', label: 'Tags' },
                { name: 'resolutionNotes', type: 'textarea', label: 'Resolution Notes', rows: 3 }
            ]
        },
        filters: {
            status: { 
                type: 'select', 
                options: [
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'on_hold', label: 'On Hold' }
                ]
            },
            priority: { 
                type: 'select', 
                options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                ]
            },
            type: { 
                type: 'select', 
                options: [
                    { value: 'bug', label: 'Bug' },
                    { value: 'feature_request', label: 'Feature Request' },
                    { value: 'support', label: 'Support' },
                    { value: 'question', label: 'Question' },
                    { value: 'task', label: 'Task' },
                    { value: 'incident', label: 'Incident' }
                ]
            },
            assignedTo: { 
                type: 'select', 
                source: 'users', 
                displayField: 'username'
            },
            contactId: { 
                type: 'select', 
                source: 'contacts', 
                displayField: 'firstName',
                render: (item) => `${item.firstName} ${item.lastName}`
            }
        }
    },

    // Queue-specific configurations
    myTicketQueue: {
        title: 'My Ticket Queue',
        apiEndpoint: 'tickets/queue/my',
        dataKey: 'tickets',
        features: {
            queueView: true,
            filtering: true,
            filterOptions: true,
            bulkSelection: true,
            stats: true,
            assignmentActions: false,
            bulkActions: true
        },
        defaultFilters: {
            status: '',
            priority: '',
            type: ''
        },
        fields: {
            display: [
                { 
                    name: 'ticketNumber', 
                    label: 'Ticket #',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'title', 
                    label: 'Title',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.type === 'bug' ? 'bg-red-100 text-red-800' :
                                    item.type === 'feature_request' ? 'bg-blue-100 text-blue-800' :
                                    item.type === 'support' ? 'bg-green-100 text-green-800' :
                                    item.type === 'incident' ? 'bg-purple-100 text-purple-800' :
                                    item.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {item.type?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {item.priority}
                                </span>
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        open: 'bg-blue-100 text-blue-800',
                        in_progress: 'bg-yellow-100 text-yellow-800',
                        resolved: 'bg-green-100 text-green-800',
                        closed: 'bg-gray-100 text-gray-800',
                        on_hold: 'bg-orange-100 text-orange-800'
                    }
                },
                { 
                    name: 'contact', 
                    label: 'Contact',
                    render: (value) => value ? `${value.firstName} ${value.lastName}` : '-'
                },
                { 
                    name: 'createdAt', 
                    label: 'Created',
                    render: (value) => new Date(value).toLocaleDateString()
                }
            ]
        }
    },

    unassignedTicketQueue: {
        title: 'Unassigned Ticket Queue',
        apiEndpoint: 'tickets/queue/unassigned',
        dataKey: 'tickets',
        features: {
            queueView: true,
            filtering: true,
            filterOptions: true,
            bulkSelection: true,
            stats: false,
            assignmentActions: true,
            bulkActions: true
        },
        defaultFilters: {
            status: '',
            priority: '',
            type: ''
        },
        fields: {
            display: [
                { 
                    name: 'ticketNumber', 
                    label: 'Ticket #',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'title', 
                    label: 'Title',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.type === 'bug' ? 'bg-red-100 text-red-800' :
                                    item.type === 'feature_request' ? 'bg-blue-100 text-blue-800' :
                                    item.type === 'support' ? 'bg-green-100 text-green-800' :
                                    item.type === 'incident' ? 'bg-purple-100 text-purple-800' :
                                    item.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {item.type?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {item.priority}
                                </span>
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        open: 'bg-blue-100 text-blue-800',
                        in_progress: 'bg-yellow-100 text-yellow-800',
                        resolved: 'bg-green-100 text-green-800',
                        closed: 'bg-gray-100 text-gray-800',
                        on_hold: 'bg-orange-100 text-orange-800'
                    }
                },
                { 
                    name: 'contact', 
                    label: 'Contact',
                    render: (value) => value ? `${value.firstName} ${value.lastName}` : '-'
                },
                { 
                    name: 'creator', 
                    label: 'Created By',
                    render: (value) => value ? value.username : '-'
                },
                { 
                    name: 'createdAt', 
                    label: 'Created',
                    render: (value) => new Date(value).toLocaleDateString()
                }
            ]
        }
    },

    teamTicketQueue: {
        title: 'Team Ticket Queue',
        apiEndpoint: 'tickets/queue/team',
        dataKey: 'tickets',
        features: {
            queueView: true,
            filtering: true,
            filterOptions: true,
            bulkSelection: true,
            stats: false,
            assignmentActions: true,
            bulkActions: true
        },
        defaultFilters: {
            status: '',
            priority: '',
            type: '',
            assignedTo: ''
        },
        fields: {
            display: [
                { 
                    name: 'ticketNumber', 
                    label: 'Ticket #',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'title', 
                    label: 'Title',
                    render: (value, item, onOpenProfile) => (
                        <div>
                            <div 
                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onOpenProfile && onOpenProfile(item.id)}
                            >
                                {value}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.type === 'bug' ? 'bg-red-100 text-red-800' :
                                    item.type === 'feature_request' ? 'bg-blue-100 text-blue-800' :
                                    item.type === 'support' ? 'bg-green-100 text-green-800' :
                                    item.type === 'incident' ? 'bg-purple-100 text-purple-800' :
                                    item.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {item.type?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {item.priority}
                                </span>
                            </div>
                        </div>
                    )
                },
                { 
                    name: 'status', 
                    label: 'Status', 
                    type: 'status',
                    statusColors: {
                        open: 'bg-blue-100 text-blue-800',
                        in_progress: 'bg-yellow-100 text-yellow-800',
                        resolved: 'bg-green-100 text-green-800',
                        closed: 'bg-gray-100 text-gray-800',
                        on_hold: 'bg-orange-100 text-orange-800'
                    }
                },
                { 
                    name: 'assignedUser', 
                    label: 'Assigned To',
                    render: (value) => value ? value.username : 'Unassigned'
                },
                { 
                    name: 'contact', 
                    label: 'Contact',
                    render: (value) => value ? `${value.firstName} ${value.lastName}` : '-'
                },
                { 
                    name: 'createdAt', 
                    label: 'Created',
                    render: (value) => new Date(value).toLocaleDateString()
                }
            ]
        }
    }
};

export { entityConfigs };