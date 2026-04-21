// Simple test script to verify correlation ID flow
// Run this with: node test-correlation-id.js

const CORRELATION_ID_HEADER = 'x-correlation-id';

async function testCorrelationIdFlow() {
  console.log('🧪 Testing Correlation ID Flow...');
  
  try {
    // Test 1: API call without correlation ID (middleware should generate one)
    console.log('\n📝 Test 1: GET /api/tests without correlation ID');
    const response1 = await fetch('http://localhost:3000/api/tests');
    const correlationId1 = response1.headers.get(CORRELATION_ID_HEADER);
    console.log('Response correlation ID:', correlationId1);
    console.log('Status:', response1.status);
    
    // Test 2: API call with custom correlation ID
    console.log('\n📝 Test 2: GET /api/tests with custom correlation ID');
    const customId = 'req-1234567890123-abcdefghijklm'; // Valid format: 13 digits + 13 chars
    const response2 = await fetch('http://localhost:3000/api/tests', {
      headers: {
        [CORRELATION_ID_HEADER]: customId
      }
    });
    const correlationId2 = response2.headers.get(CORRELATION_ID_HEADER);
    console.log('Sent correlation ID:', customId);
    console.log('Response correlation ID:', correlationId2);
    console.log('IDs match:', customId === correlationId2);
    console.log('Status:', response2.status);
    
    // Test 3: POST request (submit-test-result would need auth, so we'll test with a simple endpoint)
    console.log('\n📝 Test 3: Testing correlation ID format');
    if (correlationId1) {
      const parts = correlationId1.split('-');
      console.log('ID parts:', parts);
      console.log('Format valid (req-timestamp-random):', parts.length === 3 && parts[0] === 'req');
      
      // Extract timestamp
      const timestamp = parseInt(parts[1]);
      const date = new Date(timestamp);
      console.log('Timestamp:', timestamp);
      console.log('Date:', date.toISOString());
      console.log('Recent (within last minute):', Date.now() - timestamp < 60000);
    }
    
    console.log('\n✅ Correlation ID flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if we're running in Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment - use node-fetch if available, otherwise show instructions
  try {
    // Try to use built-in fetch (Node 18+)
    if (typeof fetch === 'undefined') {
      console.log('❌ This test requires Node.js 18+ with built-in fetch support.');
      console.log('Or run this in a browser console while the dev server is running.');
      process.exit(1);
    }
    testCorrelationIdFlow();
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('💡 To test correlation ID flow:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Open browser console on http://localhost:3000');
    console.log('3. Copy and paste this test function');
  }
} else {
  // Browser environment
  console.log('🌐 Running in browser environment');
  testCorrelationIdFlow();
}