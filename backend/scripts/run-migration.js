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

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running user invitations migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../db/migrations/005_create_user_invitations_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('Migration completed successfully!');
        
        // Verify the table was created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_invitations'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ user_invitations table created successfully');
        } else {
            console.log('❌ user_invitations table not found');
        }
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration }; 