import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    req.validatedBody = value;
    next();
  };
};

// Enhanced validation for job creation with complex role-based limits
export const validateJobLimits = (req, res, next) => {
  try {
    const { prompts, maxWorkers } = req.validatedBody;
    const userRole = req.user.role || 'FREE';
    
    console.log(`🔍 Validation - Raw user role: "${userRole}"`);
    
    // Normalize role to lowercase for consistency with job service
    const normalizedRole = userRole.toLowerCase();
    
    console.log(`🔄 Validation - Normalized role: "${normalizedRole}"`);
    
    // Define complex dynamic limits based on user role (sync with jobService)
    const roleLimits = {
      free: { 
        maxPrompts: 5, 
        maxWorkers: 2, // Sync with auth config
        description: 'Free Plan',
        maxPromptLength: 200,
        allowedModels: ['lite']
      },
      premium: { 
        maxPrompts: 100, 
        maxWorkers: 5, // Sync with auth config  
        description: 'Premium Plan',
        maxPromptLength: 500,
        allowedModels: ['lite', 'pro']
      },
      enterprise: { 
        maxPrompts: 1000, 
        maxWorkers: 50,
        description: 'Enterprise Plan',
        maxPromptLength: 1000,
        allowedModels: ['lite', 'pro', 'ultra']
      },
      admin: { 
        maxPrompts: 9999, 
        maxWorkers: 200, // Sync with auth config
        description: 'Administrator',
        maxPromptLength: 2000,
        allowedModels: ['lite', 'pro', 'ultra', 'experimental']
      }
    };
    
    const limits = roleLimits[normalizedRole] || roleLimits.free;
    
    console.log(`📋 Validation limits for ${limits.description}:`, {
      maxPrompts: limits.maxPrompts,
      maxWorkers: limits.maxWorkers,
      requested: { prompts: prompts.length, workers: maxWorkers }
    });
    
    // Complex validation: Prompt count
    if (Array.isArray(prompts) && prompts.length > limits.maxPrompts) {
      console.log(`❌ Prompt limit exceeded: ${prompts.length} > ${limits.maxPrompts}`);
      return res.status(403).json({
        error: 'Prompts limit exceeded',
        message: `Your ${limits.description} allows maximum ${limits.maxPrompts} prompts per job. Submitted: ${prompts.length}`,
        userLimits: limits,
        upgrade: normalizedRole === 'free' ? 'Consider upgrading to Premium for more prompts' : null
      });
    }
    
    // Complex validation: Worker count
    if (maxWorkers > limits.maxWorkers) {
      console.log(`❌ Worker limit exceeded: ${maxWorkers} > ${limits.maxWorkers}`);
      return res.status(403).json({
        error: 'Workers limit exceeded', 
        message: `Your ${limits.description} allows maximum ${limits.maxWorkers} workers. Requested: ${maxWorkers}`,
        userLimits: limits,
        upgrade: normalizedRole === 'free' ? 'Consider upgrading to Premium for more workers' : null
      });
    }
    
    // Complex validation: Individual prompt length
    const invalidPrompts = [];
    if (Array.isArray(prompts)) {
      prompts.forEach((prompt, index) => {
        if (prompt.length > limits.maxPromptLength) {
          invalidPrompts.push({ index, length: prompt.length, maxAllowed: limits.maxPromptLength });
        }
      });
    }
    
    if (invalidPrompts.length > 0) {
      return res.status(400).json({
        error: 'Individual prompt length exceeded',
        message: `${invalidPrompts.length} prompts exceed the maximum length of ${limits.maxPromptLength} characters`,
        invalidPrompts: invalidPrompts,
        suggestion: 'Please shorten the highlighted prompts'
      });
    }
    
    // Complex validation: Combined prompt length  
    const totalPromptLength = Array.isArray(prompts) 
      ? prompts.join(' ').length 
      : prompts.length;
      
    const maxTotalLength = limits.maxPrompts * limits.maxPromptLength;
    
    if (totalPromptLength > maxTotalLength) {
      return res.status(400).json({
        error: 'Total prompt length exceeded',
        message: `Combined prompt text too long: ${totalPromptLength} chars (max: ${maxTotalLength})`,
        suggestion: 'Try shorter prompts or split into multiple jobs',
        breakdown: {
          currentLength: totalPromptLength,
          maxAllowed: maxTotalLength,
          averagePromptLength: Math.round(totalPromptLength / prompts.length)
        }
      });
    }
    
    // Complex validation: Model access (if model is specified)
    const { model } = req.validatedBody;
    if (model && !limits.allowedModels.includes(model)) {
      return res.status(403).json({
        error: 'Model access denied',
        message: `Your ${limits.description} does not have access to the '${model}' model`,
        allowedModels: limits.allowedModels,
        upgrade: normalizedRole !== 'admin' ? 'Upgrade your plan for access to advanced models' : null
      });
    }
    
    console.log(`✅ Complex validation passed for ${limits.description}:`);
    console.log(`   Prompts: ${prompts.length}/${limits.maxPrompts}`);
    console.log(`   Workers: ${maxWorkers}/${limits.maxWorkers}`);
    console.log(`   Total length: ${totalPromptLength}/${maxTotalLength} chars`);
    
    // Add validation results to request for use in job service
    req.validationResults = {
      normalizedRole,
      limits,
      totalPromptLength,
      averagePromptLength: Math.round(totalPromptLength / prompts.length)
    };
    
    next();
    
  } catch (error) {
    console.error('❌ Complex job validation error:', error.message);
    res.status(500).json({ error: 'Validation error', message: error.message });
  }
};

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('FREE', 'PREMIUM', 'ADMIN').default('FREE')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createJob: Joi.object({
    prompts: Joi.array().items(
      Joi.string().trim().min(1).max(500) // Each prompt max 500 chars
    ).min(1).max(9999).required(), // Support up to 9999 prompts for admin users
    ratio: Joi.string().valid('16:9', '9:16', '1:1', '4:5', 'custom').required(),
    customWidth: Joi.number().integer().min(1).max(7680).when('ratio', {
      is: 'custom',
      then: Joi.required()
    }),
    customHeight: Joi.number().integer().min(1).max(4320).when('ratio', {
      is: 'custom',
      then: Joi.required()
    }),
    saveTarget: Joi.string().valid('browser', 'google_drive').required(),
    maxWorkers: Joi.number().integer().min(1).max(999).required(), // Support up to 999 for admin users
    model: Joi.string().valid('mini', 'fast', 'lite', 'pro').optional()
  })
};
