const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

async function runDashboardMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running dashboard views migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../db/migrations/006_create_dashboard_views_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('Dashboard migration completed successfully!');
        
        // Verify the tables were created
        const viewsResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'dashboard_views'
        `);
        
        const widgetsResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'dashboard_widgets'
        `);
        
        if (viewsResult.rows.length > 0) {
            console.log('✅ dashboard_views table created successfully');
        } else {
            console.log('❌ dashboard_views table not found');
        }
        
        if (widgetsResult.rows.length > 0) {
            console.log('✅ dashboard_widgets table created successfully');
        } else {
            console.log('❌ dashboard_widgets table not found');
        }
        
    } catch (error) {
        console.error('Dashboard migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    runDashboardMigration()
        .then(() => {
            console.log('Dashboard migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Dashboard migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runDashboardMigration }; 