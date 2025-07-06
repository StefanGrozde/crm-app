const axios = require('axios');

async function testSearchAPI() {
  try {
    console.log('Testing search suggestions API...');
    
    // First, let's test the test-tables endpoint to make sure the server is running
    const testResponse = await axios.get('https://backend.svnikolaturs.mk/api/search/test-tables', {
      withCredentials: true
    });
    console.log('Test tables response:', testResponse.data);
    
    // Now test the suggestions endpoint
    const suggestionsResponse = await axios.get('https://backend.svnikolaturs.mk/api/search/suggestions?q=Jo', {
      withCredentials: true
    });
    console.log('Suggestions response:', suggestionsResponse.data);
    
  } catch (error) {
    console.error('Error testing search API:', error.response?.data || error.message);
    console.error('Error status:', error.response?.status);
  }
}

testSearchAPI(); 