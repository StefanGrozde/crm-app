// backend/index.js

const cors = require('cors');
const express = require('express');
// REMOVE: const { Pool } = require('pg');
const pool = require('./config/db');
const { connectDB, sequelize } = require('./config/db');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const searchRoutes = require('./routes/searchRoutes');
const contactRoutes = require('./routes/contactRoutes');
const leadRoutes = require('./routes/leadRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const businessRoutes = require('./routes/businessRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const listRoutes = require('./routes/listRoutes');
const salesRoutes = require('./routes/salesRoutes');
const taskRoutes = require('./routes/taskRoutes');
const fileRoutes = require('./routes/fileRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const messengerRoutes = require('./routes/messengerRoutes');
const path = require('path');

console.log("Application starting...");

// --- Environment Variable Check ---
const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']; // ADD JWT_SECRET
const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use('/api/widgets/files', express.static(path.join(__dirname, 'widgets')));
// --- Middleware ---
const allowedOrigins = [
    'https://main.dww6vb3yjjh85.amplifyapp.com',
    'https://crm.svnikolaturs.mk',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser())
app.use(express.json());
;
// --- REMOVE PostgreSQL Connection Pool section ---
// We moved all this logic to `db.js`

// --- Routes ---

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Health check successful' });
});

// Use the auth routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/widgets/buildin', express.static(path.join(__dirname, 'widgets', 'buildin')));
app.use('/api/widgets/custom', express.static(path.join(__dirname, 'widgets', 'custom')));
// Test Route to check DB connection
app.get('/api/auth/test', (req, res) => {
    res.status(200).send('Auth test route is working!');
  });
app.get('/api/test-db', async (req, res) => {
    let client;
    try {
        console.log("Attempting to connect to the database...");
        client = await pool.connect();
        console.log("Database client connected.");
        const result = await client.query('SELECT NOW()');
        console.log("Database query successful.");
        res.json({ message: 'Database connection successful!', time: result.rows[0].now });
    } catch (err) {
        console.error('Database connection error:', err.stack);
        res.status(500).json({ error: 'Failed to connect to database' });
    } finally {
        if (client) {
            client.release();
            console.log("Database client released.");
        }
    }
});


