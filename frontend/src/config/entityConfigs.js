// Entity configurations for the unified widget system

export const entityConfigs = {
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
                    render: (value, item) => (
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-blue-600">
                                    {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">
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
            source: { type: 'select', source: 'filterOptions.sources', displayField: 'value' },
            department: { type: 'select', source: 'filterOptions.departments', displayField: 'value' },
            city: { type: 'select', source: 'filterOptions.cities', displayField: 'value' },
            state: { type: 'select', source: 'filterOptions.states', displayField: 'value' },
            country: { type: 'select', source: 'filterOptions.countries', displayField: 'value' }
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
                    render: (value, item) => (
                        <div>
                            <div className="text-sm font-medium text-gray-900">{value}</div>
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
                { name: 'name', label: 'Name' },
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
            filterOptions: false  // Disabled until backend endpoint exists
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
                    render: (value, item) => (
                        <div>
                            <div className="text-sm font-medium text-gray-900">
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
    }
};

export default entityConfigs;