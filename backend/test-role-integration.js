// Complex role integration test script
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class ComplexRoleTest {
  constructor() {
    this.results = [];
    this.cookies = new Map();
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${status}] ${message}`;
    console.log(logEntry);
    this.results.push({ timestamp, status, message });
  }

  async makeRequest(method, endpoint, data = null, userEmail = null) {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (userEmail && this.cookies.has(userEmail)) {
      options.headers.Cookie = this.cookies.get(userEmail);
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // Store cookies for session management
      if (userEmail && response.headers.get('set-cookie')) {
        this.cookies.set(userEmail, response.headers.get('set-cookie'));
      }

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      this.log(`Request failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testLogin(email, password, expectedRole) {
    this.log(`🔐 Testing login for ${email} (expected role: ${expectedRole})`);
    
    try {
      const response = await this.makeRequest('POST', '/api/x7auth/session/login', {
        email,
        password
      }, email);

      if (response.status === 200) {
        this.log(`✅ Login successful for ${email}`, 'SUCCESS');
        this.log(`   Role: ${response.data.user?.role || 'Unknown'}`);
        this.log(`   Max Workers: ${response.data.user?.max_workers || 'Unknown'}`);
        return response.data.user;
      } else {
        this.log(`❌ Login failed for ${email}: ${JSON.stringify(response.data)}`, 'ERROR');
        return null;
      }
    } catch (error) {
      this.log(`❌ Login error for ${email}: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async testJobCreation(email, jobData, shouldSucceed = true) {
    const { prompts = [], maxWorkers = 1, ratio = "16:9", saveTarget = "browser" } = jobData;
    
    this.log(`🎬 Testing job creation for ${email} with ${maxWorkers} workers`);
    this.log(`   Prompts: ${prompts.length} prompts`);
    this.log(`   Expected result: ${shouldSucceed ? 'SUCCESS' : 'SHOULD FAIL'}`);

    try {
      const response = await this.makeRequest('POST', '/api/vdo/fabric/create', {
        prompts,
        maxWorkers,
        ratio,
        saveTarget
      }, email);

      if (response.status === 200 || response.status === 201) {
        if (shouldSucceed) {
          this.log(`✅ Job creation successful for ${email}`, 'SUCCESS');
          this.log(`   Job ID: ${response.data.jobId || 'Unknown'}`);
          this.log(`   Workers Allocated: ${response.data.workersAllocated || maxWorkers}`);
        } else {
          this.log(`❌ Job creation should have failed for ${email}`, 'ERROR');
        }
        return response.data;
      } else {
        if (!shouldSucceed) {
          this.log(`✅ Job creation correctly failed for ${email}`, 'SUCCESS');
          this.log(`   Error: ${response.data.error || JSON.stringify(response.data)}`);
        } else {
          this.log(`❌ Job creation failed for ${email}: ${response.data.error || JSON.stringify(response.data)}`, 'ERROR');
        }
        return null;
      }
    } catch (error) {
      this.log(`❌ Job creation error for ${email}: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async runComplexRoleIntegrationTests() {
    this.log('🚀 Starting Complex Role Integration Tests', 'START');
    this.log('=' .repeat(60));

    // Test users with different roles
    const testCases = [
      {
        email: 'free@test.com',
        password: 'password123',
        expectedRole: 'FREE',
        maxWorkers: 2,
        tests: [
          { prompts: ['Test prompt 1'], maxWorkers: 1, shouldSucceed: true },
          { prompts: ['Test prompt 1', 'Test prompt 2'], maxWorkers: 2, shouldSucceed: true },
          { prompts: ['Test prompt 1'], maxWorkers: 3, shouldSucceed: false }, // Exceeds FREE limit
        ]
      },
      {
        email: 'premium@test.com',
        password: 'password123',
        expectedRole: 'PREMIUM',
        maxWorkers: 5,
        tests: [
          { prompts: ['Test prompt 1'], maxWorkers: 1, shouldSucceed: true },
          { prompts: ['Test prompt 1', 'Test prompt 2', 'Test prompt 3'], maxWorkers: 5, shouldSucceed: true },
          { prompts: ['Test prompt 1'], maxWorkers: 6, shouldSucceed: false }, // Exceeds PREMIUM limit
        ]
      },
      {
        email: 'enterprise@test.com',
        password: 'password123',
        expectedRole: 'ENTERPRISE',
        maxWorkers: 50,
        tests: [
          { prompts: ['Test prompt 1'], maxWorkers: 10, shouldSucceed: true },
          { prompts: Array(20).fill('Test prompt'), maxWorkers: 50, shouldSucceed: true },
          { prompts: ['Test prompt 1'], maxWorkers: 51, shouldSucceed: false }, // Exceeds ENTERPRISE limit
        ]
      },
      {
        email: 'admin@test.com',
        password: 'password123',
        expectedRole: 'ADMIN',
        maxWorkers: 200,
        tests: [
          { prompts: ['Test prompt 1'], maxWorkers: 50, shouldSucceed: true },
          { prompts: Array(10).fill('Test prompt'), maxWorkers: 200, shouldSucceed: true },
        ]
      }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of testCases) {
      this.log('');
      this.log(`👤 Testing User: ${testCase.email}`, 'TEST_CATEGORY');
      this.log('-' .repeat(50));

      // Test login
      totalTests++;
      const user = await this.testLogin(testCase.email, testCase.password, testCase.expectedRole);
      if (user && user.role === testCase.expectedRole) {
        passedTests++;
      } else {
        failedTests++;
      }

      if (user) {
        // Test job creation scenarios
        for (let i = 0; i < testCase.tests.length; i++) {
          const test = testCase.tests[i];
          totalTests++;
          
          this.log(`\n📋 Test ${i + 1}/${testCase.tests.length}:`);
          const result = await this.testJobCreation(testCase.email, test, test.shouldSucceed);
          
          const actuallySucceeded = result !== null;
          if (actuallySucceeded === test.shouldSucceed) {
            passedTests++;
          } else {
            failedTests++;
          }

          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Test Summary
    this.log('');
    this.log('=' .repeat(60));
    this.log('🏁 COMPLEX ROLE INTEGRATION TEST SUMMARY', 'SUMMARY');
    this.log('=' .repeat(60));
    this.log(`📊 Total Tests: ${totalTests}`);
    this.log(`✅ Passed: ${passedTests}`);
    this.log(`❌ Failed: ${failedTests}`);
    this.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    if (failedTests === 0) {
      this.log('🎉 ALL TESTS PASSED! Role integration is working correctly!', 'SUCCESS');
    } else {
      this.log('⚠️  Some tests failed. Please review the output above.', 'WARNING');
    }

    // Specific test for the original issue
    this.log('');
    this.log('🎯 SPECIFIC TEST: Premium User with 5 Workers', 'SPECIAL_TEST');
    this.log('-' .repeat(50));
    
    const premiumTest = await this.testJobCreation('premium@test.com', {
      prompts: ['Premium test prompt 1', 'Premium test prompt 2'],
      maxWorkers: 5,
      ratio: '16:9',
      saveTarget: 'browser'
    }, true);

    if (premiumTest) {
      this.log('✅ ORIGINAL ISSUE FIXED: Premium users can now use 5 workers!', 'SUCCESS');
    } else {
      this.log('❌ ORIGINAL ISSUE PERSISTS: Premium users still cannot use 5 workers!', 'ERROR');
    }

    return { totalTests, passedTests, failedTests, successRate: (passedTests / totalTests) * 100 };
  }
}

// Run the comprehensive tests
async function runTests() {
  const tester = new ComplexRoleTest();
  
  try {
    const results = await tester.runComplexRoleIntegrationTests();
    process.exit(results.failedTests === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Start testing
runTests().catch(console.error);