// --- Server Startup ---
const PORT = process.env.PORT || 8080;
const startServer = async () => {
    await connectDB();
    
    // Import models to ensure they are loaded
    const Contact = require('./models/Contact');
    const Lead = require('./models/Lead');
    const Opportunity = require('./models/Opportunity');
    const Company = require('./models/Company');
    const User = require('./models/User');
    const Widget = require('./models/Widget');
    const UserInvitation = require('./models/UserInvitation');
    const { DashboardView, DashboardWidget } = require('./models/DashboardView');
    const List = require('./models/List');
    const ListMembership = require('./models/ListMembership');
    const ListShare = require('./models/ListShare');
    const Sale = require('./models/Sale');
    const Task = require('./models/Task');
    const TaskAssignment = require('./models/TaskAssignment');
    const Ticket = require('./models/Ticket');
    const TicketComment = require('./models/TicketComment');
    const Notification = require('./models/Notification');
    const AuditLog = require('./models/AuditLog');
    const UserSession = require('./models/UserSession');
    
    // Define associations
    // Company associations
    Company.hasMany(User, { foreignKey: 'companyId' });
    Company.hasMany(Contact, { foreignKey: 'companyId' });
    Company.hasMany(Lead, { foreignKey: 'companyId' });
    Company.hasMany(Opportunity, { foreignKey: 'companyId' });
    Company.hasMany(Sale, { foreignKey: 'companyId' });
    
    // User associations
    User.belongsTo(Company, { foreignKey: 'companyId' });
    User.hasMany(Contact, { foreignKey: 'assignedTo', as: 'assignedContacts' });
    User.hasMany(Contact, { foreignKey: 'createdBy', as: 'createdContacts' });
    User.hasMany(Lead, { foreignKey: 'createdBy', as: 'createdLeads' });
    User.hasMany(Opportunity, { foreignKey: 'createdBy', as: 'createdOpportunities' });
    User.hasMany(Sale, { foreignKey: 'assignedTo', as: 'assignedSales' });
    User.hasMany(Sale, { foreignKey: 'createdBy', as: 'createdSales' });
    User.hasMany(UserInvitation, { foreignKey: 'invitedBy', as: 'InvitedBy' });
    
    // Contact associations
    Contact.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Contact.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Contact.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Contact.hasMany(Lead, { foreignKey: 'contactId', as: 'leads' });
    Contact.hasMany(Opportunity, { foreignKey: 'contactId', as: 'opportunities' });
    Contact.hasMany(Sale, { foreignKey: 'contactId', as: 'sales' });
    
    // Lead associations
    Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Lead.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Lead.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Lead.hasMany(Sale, { foreignKey: 'leadId', as: 'sales' });
    
    // Opportunity associations
    Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Opportunity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Opportunity.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Opportunity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Opportunity.hasMany(Sale, { foreignKey: 'opportunityId', as: 'sales' });
    
    // Sale associations
    Sale.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Sale.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Sale.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
    Sale.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
    Sale.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Sale.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // UserInvitation associations
    UserInvitation.belongsTo(Company, { foreignKey: 'companyId' });
    UserInvitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'InvitedBy' });
    
    // DashboardView associations are already defined in the DashboardView.js model file
    
    // List associations
    List.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    List.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    List.hasMany(ListMembership, { foreignKey: 'listId', as: 'memberships' });
    List.hasMany(ListShare, { foreignKey: 'listId', as: 'shares' });
    
    // ListMembership associations
    ListMembership.belongsTo(List, { foreignKey: 'listId', as: 'list' });
    ListMembership.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });
    
    // ListShare associations
    ListShare.belongsTo(List, { foreignKey: 'listId', as: 'list' });
    ListShare.belongsTo(User, { foreignKey: 'sharedWith', as: 'sharedWithUser' });
    ListShare.belongsTo(User, { foreignKey: 'sharedBy', as: 'sharedByUser' });
    
    // Company associations for Lists
    Company.hasMany(List, { foreignKey: 'companyId' });
    
    // User associations for Lists
    User.hasMany(List, { foreignKey: 'createdBy', as: 'createdLists' });
    User.hasMany(ListMembership, { foreignKey: 'addedBy', as: 'addedMemberships' });
    User.hasMany(ListShare, { foreignKey: 'sharedWith', as: 'sharedLists' });
    User.hasMany(ListShare, { foreignKey: 'sharedBy', as: 'listsShared' });
    
    // Task associations
    Task.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Task.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Task.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
    Task.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
    Task.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
    Task.hasMany(TaskAssignment, { foreignKey: 'taskId', as: 'assignments' });
    
    // TaskAssignment associations
    TaskAssignment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
    TaskAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Company associations for Tasks
    Company.hasMany(Task, { foreignKey: 'companyId' });
    
    // User associations for Tasks
    User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
    User.hasMany(TaskAssignment, { foreignKey: 'userId', as: 'taskAssignments' });
    
    // Contact associations for Tasks
    Contact.hasMany(Task, { foreignKey: 'contactId', as: 'tasks' });
    
    // Lead associations for Tasks
    Lead.hasMany(Task, { foreignKey: 'leadId', as: 'tasks' });
    
    // Opportunity associations for Tasks
    Opportunity.hasMany(Task, { foreignKey: 'opportunityId', as: 'tasks' });
    
    // Sale associations for Tasks
    Sale.hasMany(Task, { foreignKey: 'saleId', as: 'tasks' });
    
    // Ticket associations
    Ticket.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Ticket.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Ticket.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Ticket.belongsTo(Lead, { foreignKey: 'relatedLeadId', as: 'relatedLead' });
    Ticket.belongsTo(Opportunity, { foreignKey: 'relatedOpportunityId', as: 'relatedOpportunity' });
    Ticket.belongsTo(Sale, { foreignKey: 'relatedSaleId', as: 'relatedSale' });
    Ticket.belongsTo(Task, { foreignKey: 'relatedTaskId', as: 'relatedTask' });
    Ticket.hasMany(TicketComment, { foreignKey: 'ticketId', as: 'comments' });
    
    // TicketComment associations
    TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
    TicketComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Company associations for Tickets
    Company.hasMany(Ticket, { foreignKey: 'companyId' });
    
    // User associations for Tickets
    User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'assignedTickets' });
    User.hasMany(Ticket, { foreignKey: 'createdBy', as: 'createdTickets' });
    User.hasMany(TicketComment, { foreignKey: 'userId', as: 'ticketComments' });
    
    // Contact associations for Tickets
    Contact.hasMany(Ticket, { foreignKey: 'contactId', as: 'tickets' });
    
    // Lead associations for Tickets
    Lead.hasMany(Ticket, { foreignKey: 'relatedLeadId', as: 'relatedTickets' });
    
    // Opportunity associations for Tickets
    Opportunity.hasMany(Ticket, { foreignKey: 'relatedOpportunityId', as: 'relatedTickets' });
    
    // Sale associations for Tickets
    Sale.hasMany(Ticket, { foreignKey: 'relatedSaleId', as: 'relatedTickets' });
    
    // Task associations for Tickets
    Task.hasMany(Ticket, { foreignKey: 'relatedTaskId', as: 'relatedTickets' });
    
    // Notification associations
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Notification.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    
    // Company associations for Notifications
    Company.hasMany(Notification, { foreignKey: 'companyId' });
    
    // User associations for Notifications
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    
    // AuditLog associations
    AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
    AuditLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Company.hasMany(AuditLog, { foreignKey: 'companyId', as: 'auditLogs' });
    
    // UserSession associations
    UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
    UserSession.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Company.hasMany(UserSession, { foreignKey: 'companyId', as: 'sessions' });
    
    // Sync all models
    // Use { force: true } only in development to drop and re-create tables
    // await sequelize.sync({ force: true });
    await sequelize.sync();
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();