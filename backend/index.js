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
    
    // Define associations
    // Company associations
    Company.hasMany(User, { foreignKey: 'companyId' });
    Company.hasMany(Contact, { foreignKey: 'companyId' });
    Company.hasMany(Lead, { foreignKey: 'companyId' });
    Company.hasMany(Opportunity, { foreignKey: 'companyId' });
    
    // User associations
    User.belongsTo(Company, { foreignKey: 'companyId' });
    User.hasMany(Contact, { foreignKey: 'assignedTo', as: 'assignedContacts' });
    User.hasMany(Contact, { foreignKey: 'createdBy', as: 'createdContacts' });
    User.hasMany(Lead, { foreignKey: 'createdBy', as: 'createdLeads' });
    User.hasMany(Opportunity, { foreignKey: 'createdBy', as: 'createdOpportunities' });
    User.hasMany(UserInvitation, { foreignKey: 'invitedBy', as: 'InvitedBy' });
    
    // Contact associations
    Contact.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Contact.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Contact.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Contact.hasMany(Lead, { foreignKey: 'contactId', as: 'leads' });
    Contact.hasMany(Opportunity, { foreignKey: 'contactId', as: 'opportunities' });
    
    // Lead associations
    Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Lead.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Lead.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // Opportunity associations
    Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
    Opportunity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
    Opportunity.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
    Opportunity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // UserInvitation associations
    UserInvitation.belongsTo(Company, { foreignKey: 'companyId' });
    UserInvitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'InvitedBy' });
    
    // DashboardView associations
    User.hasMany(DashboardView, { foreignKey: 'userId' });
    DashboardView.belongsTo(User, { foreignKey: 'userId' });
    DashboardView.hasMany(DashboardWidget, { foreignKey: 'viewId', as: 'widgets' });
    DashboardWidget.belongsTo(DashboardView, { foreignKey: 'viewId' });
    
    // Sync all models
    // Use { force: true } only in development to drop and re-create tables
    // await sequelize.sync({ force: true });
    await sequelize.sync();
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();