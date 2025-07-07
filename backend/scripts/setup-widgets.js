const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'crm_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running widget migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', '..', 'db', 'migrations', '003_create_widgets_table.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('✅ Widget migration completed successfully!');
        
        // Verify the widgets were inserted
        const result = await client.query('SELECT widget_key, name, type FROM widgets ORDER BY sort_order');
        console.log('📋 Widgets in database:');
        result.rows.forEach(widget => {
            console.log(`  - ${widget.widget_key}: ${widget.name} (${widget.type})`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runMigration();
        console.log('🎉 Widget setup completed successfully!');
    } catch (error) {
        console.error('💥 Widget setup failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runMigration }; 