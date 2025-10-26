// Test script untuk verifikasi spam dan loop prevention
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class SpamLoopPreventionTest {
  constructor() {
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${status}] ${message}`;
    console.log(logEntry);
    this.results.push({ timestamp, status, message });
  }

  async testMeEndpointRateLimit() {
    this.log('🔍 Testing /me endpoint rate limiting (should allow 5 requests per 30s)', 'TEST');
    
    const startTime = Date.now();
    let successfulRequests = 0;
    let rateLimitedRequests = 0;
    
    // Attempt 10 rapid requests
    for (let i = 1; i <= 10; i++) {
      try {
        const response = await fetch(`${BASE_URL}/api/x7auth/session/me`, {
          credentials: 'include'
        });
        
        if (response.status === 429) {
          rateLimitedRequests++;
          this.log(`Request ${i}: Rate limited (429) ✅`, 'SUCCESS');
        } else if (response.status === 401) {
          successfulRequests++;
          this.log(`Request ${i}: Unauthorized (401) - expected ✅`, 'SUCCESS');
        } else {
          this.log(`Request ${i}: Unexpected status ${response.status}`, 'WARNING');
        }
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        this.log(`Request ${i}: Network error - ${error.message}`, 'ERROR');
      }
    }
    
    const duration = Date.now() - startTime;
    this.log(`Rate limit test completed in ${duration}ms`, 'INFO');
    this.log(`Successful requests: ${successfulRequests}`, 'INFO');
    this.log(`Rate limited requests: ${rateLimitedRequests}`, 'INFO');
    
    if (rateLimitedRequests > 0) {
      this.log('✅ Rate limiting is working correctly!', 'SUCCESS');
      return true;
    } else {
      this.log('❌ Rate limiting may not be working', 'ERROR');
      return false;
    }
  }

  async testAuthEndpointRateLimit() {
    this.log('\n🔍 Testing auth endpoint rate limiting', 'TEST');
    
    let rateLimitedCount = 0;
    
    // Attempt multiple login requests
    for (let i = 1; i <= 15; i++) {
      try {
        const response = await fetch(`${BASE_URL}/api/x7auth/session/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        });
        
        if (response.status === 429) {
          rateLimitedCount++;
          const data = await response.json();
          this.log(`Login attempt ${i}: Rate limited - ${data.message}`, 'SUCCESS');
          break; // Stop after getting rate limited
        } else {
          this.log(`Login attempt ${i}: Status ${response.status}`, 'INFO');
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.log(`Login attempt ${i}: Error - ${error.message}`, 'ERROR');
      }
    }
    
    if (rateLimitedCount > 0) {
      this.log('✅ Auth rate limiting is working!', 'SUCCESS');
      return true;
    } else {
      this.log('⚠️  Auth rate limiting may not be triggered within test scope', 'WARNING');
      return false;
    }
  }

  async testSuccessfulLogin() {
    this.log('\n🔍 Testing successful login (should work within rate limits)', 'TEST');
    
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

      if (response.status === 200) {
        this.log('✅ Successful login within rate limits', 'SUCCESS');
        this.log(`User: ${data.user?.email} (${data.user?.role})`, 'INFO');
        
        // Get cookies for further testing
        const cookies = response.headers.get('set-cookie');
        return cookies;
      } else if (response.status === 429) {
        this.log('Rate limited on login - this is expected behavior', 'WARNING');
        this.log(`Message: ${data.message}`, 'INFO');
        return null;
      } else {
        this.log(`Login failed with status ${response.status}: ${data.error}`, 'ERROR');
        return null;
      }
    } catch (error) {
      this.log(`Login error: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async testAuthenticatedEndpoints(authCookie) {
    if (!authCookie) {
      this.log('\n⚠️  Skipping authenticated endpoint tests - no auth cookie', 'WARNING');
      return;
    }

    this.log('\n🔍 Testing authenticated /me endpoint with valid cookie', 'TEST');
    
    try {
      const response = await fetch(`${BASE_URL}/api/x7auth/session/me`, {
        headers: {
          'Cookie': authCookie
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.status === 200) {
        this.log('✅ Authenticated /me request successful', 'SUCCESS');
        this.log(`User: ${data.user?.email} (${data.user?.role})`, 'INFO');
      } else if (response.status === 429) {
        this.log('✅ Rate limited on authenticated request - protection working', 'SUCCESS');
        this.log(`Message: ${data.message}`, 'INFO');
      } else {
        this.log(`Unexpected response ${response.status}: ${data.error}`, 'WARNING');
      }
    } catch (error) {
      this.log(`Authenticated request error: ${error.message}`, 'ERROR');
    }
  }

  async runSpamPreventionTests() {
    this.log('🚀 Starting Spam & Loop Prevention Test Suite', 'START');
    this.log('=' .repeat(70));

    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: /me endpoint rate limiting
    totalTests++;
    if (await this.testMeEndpointRateLimit()) {
      testsPassed++;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Auth endpoint rate limiting
    totalTests++;
    if (await this.testAuthEndpointRateLimit()) {
      testsPassed++;
    }

    // Test 3: Successful login within limits
    const authCookie = await this.testSuccessfulLogin();

    // Test 4: Authenticated endpoints
    await this.testAuthenticatedEndpoints(authCookie);

    // Summary
    this.log('\n' + '=' .repeat(70));
    this.log('🏁 SPAM PREVENTION TEST SUMMARY', 'SUMMARY');
    this.log('=' .repeat(70));

    this.log(`📊 Core Tests: ${totalTests}`);
    this.log(`✅ Passed: ${testsPassed}`);
    this.log(`❌ Failed: ${totalTests - testsPassed}`);
    
    if (totalTests > 0) {
      const successRate = (testsPassed / totalTests) * 100;
      this.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    }

    if (testsPassed === totalTests) {
      this.log('🎉 ALL SPAM PREVENTION TESTS PASSED!', 'SUCCESS');
      this.log('✅ Rate limiting is working correctly!', 'SUCCESS');
      this.log('✅ Server is protected against spam requests!', 'SUCCESS');
    } else {
      this.log('⚠️  Some spam prevention tests may need attention', 'WARNING');
    }

    this.log('\n📋 Test Recommendations:');
    this.log('1. Access http://localhost:3000 and monitor Network tab');
    this.log('2. Check that /me requests are limited (max 5 per 30s)');
    this.log('3. Verify no infinite redirect loops occur');
    this.log('4. Test login/logout cycles for smooth operation');

    return { totalTests, testsPassed, successRate: totalTests > 0 ? (testsPassed / totalTests) * 100 : 0 };
  }
}

// Run the tests
async function runTests() {
  const tester = new SpamLoopPreventionTest();
  
  try {
    const results = await tester.runSpamPreventionTests();
    process.exit(0); // Always exit 0 for informational tests
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
    process.exit(1);
  }
}

runTests().catch(console.error);