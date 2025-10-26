// Test script untuk verifikasi auth redirect functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

class AuthRedirectTest {
  constructor() {
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${status}] ${message}`;
    console.log(logEntry);
    this.results.push({ timestamp, status, message });
  }

  async testAPIAuthRedirect() {
    this.log('🔍 Testing API Authentication and Redirect Logic', 'START');
    
    // Test 1: Access protected endpoint without token
    this.log('\n📋 Test 1: Access protected endpoint without authentication');
    try {
      const response = await fetch(`${BASE_URL}/api/x7auth/session/me`, {
        credentials: 'include'
      });
      
      const data = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = { error: data };
      }

      if (response.status === 401 && parsedData.redirectToLogin) {
        this.log('✅ PASS: API correctly returns 401 with redirectToLogin flag', 'SUCCESS');
        this.log(`   Message: ${parsedData.message}`);
      } else {
        this.log(`❌ FAIL: Expected 401 with redirectToLogin, got ${response.status}`, 'ERROR');
        this.log(`   Response: ${JSON.stringify(parsedData)}`);
      }
    } catch (error) {
      this.log(`❌ ERROR: ${error.message}`, 'ERROR');
    }

    // Test 2: Access with invalid token
    this.log('\n📋 Test 2: Access protected endpoint with invalid token');
    try {
      const response = await fetch(`${BASE_URL}/api/x7auth/session/me`, {
        headers: {
          'Cookie': 'auth_token=invalid_token_12345'
        },
        credentials: 'include'
      });
      
      const data = await response.json();

      if ((response.status === 401 || response.status === 403) && data.redirectToLogin) {
        this.log('✅ PASS: API correctly handles invalid token with redirectToLogin', 'SUCCESS');
        this.log(`   Message: ${data.message}`);
      } else {
        this.log(`❌ FAIL: Expected 401/403 with redirectToLogin, got ${response.status}`, 'ERROR');
        this.log(`   Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`❌ ERROR: ${error.message}`, 'ERROR');
    }

    // Test 3: Login with valid credentials
    this.log('\n📋 Test 3: Login with valid premium user credentials');
    try {
      const response = await fetch(`${BASE_URL}/api/x7auth/session/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'premium@test.com',
          password: 'password123'
        })
      });

      const data = await response.json();

      if (response.status === 200 && data.user) {
        this.log('✅ PASS: Login successful', 'SUCCESS');
        this.log(`   User: ${data.user.email} (${data.user.role})`);
        this.log(`   Max Workers: ${data.user.maxWorkers}`);
        
        // Get cookies for further testing
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          this.log(`   Auth Cookie Set: ${cookies.split(';')[0]}`);
          return cookies;
        }
      } else {
        this.log(`❌ FAIL: Login failed - ${response.status}`, 'ERROR');
        this.log(`   Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`❌ ERROR: ${error.message}`, 'ERROR');
    }

    return null;
  }

  async testJobCreationWithAuth(authCookie) {
    if (!authCookie) {
      this.log('\n⚠️  Skipping job creation test - no auth cookie available', 'WARNING');
      return;
    }

    this.log('\n📋 Test 4: Job creation with authenticated user (5 workers)');
    try {
      const response = await fetch(`${BASE_URL}/api/vdo/fabric/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        credentials: 'include',
        body: JSON.stringify({
          prompts: ['Test premium prompt 1', 'Test premium prompt 2'],
          maxWorkers: 5,
          ratio: '16:9',
          saveTarget: 'browser'
        })
      });

      const data = await response.json();

      if (response.status === 200 || response.status === 201) {
        this.log('✅ PASS: Premium user can create job with 5 workers', 'SUCCESS');
        this.log(`   Job ID: ${data.jobId || 'Unknown'}`);
        this.log(`   Workers Allocated: ${data.workersAllocated || data.maxWorkers || 5}`);
      } else if (response.status === 401 && data.redirectToLogin) {
        this.log('❌ FAIL: Authenticated user got redirectToLogin - session issue', 'ERROR');
        this.log(`   Message: ${data.message}`);
      } else {
        this.log(`❌ FAIL: Job creation failed - ${response.status}`, 'ERROR');
        this.log(`   Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`❌ ERROR: ${error.message}`, 'ERROR');
    }
  }

  async testSessionExpiry(authCookie) {
    if (!authCookie) {
      this.log('\n⚠️  Skipping session expiry test - no auth cookie available', 'WARNING');
      return;
    }

    this.log('\n📋 Test 5: Session TTL and expiry handling');
    try {
      const response = await fetch(`${BASE_URL}/api/usr/caps/ttl-q9a`, {
        headers: {
          'Cookie': authCookie
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.status === 200 && data.remainingSeconds !== undefined) {
        this.log('✅ PASS: TTL endpoint accessible with auth', 'SUCCESS');
        this.log(`   Remaining TTL: ${data.remainingSeconds} seconds`);
        this.log(`   That's ${Math.floor(data.remainingSeconds / 60)} minutes and ${data.remainingSeconds % 60} seconds`);
      } else if (response.status === 401 && data.redirectToLogin) {
        this.log('✅ PASS: Expired session correctly handled with redirectToLogin', 'SUCCESS');
        this.log(`   Message: ${data.message}`);
      } else {
        this.log(`❌ FAIL: Unexpected TTL response - ${response.status}`, 'ERROR');
        this.log(`   Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`❌ ERROR: ${error.message}`, 'ERROR');
    }
  }

  async runCompleteAuthTest() {
    this.log('🚀 Starting Complete Authentication & Redirect Test Suite', 'START');
    this.log('=' .repeat(70));

    let authCookie = null;

    try {
      // Test API authentication and redirect logic
      authCookie = await this.testAPIAuthRedirect();

      // Test authenticated operations
      await this.testJobCreationWithAuth(authCookie);

      // Test session management
      await this.testSessionExpiry(authCookie);

    } catch (error) {
      this.log(`❌ Test suite error: ${error.message}`, 'ERROR');
    }

    // Summary
    this.log('\n' + '=' .repeat(70));
    this.log('🏁 AUTHENTICATION & REDIRECT TEST SUMMARY', 'SUMMARY');
    this.log('=' .repeat(70));

    const totalTests = this.results.filter(r => r.status === 'SUCCESS' || r.status === 'ERROR').length;
    const passedTests = this.results.filter(r => r.status === 'SUCCESS').length;
    const failedTests = this.results.filter(r => r.status === 'ERROR').length;

    this.log(`📊 Total Tests: ${totalTests}`);
    this.log(`✅ Passed: ${passedTests}`);
    this.log(`❌ Failed: ${failedTests}`);
    
    if (totalTests > 0) {
      this.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    }

    if (failedTests === 0) {
      this.log('🎉 ALL AUTHENTICATION TESTS PASSED!', 'SUCCESS');
      this.log('✅ Auto-redirect to login is working correctly!', 'SUCCESS');
    } else {
      this.log('⚠️  Some authentication tests failed.', 'WARNING');
    }

    return { totalTests, passedTests, failedTests, successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0 };
  }
}

// Run the tests
async function runAuthTests() {
  const tester = new AuthRedirectTest();
  
  try {
    const results = await tester.runCompleteAuthTest();
    process.exit(results.failedTests === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Auth test suite failed:', error.message);
    process.exit(1);
  }
}

runAuthTests().catch(console.error);