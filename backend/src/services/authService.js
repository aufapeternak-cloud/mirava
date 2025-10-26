import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authConfig, roleConfig } from '../config/auth.js';
import { userModel } from '../models/db.js';

export const authService = {
  async register(email, password, role = 'FREE') {
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const config = roleConfig[role];

    const result = await userModel.create(
      email,
      hashedPassword,
      role,
      config.maxWorkers,
      config.ttlSeconds
    );

    return {
      id: result.insertId.toString(),
      email,
      role,
      maxWorkers: config.maxWorkers,
      ttlSeconds: config.ttlSeconds
    };
  },

  async login(email, password) {
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update session start time
    await userModel.updateSessionStart(user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiry }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        maxWorkers: user.max_workers,
        ttlSeconds: user.ttl_seconds
      }
    };
  },

  getRemainingTTL(user) {
    const sessionStart = new Date(user.sessionStartedAt);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - sessionStart) / 1000);
    const remainingSeconds = Math.max(0, user.ttlSeconds - elapsedSeconds);

    return remainingSeconds;
  }
};
