const { sequelize } = require('./config/db');
const Lead = require('./models/Lead');
const SearchService = require('./services/searchService');

async function testLeadsSearch() {
  try {
    console.log('🔍 Testing leads search...');
    
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
    
    // Test 3: Get a sample lead to see the field structure
    const sampleLead = await Lead.findOne({
      raw: true
    });
    console.log('🔍 Sample lead structure:', JSON.stringify(sampleLead, null, 2));
    
    // Test 4: Try a simple search with a known company ID
    const companyId = sampleLead.company_id || sampleLead.companyId;
    console.log('🔍 Using company ID for search:', companyId);
    
    const searchResults = await SearchService.searchLeads('test', {
      userId: 1,
      companyId: companyId,
      limit: 5
    });
    console.log('🔍 Search results:', JSON.stringify(searchResults, null, 2));
    
    // Test 5: Try searching with the actual title
    if (sampleLead.title) {
      const titleSearch = await SearchService.searchLeads(sampleLead.title.substring(0, 3), {
        userId: 1,
        companyId: companyId,
        limit: 5
      });
      console.log('🔍 Title search results:', JSON.stringify(titleSearch, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testLeadsSearch(); 