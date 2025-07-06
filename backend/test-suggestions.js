const SearchService = require('./services/searchService');
const { sequelize } = require('./config/db');

async function testSuggestions() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    console.log('Testing getSearchSuggestions...');
    const suggestions = await SearchService.getSearchSuggestions('Jo', {
      userId: 1,
      companyId: 1,
      limit: 5
    });
    
    console.log('Suggestions result:', suggestions);
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testSuggestions(); 