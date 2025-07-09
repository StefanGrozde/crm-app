const { Pool } = require('pg');
const fs = require('fs').promises;
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
    let client;
    try {
        console.log('🔄 Starting users table migration...');
        
        client = await pool.connect();
        console.log('✅ Connected to database');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', '..', 'db', 'migrations', '004_update_users_table.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        console.log('📄 Executing migration...');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('✅ Users table migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (client) {
            client.release();
            console.log('🔌 Database connection released');
        }
    }
}

async function main() {
    try {
        await runMigration();
        console.log('🎉 All done!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = { runMigration }; 