# React Widget Components

This document describes the React widget components that have been created to replace the hardcoded widgets in the database.

## Overview

The following React widget components have been implemented to provide full functionality for the CRM system:

## Widget Components

### 1. ContactsWidget (`frontend/src/components/ContactsWidget.js`)
**Purpose**: Manage and view contacts
**Features**:
- Contact listing with pagination
- Search and filtering capabilities
- Add, edit, and delete contacts
- Contact status management
- Assignment to users and companies
- Tag management

### 2. LeadsWidget (`frontend/src/components/LeadsWidget.js`)
**Purpose**: Manage and view leads
**Features**:
- Lead listing with pagination
- Search and filtering by status, priority, source
- Add, edit, and delete leads
- Lead status tracking (new, contacted, qualified, etc.)
- Priority management (low, medium, high, urgent)
- Estimated value tracking
- Assignment to users and companies

### 3. OpportunitiesWidget (`frontend/src/components/OpportunitiesWidget.js`)
**Purpose**: Manage and view opportunities
**Features**:
- Opportunity listing with pagination
- Search and filtering by stage, probability, type
- Add, edit, and delete opportunities
- Pipeline stage management
- Probability tracking
- Amount and currency management
- Expected close date tracking

### 4. CompaniesWidget (`frontend/src/components/CompaniesWidget.js`)
**Purpose**: Manage and view companies
**Features**:
- Company listing with pagination
- Search and filtering by industry, size, status
- Add, edit, and delete companies
- Company profile management
- Contact information tracking
- Industry and size classification
- Status management (active, inactive, prospect)

### 5. UsersWidget (`frontend/src/components/UsersWidget.js`)
**Purpose**: Manage and view users
**Features**:
- User listing with pagination
- Search and filtering by role, company
- Add, edit, and delete users
- Role management (Administrator, Sales Manager, etc.)
- Company assignment
- User profile management

### 6. LeadConversionWidget (`frontend/src/components/LeadConversionWidget.js`)
**Purpose**: Track lead conversion rates and metrics
**Features**:
- Conversion rate analytics
- Lead stage distribution
- Average conversion time tracking
- Conversion trend visualization
- Time range filtering (7, 30, 90, 365 days)
- Performance insights and recommendations

## Widget Integration

### DynamicWidget Registry
All widgets are registered in `frontend/src/components/DynamicWidget.js`:

```javascript
const WidgetRegistry = {
    'contacts-widget': ContactsWidget,
    'search-result-widget': SearchResultWidget,
    'leads-widget': LeadsWidget,
    'opportunities-widget': OpportunitiesWidget,
    'companies-widget': CompaniesWidget,
    'users-widget': UsersWidget,
    'lead-conversion': LeadConversionWidget
};
```

### Database Integration
Widgets are stored in the `widgets` table with the following structure:
- `widget_key`: Unique identifier (e.g., 'contacts-widget')
- `name`: Display name
- `description`: Widget description
- `type`: 'builtin-react' for React components
- `is_active`: Whether the widget is available

## Common Features

All widget components share the following common features:

### 1. **Consistent UI/UX**
- Clean, modern design using Tailwind CSS
- Responsive layouts
- Loading states and error handling
- Consistent button and form styling

### 2. **Data Management**
- Pagination support
- Search functionality
- Advanced filtering
- Real-time data updates

### 3. **CRUD Operations**
- Create new records
- Read/display existing records
- Update/edit records
- Delete records with confirmation

### 4. **Performance Optimization**
- React.memo for component memoization
- useCallback for function memoization
- useMemo for computed values
- Debounced search inputs

### 5. **Error Handling**
- Graceful error states
- User-friendly error messages
- Retry mechanisms
- Fallback UI components

## API Integration

All widgets integrate with the backend API endpoints:

- **Contacts**: `/api/contacts`
- **Leads**: `/api/leads`
- **Opportunities**: `/api/opportunities`
- **Companies**: `/api/companies`
- **Users**: `/api/users`
- **Lead Conversion**: `/api/leads/conversion-metrics`

## Usage

### Adding Widgets to Dashboard
1. Navigate to Edit Layout mode
2. Click "Add Widget"
3. Select the desired widget from the list
4. Position and resize the widget as needed
5. Save the layout

### Widget Configuration
Widgets can be configured through the Widget Manager (admin interface):
- Enable/disable widgets
- Modify widget metadata
- Change display order
- Update descriptions

## Future Enhancements

### 1. **Widget Customization**
- User-specific widget configurations
- Customizable dashboards
- Widget themes and styling options

### 2. **Advanced Analytics**
- More detailed conversion metrics
- Performance benchmarking
- Predictive analytics
- Custom reporting

### 3. **Integration Features**
- Email integration
- Calendar integration
- Document management
- Workflow automation

### 4. **Mobile Optimization**
- Touch-friendly interfaces
- Mobile-specific layouts
- Offline capabilities

## Troubleshooting

### Widget Not Loading
1. Check if the widget is active in the database
2. Verify the widget component is properly imported
3. Check browser console for JavaScript errors
4. Ensure API endpoints are accessible

### Data Not Displaying
1. Verify API responses
2. Check authentication status
3. Review network requests
4. Validate data format

### Performance Issues
1. Check component memoization
2. Review API call frequency
3. Monitor bundle size
4. Optimize database queries

## Development Guidelines

### Creating New Widgets
1. Create a new component file
2. Follow the established patterns
3. Add to the WidgetRegistry
4. Create database entry
5. Test thoroughly

### Widget Best Practices
- Use consistent naming conventions
- Implement proper error handling
- Optimize for performance
- Follow accessibility guidelines
- Write comprehensive documentation 