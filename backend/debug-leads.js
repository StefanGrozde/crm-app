const { sequelize } = require('./config/db');
const Lead = require('./models/Lead');
const { Op, literal } = require('sequelize');

async function debugLeads() {
  try {
    console.log('🔍 Debugging leads search...');
    
    // Test 1: Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test 2: Check if leads table exists and has data
    const leadCount = await Lead.count();
    console.log('🔍 Total leads in database:', leadCount);
    
    if (leadCount === 0) {
      console.log('❌ No leads found in database');
      return;
    }
    
    // Test 3: Get all leads to see the data
    const allLeads = await Lead.findAll({
      raw: true,
      limit: 5
    });
    console.log('🔍 Sample leads:', JSON.stringify(allLeads, null, 2));
    
    // Test 4: Try a simple ILIKE search
    const ilikeResults = await Lead.findAll({
      where: {
        title: { [Op.iLike]: '%software%' }
      },
      raw: true,
      limit: 5
    });
    console.log('🔍 ILIKE search results:', ilikeResults.length);
    
    // Test 5: Try full-text search
    const fulltextResults = await Lead.findAll({
      where: literal(`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')) @@ plainto_tsquery('english', 'software')`),
      raw: true,
      limit: 5
    });
    console.log('🔍 Full-text search results:', fulltextResults.length);
    
    // Test 6: Check if the GIN index exists
    const indexCheck = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'leads' AND indexname = 'idx_leads_fulltext'
    `);
    console.log('🔍 GIN index check:', indexCheck[0]);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugLeads(); 