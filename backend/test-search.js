const SearchService = require('./services/searchService');

console.log('SearchService loaded successfully');

// Test the getSearchSuggestions method
async function testSuggestions() {
  try {
    console.log('Testing getSearchSuggestions...');
    const suggestions = await SearchService.getSearchSuggestions('John', {
      userId: 1,
      companyId: 1,
      limit: 5
    });
    console.log('Suggestions result:', suggestions);
  } catch (error) {
    console.error('Error in getSearchSuggestions:', error);
    console.error('Error stack:', error.stack);
  }
}

testSuggestions(); 