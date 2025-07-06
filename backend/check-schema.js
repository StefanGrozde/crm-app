const { sequelize } = require('./config/db');

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Check if the email configuration columns exist
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name IN ('ms365_client_id', 'ms365_client_secret', 'ms365_tenant_id', 'ms365_email_from', 'email_enabled')
      ORDER BY column_name;
    `);

    console.log('\nEmail configuration columns in companies table:');
    if (results.length === 0) {
      console.log('❌ No email configuration columns found. Run the migration first.');
    } else {
      results.forEach(col => {
        console.log(`✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check all columns in companies table
    const [allColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY column_name;
    `);

    console.log('\nAll columns in companies table:');
    allColumns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema(); 