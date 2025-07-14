// Profile Configuration System
// Centralized configuration for all profile types across the application

export const PROFILE_CONFIGS = {
    contact: {
        endpoint: 'contacts',
        nameFields: (data) => `${data.firstName} ${data.lastName}`,
        defaultName: 'Contact Profile',
        color: 'blue',
        widgetKey: 'contact-profile-widget',
        idField: 'contactId'
    },
    lead: {
        endpoint: 'leads',
        nameFields: (data) => data.title,
        defaultName: 'Lead Profile',
        color: 'green',
        widgetKey: 'lead-profile-widget',
        idField: 'leadId'
    },
    opportunity: {
        endpoint: 'opportunities',
        nameFields: (data) => data.name,
        defaultName: 'Opportunity Profile',
        color: 'purple',
        widgetKey: 'opportunity-profile-widget',
        idField: 'opportunityId'
    },
    business: {
        endpoint: 'businesses',
        nameFields: (data) => data.name,
        defaultName: 'Business Profile',
        color: 'orange',
        widgetKey: 'business-profile-widget',
        idField: 'businessId'
    },
    user: {
        endpoint: 'users',
        nameFields: (data) => data.username || data.email,
        defaultName: 'User Profile',
        color: 'gray',
        widgetKey: 'user-profile-widget',
        idField: 'userId'
    },
    sales: {
        endpoint: 'sales',
        nameFields: (data) => data.title,
        defaultName: 'Sales Profile',
        color: 'indigo',
        widgetKey: 'sales-profile-widget',
        idField: 'saleId'
    },
    task: {
        endpoint: 'tasks',
        nameFields: (data) => data.title,
        defaultName: 'Task Profile',
        color: 'teal',
        widgetKey: 'task-profile-widget',
        idField: 'taskId'
    },
    ticket: {
        endpoint: 'tickets',
        nameFields: (data) => data.subject || data.title,
        defaultName: 'Ticket Profile',
        color: 'red',
        widgetKey: 'ticket-profile-widget',
        idField: 'ticketId'
    }
};

// Widget to profile handler mapping
export const WIDGET_PROFILE_MAPPING = {
    'contacts-widget': { handler: 'contact', propName: 'onOpenContactProfile' },
    'legacy-contacts-widget': { handler: 'contact', propName: 'onOpenContactProfile' },
    'leads-widget': { handler: 'lead', propName: 'onOpenLeadProfile' },
    'legacy-leads-widget': { handler: 'lead', propName: 'onOpenLeadProfile' },
    'opportunities-widget': { handler: 'opportunity', propName: 'onOpenOpportunityProfile' },
    'legacy-opportunities-widget': { handler: 'opportunity', propName: 'onOpenOpportunityProfile' },
    'legacy-companies-widget': { handler: 'business', propName: 'onOpenCompanyProfile' },
    'business-widget': { handler: 'business', propName: 'onOpenBusinessProfile' },
    'users-widget': { handler: 'user', propName: 'onOpenUserProfile' },
    'legacy-users-widget': { handler: 'user', propName: 'onOpenUserProfile' },
    'sales-widget': { handler: 'sales', propName: 'onOpenSaleProfile' },
    'tasks-widget': { handler: 'task', propName: 'onOpenTaskProfile' },
    'tickets-widget': { handler: 'ticket', propName: 'onOpenTicketProfile' },
    'ticket-queue-dashboard-widget': { handler: 'ticket', propName: 'onOpenTicketProfile' },
    'configurable-ticket-queue-widget': { handler: 'ticket', propName: 'onOpenTicketProfile' }
};

// Utility functions
export const getProfileConfig = (profileType) => {
    return PROFILE_CONFIGS[profileType];
};

export const getWidgetProfileMapping = (widgetKey) => {
    return WIDGET_PROFILE_MAPPING[widgetKey];
};

export const createProfileHandler = (profileType, openProfileFunction) => {
    return async (id, name = null) => {
        await openProfileFunction(profileType, id, name);
    };
};

export const getProfileProps = (widgetKey, profileHandlers) => {
    const mapping = WIDGET_PROFILE_MAPPING[widgetKey];
    if (mapping) {
        const handler = profileHandlers[mapping.handler];
        return { [mapping.propName]: handler };
    }
    return {};
};

// Profile type validation
export const isValidProfileType = (profileType) => {
    return Object.keys(PROFILE_CONFIGS).includes(profileType);
};

// Get all profile types
export const getAllProfileTypes = () => {
    return Object.keys(PROFILE_CONFIGS);
}; 