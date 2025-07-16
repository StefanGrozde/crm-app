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
});

async function runEmailMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running email-to-ticket migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../db/migrations/017_create_email_to_ticket_tables.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('Email-to-ticket migration completed successfully!');
        
        // Verify the tables were created
        const emailConfigResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'email_configurations';
        `);
        
        const emailProcessingResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'email_processing';
        `);
        
        if (emailConfigResult.rows.length > 0) {
            console.log('✅ email_configurations table created successfully');
        } else {
            console.log('❌ email_configurations table not found');
        }
        
        if (emailProcessingResult.rows.length > 0) {
            console.log('✅ email_processing table created successfully');
        } else {
            console.log('❌ email_processing table not found');
        }
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runEmailMigration();