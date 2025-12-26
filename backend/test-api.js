/**
 * API Test Script for Tender and Bid APIs
 * 
 * Usage: node test-api.js
 * 
 * Make sure your server is running on http://localhost:5000
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test data storage
let testData = {
  companyAdminToken: null,
  bidderToken: null,
  companyAdminUser: null,
  bidderUser: null,
  createdTender: null,
  createdBid: null,
};

// Helper function to make API requests
async function apiRequest(method, endpoint, token = null, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Test helper
function logTest(testName, result) {
  const status = result.ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`);
  if (!result.ok) {
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.data || result.error, null, 2));
  }
  return result.ok;
}

// ==================== AUTHENTICATION TESTS ====================

async function testRegisterCompanyAdmin() {
  console.log('\n📝 Testing: Register Company Admin');
  const result = await apiRequest('POST', '/auth/register-company-admin', null, {
    companyName: 'Test Company Admin',
    emailDomain: 'testadmin.com',
    industry: 'Technology',
    services: ['Software Development'],
    adminName: 'Admin User',
    adminEmail: `admin${Date.now()}@testadmin.com`,
    adminPassword: 'Test123!@#',
  });

  if (result.ok && result.data.token) {
    testData.companyAdminToken = result.data.token;
    testData.companyAdminUser = result.data.user;
    console.log(`   Token: ${result.data.token.substring(0, 20)}...`);
    console.log(`   User ID: ${result.data.user.id}`);
    console.log(`   Company ID: ${result.data.user.companyId}`);
  }

  return logTest('Register Company Admin', result);
}

async function testRegisterBidder() {
  console.log('\n📝 Testing: Register Bidder Company');
  const result = await apiRequest('POST', '/auth/register-company-admin', null, {
    companyName: 'Test Bidder Company',
    emailDomain: 'testbidder.com',
    industry: 'Construction',
    services: ['Construction Services'],
    adminName: 'Bidder User',
    adminEmail: `bidder${Date.now()}@testbidder.com`,
    adminPassword: 'Test123!@#',
  });

  if (result.ok && result.data.token) {
    testData.bidderToken = result.data.token;
    testData.bidderUser = result.data.user;
    console.log(`   Token: ${result.data.token.substring(0, 20)}...`);
    console.log(`   User ID: ${result.data.user.id}`);
  }

  return logTest('Register Bidder Company', result);
}

async function testLogin() {
  console.log('\n📝 Testing: Login');
  // We'll use the admin email we just created
  if (!testData.companyAdminUser) {
    console.log('   ⚠️  Skipping - no admin user created');
    return false;
  }

  const result = await apiRequest('POST', '/auth/login', null, {
    email: testData.companyAdminUser.email || 'admin@testadmin.com',
    password: 'Test123!@#',
  });

  if (result.ok) {
    testData.companyAdminToken = result.data.token;
  }

  return logTest('Login', result);
}

async function testGetMe() {
  console.log('\n📝 Testing: Get Current User');
  if (!testData.companyAdminToken) {
    console.log('   ⚠️  Skipping - no token available');
    return false;
  }

  const result = await apiRequest('GET', '/auth/me', testData.companyAdminToken);
  return logTest('Get Current User', result);
}

// ==================== TENDER TESTS ====================

async function testCreateTender() {
  console.log('\n📝 Testing: Create Tender');
  if (!testData.companyAdminToken) {
    console.log('   ⚠️  Skipping - no admin token available');
    return false;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const result = await apiRequest('POST', '/tenders', testData.companyAdminToken, {
    title: 'Test Tender - Software Development Project',
    description: 'This is a test tender for developing a web application. We need a team of experienced developers.',
    budgetMin: 50000,
    budgetMax: 100000,
    emdAmount: 5000,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    category: 'Software Development',
    tags: ['web-development', 'nodejs', 'react'],
    documents: [
      {
        url: 'https://example.com/doc1.pdf',
        name: 'Requirements Document',
        type: 'application/pdf',
      },
    ],
  });

  if (result.ok && result.data._id) {
    testData.createdTender = result.data;
    console.log(`   Tender ID: ${result.data._id}`);
    console.log(`   Status: ${result.data.status}`);
  }

  return logTest('Create Tender', result);
}

async function testGetMyCompanyTenders() {
  console.log('\n📝 Testing: Get My Company Tenders');
  if (!testData.companyAdminToken) {
    console.log('   ⚠️  Skipping - no admin token available');
    return false;
  }

  const result = await apiRequest('GET', '/tenders/my-company', testData.companyAdminToken);
  
  if (result.ok && Array.isArray(result.data)) {
    console.log(`   Found ${result.data.length} tenders`);
  }

  return logTest('Get My Company Tenders', result);
}

async function testGetTenderById() {
  console.log('\n📝 Testing: Get Tender By ID');
  if (!testData.companyAdminToken || !testData.createdTender) {
    console.log('   ⚠️  Skipping - no tender created');
    return false;
  }

  const result = await apiRequest('GET', `/tenders/${testData.createdTender._id}`, testData.companyAdminToken);
  
  if (result.ok) {
    console.log(`   Tender Title: ${result.data.title}`);
    console.log(`   Status: ${result.data.status}`);
  }

  return logTest('Get Tender By ID', result);
}

async function testPublishTender() {
  console.log('\n📝 Testing: Publish Tender');
  if (!testData.companyAdminToken || !testData.createdTender) {
    console.log('   ⚠️  Skipping - no tender created');
    return false;
  }

  const result = await apiRequest('PATCH', `/tenders/${testData.createdTender._id}/publish`, testData.companyAdminToken);

  if (result.ok) {
    testData.createdTender = result.data;
    console.log(`   New Status: ${result.data.status}`);
  }

  return logTest('Publish Tender', result);
}

async function testGetAvailableTenders() {
  console.log('\n📝 Testing: Get Available Tenders (Published)');
  if (!testData.bidderToken) {
    console.log('   ⚠️  Skipping - no bidder token available');
    return false;
  }

  const result = await apiRequest('GET', '/tenders/available', testData.bidderToken);
  
  if (result.ok && Array.isArray(result.data)) {
    console.log(`   Found ${result.data.length} published tenders`);
  }

  return logTest('Get Available Tenders', result);
}

// ==================== BID TESTS ====================

async function testCreateBid() {
  console.log('\n📝 Testing: Create Bid (Draft)');
  if (!testData.bidderToken || !testData.createdTender) {
    console.log('   ⚠️  Skipping - no bidder token or tender available');
    return false;
  }

  const validTill = new Date();
  validTill.setDate(validTill.getDate() + 60); // 60 days from now

  const result = await apiRequest('POST', '/bids', testData.bidderToken, {
    tenderId: testData.createdTender._id,
    amount: 75000,
    deliveryDays: 90,
    validTill: validTill.toISOString(),
    documents: [
      {
        url: 'https://example.com/bid-proposal.pdf',
        name: 'Bid Proposal',
        type: 'application/pdf',
      },
    ],
    notes: 'We have extensive experience in similar projects and can deliver on time.',
  });

  if (result.ok && result.data._id) {
    testData.createdBid = result.data;
    console.log(`   Bid ID: ${result.data._id}`);
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Amount: ${result.data.amount}`);
  }

  return logTest('Create Bid', result);
}

async function testUpdateBid() {
  console.log('\n📝 Testing: Update Bid');
  if (!testData.bidderToken || !testData.createdBid) {
    console.log('   ⚠️  Skipping - no bid created');
    return false;
  }

  const result = await apiRequest('PATCH', `/bids/${testData.createdBid._id}`, testData.bidderToken, {
    amount: 70000, // Updated amount
    deliveryDays: 85,
    notes: 'Updated: We can reduce the price and delivery time.',
  });

  if (result.ok) {
    testData.createdBid = result.data;
    console.log(`   Updated Amount: ${result.data.amount}`);
  }

  return logTest('Update Bid', result);
}

async function testSubmitBid() {
  console.log('\n📝 Testing: Submit Bid');
  if (!testData.bidderToken || !testData.createdBid) {
    console.log('   ⚠️  Skipping - no bid created');
    return false;
  }

  const result = await apiRequest('PATCH', `/bids/${testData.createdBid._id}/submit`, testData.bidderToken);

  if (result.ok) {
    testData.createdBid = result.data;
    console.log(`   New Status: ${result.data.status}`);
  }

  return logTest('Submit Bid', result);
}

async function testGetMyCompanyBids() {
  console.log('\n📝 Testing: Get My Company Bids');
  if (!testData.bidderToken) {
    console.log('   ⚠️  Skipping - no bidder token available');
    return false;
  }

  const result = await apiRequest('GET', '/bids/my-company', testData.bidderToken);
  
  if (result.ok && Array.isArray(result.data)) {
    console.log(`   Found ${result.data.length} bids`);
  }

  return logTest('Get My Company Bids', result);
}

async function testGetTenderBids() {
  console.log('\n📝 Testing: Get Tender Bids (Owner View)');
  if (!testData.companyAdminToken || !testData.createdTender) {
    console.log('   ⚠️  Skipping - no tender created');
    return false;
  }

  const result = await apiRequest('GET', `/bids/tender/${testData.createdTender._id}`, testData.companyAdminToken);
  
  if (result.ok && Array.isArray(result.data)) {
    console.log(`   Found ${result.data.length} bids for this tender`);
  }

  return logTest('Get Tender Bids', result);
}

async function testCloseTender() {
  console.log('\n📝 Testing: Close Tender');
  if (!testData.companyAdminToken || !testData.createdTender) {
    console.log('   ⚠️  Skipping - no tender created');
    return false;
  }

  const result = await apiRequest('PATCH', `/tenders/${testData.createdTender._id}/close`, testData.companyAdminToken);

  if (result.ok) {
    testData.createdTender = result.data;
    console.log(`   New Status: ${result.data.status}`);
  }

  return logTest('Close Tender', result);
}

async function testAwardTender() {
  console.log('\n📝 Testing: Award Tender');
  if (!testData.companyAdminToken || !testData.createdTender || !testData.createdBid) {
    console.log('   ⚠️  Skipping - no tender or bid available');
    return false;
  }

  const result = await apiRequest('PATCH', `/tenders/${testData.createdTender._id}/award`, testData.companyAdminToken, {
    winningBidId: testData.createdBid._id,
  });

  if (result.ok) {
    console.log(`   Tender Status: ${result.data.tender.status}`);
    console.log(`   Winning Bid Status: ${result.data.winningBid.status}`);
  }

  return logTest('Award Tender', result);
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('🚀 Starting API Tests for Tender and Bid APIs\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Authentication Tests
  console.log('='.repeat(60));
  console.log('AUTHENTICATION TESTS');
  console.log('='.repeat(60));
  
  const authTests = [
    testRegisterCompanyAdmin,
    testRegisterBidder,
    testLogin,
    testGetMe,
  ];

  for (const test of authTests) {
    const passed = await test();
    if (passed) results.passed++;
    else if (testData.companyAdminToken || testData.bidderToken) results.failed++;
    else results.skipped++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }

  // Tender Tests
  console.log('\n' + '='.repeat(60));
  console.log('TENDER TESTS');
  console.log('='.repeat(60));

  const tenderTests = [
    testCreateTender,
    testGetMyCompanyTenders,
    testGetTenderById,
    testPublishTender,
    testGetAvailableTenders,
  ];

  for (const test of tenderTests) {
    const passed = await test();
    if (passed) results.passed++;
    else results.failed++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Bid Tests
  console.log('\n' + '='.repeat(60));
  console.log('BID TESTS');
  console.log('='.repeat(60));

  const bidTests = [
    testCreateBid,
    testUpdateBid,
    testSubmitBid,
    testGetMyCompanyBids,
    testGetTenderBids,
  ];

  for (const test of bidTests) {
    const passed = await test();
    if (passed) results.passed++;
    else results.failed++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Tender Management Tests
  console.log('\n' + '='.repeat(60));
  console.log('TENDER MANAGEMENT TESTS');
  console.log('='.repeat(60));

  const managementTests = [
    testCloseTender,
    testAwardTender,
  ];

  for (const test of managementTests) {
    const passed = await test();
    if (passed) results.passed++;
    else results.failed++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);
  console.log(`📊 Total: ${results.passed + results.failed + results.skipped}`);
  console.log('='.repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch');
  console.error('   Run: npm install node-fetch@2');
  process.exit(1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal error running tests:', error);
  process.exit(1);
});
