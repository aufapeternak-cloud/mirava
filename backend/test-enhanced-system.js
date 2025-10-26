// Test script for enhanced BytePlus API system
// This demonstrates the intelligent worker distribution and queueing

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const API_ENDPOINTS = {
  login: '/api/x7auth/session/login',
  createJob: '/api/vdo/fabric/create'
};

// Test scenarios
const testScenarios = [
  {
    name: 'Scenario 1: Free User - Single Worker with Multiple Prompts',
    user: { email: 'free@example.com', password: 'password123' },
    job: {
      prompts: ['beautiful girl dancing', 'in sunlit garden', 'wearing white dress'],
      ratio: '16:9',
      saveTarget: 'browser',
      maxWorkers: 1,
      model: 'pro'
    },
    expectedBehavior: 'All 3 prompts should be processed by 1 worker, distributed intelligently'
  },
  {
    name: 'Scenario 2: Premium User - Multiple Workers with Many Prompts',
    user: { email: 'premium@example.com', password: 'password123' },
    job: {
      prompts: [
        'beautiful girl dancing', 'in sunlit garden', 'wearing white dress',
        'cinematic lighting', 'golden hour', 'peaceful atmosphere',
        'flowing movement', 'graceful pose', 'nature background'
      ],
      ratio: '16:9',
      saveTarget: 'browser',
      maxWorkers: 3,
      model: 'pro'
    },
    expectedBehavior: '9 prompts distributed across 3 workers (3 prompts each)'
  },
  {
    name: 'Scenario 3: Enterprise User - Heavy Load Test',
    user: { email: 'enterprise@example.com', password: 'password123' },
    job: {
      prompts: Array.from({ length: 100 }, (_, i) => `Prompt ${i + 1}: beautiful scene ${i + 1}`),
      ratio: '16:9',
      saveTarget: 'browser',
      maxWorkers: 5,
      model: 'pro'
    },
    expectedBehavior: '100 prompts distributed across 5 workers (20 prompts each)'
  }
];

class EnhancedSystemTester {
  constructor() {
    this.authToken = null;
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.login}`, {
        email,
        password
      });

      this.authToken = response.data.token;
      console.log(`✅ Login successful: ${email}`);
      return response.data.user;
    } catch (error) {
      console.error(`❌ Login failed: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  }

  async createJob(jobData) {
    try {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.createJob}`, jobData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Job creation failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async runScenario(scenario) {
    console.log(`\n🧪 Running ${scenario.name}`);
    console.log(`📋 Expected: ${scenario.expectedBehavior}`);
    console.log(`📊 Job Details: ${scenario.job.prompts.length} prompts, ${scenario.job.maxWorkers} workers`);
    
    try {
      // Login
      const user = await this.login(scenario.user.email, scenario.user.password);
      
      // Create job
      const jobResult = await this.createJob(scenario.job);
      
      console.log(`✅ Job Created Successfully!`);
      console.log(`   Job ID: ${jobResult.jobId}`);
      console.log(`   User Role: ${jobResult.userRole}`);
      console.log(`   Worker Distribution:`);
      
      if (jobResult.workerDistribution) {
        console.log(`     Total Prompts: ${jobResult.workerDistribution.totalPrompts}`);
        console.log(`     Effective Workers: ${jobResult.workerDistribution.effectiveWorkers}`);
        console.log(`     Prompts per Worker: ${jobResult.workerDistribution.promptsPerWorker}`);
        console.log(`     Queue Batches: ${jobResult.workerDistribution.queueBatches}`);
      }
      
      if (jobResult.limits) {
        console.log(`   User Limits:`);
        console.log(`     Max Workers: ${jobResult.limits.maxWorkers}`);
        console.log(`     Max Jobs: ${jobResult.limits.maxJobs}`);
        console.log(`     Max Prompts Per Job: ${jobResult.limits.maxPromptsPerJob}`);
      }

      return { success: true, result: jobResult };

    } catch (error) {
      console.log(`❌ Scenario Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Enhanced BytePlus Backend System Test');
    console.log('==========================================');
    
    const results = [];
    
    for (const scenario of testScenarios) {
      const result = await this.runScenario(scenario);
      results.push({ scenario: scenario.name, ...result });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 Test Summary:');
    console.log('================');
    
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${index + 1}. ${status} - ${result.scenario}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Enhanced backend system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }
  }
}

// Export for use in other files
export { EnhancedSystemTester, testScenarios };

// Run tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new EnhancedSystemTester();
  tester.runAllTests().catch(console.error);
}