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

async function runTicketQueueMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running ticket queue widgets migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../../db/migrations/013_register_ticket_queue_widgets.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query(migrationSQL);
        
        console.log('Migration completed successfully!');
        
        // Verify the widgets were created
        const result = await client.query(`
            SELECT widget_key, name, type, is_active, sort_order
            FROM widgets 
            WHERE widget_key LIKE '%ticket%queue%' OR widget_key IN ('tickets-widget', 'tasks-widget')
            ORDER BY sort_order
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Ticket queue widgets registered successfully:');
            result.rows.forEach(row => {
                console.log(`  - ${row.widget_key}: ${row.name} (${row.type}, active: ${row.is_active}, order: ${row.sort_order})`);
            });
        } else {
            console.log('❌ No ticket queue widgets found');
        }
        
        // Show all widgets for verification
        const allWidgets = await client.query(`
            SELECT widget_key, name, sort_order, is_active
            FROM widgets 
            ORDER BY sort_order
        `);
        
        console.log('\n📋 All registered widgets:');
        allWidgets.rows.forEach(row => {
            const status = row.is_active ? '✅' : '❌';
            console.log(`  ${status} [${row.sort_order}] ${row.widget_key}: ${row.name}`);
        });
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runTicketQueueMigration();
        console.log('\n🎉 Ticket queue widgets migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
main();