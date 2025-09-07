/**
 * Simple integration test for the CF Worker
 * This tests the API endpoints to ensure they work correctly
 */

const TEST_QUERY = "Steps to bake a cake";
const TEST_SELECTED_TEXT = "Mix ingredients";
const TEST_QUESTION = "What temperature should I use?";

async function testDescribeEndpoint() {
  console.log('Testing /api/describe endpoint...');
  
  try {
    const response = await fetch('/api/describe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: TEST_QUERY
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Describe endpoint working');
    console.log(`- Query: ${data.query}`);
    console.log(`- Diagram Type: ${data.diagram_type}`);
    console.log(`- Description: ${data.description.substring(0, 100)}...`);
    console.log(`- Diagram Length: ${data.diagram.length} characters`);
    
    return data;
  } catch (error) {
    console.error('❌ Describe endpoint failed:', error.message);
    throw error;
  }
}

async function testDeepDiveEndpoint() {
  console.log('Testing /api/deep-dive endpoint...');
  
  try {
    const response = await fetch('/api/deep-dive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selected_text: TEST_SELECTED_TEXT,
        question: TEST_QUESTION,
        original_query: TEST_QUERY
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Deep dive endpoint working');
    console.log(`- Response: ${data.response.substring(0, 100)}...`);
    
    return data;
  } catch (error) {
    console.error('❌ Deep dive endpoint failed:', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting CF Worker integration tests...\n');
  
  try {
    await testDescribeEndpoint();
    console.log('');
    await testDeepDiveEndpoint();
    console.log('\n🎉 All tests passed! The integration is working correctly.');
  } catch (error) {
    console.error('\n💥 Tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests();
}

module.exports = { testDescribeEndpoint, testDeepDiveEndpoint, runTests };
