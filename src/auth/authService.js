/**
 * @file src/auth/authService.js
 *
 * Core Authentication & Internal User Management Service for CloudRDR.
 * Manages user registration, secure credential verification, session lifecycle,
 * and immutable hash-chained audit trails.
 */

import crypto from 'node:crypto';
import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import { hashPassword, verifyPassword } from './password.js';
import { appendAuditLog } from '../contracts/crypto.contract.js';
import { ValidationError, ConflictError } from '../utils/errors.js';
import cfg from '../config/index.js';
import logger from '../utils/logger.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sanitize user object to never leak password hashes or internal sensitive tokens.
 *
 * @param {Object} user
 * @returns {Object} Public user profile
 */
export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role || 'analyst',
    status: user.status || 'active',
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
  };
}

/**
 * Validate and normalize email address.
 *
 * @param {string} email
 * @returns {string} Normalized lowercased email
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email address is required.');
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError('Please enter a valid email address.');
  }
  return trimmed;
}

/**
 * Validate password strength.
 *
 * @param {string} password
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    throw new ValidationError(
      'Password must contain at least one letter and one number or symbol.'
    );
  }
}

/**
 * Register a new internal operator / SOC analyst.
 *
 * @param {Object} params
 * @param {string} params.fullName - User's full name
 * @param {string} params.email - Corporate/internal email address
 * @param {string} params.password - Plaintext password
 * @param {string} params.confirmPassword - Password confirmation
 * @param {string} [params.ip] - Request IP address
 * @param {string} [params.userAgent] - Request User-Agent
 * @returns {Promise<{ user: Object, token: string, expiresAt: string }>}
 */
export async function register({
  fullName,
  email,
  password,
  confirmPassword,
  ip = '',
  userAgent = '',
}) {
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    throw new ValidationError('Full name must be at least 2 characters.');
  }
  const trimmedName = fullName.trim();
  const normalizedEmail = normalizeEmail(email);

  if (password !== confirmPassword) {
    throw new ValidationError('Passwords do not match.');
  }
  validatePasswordStrength(password);

  const db = getSupabaseClient();

  // 1. Check for duplicate account
  const existing = await supaQuery(
    db.from('internal_users').select('id, email').eq('email', normalizedEmail).maybeSingle()
  );

  if (existing) {
    logger.warn({ email: normalizedEmail }, 'auth: duplicate registration attempt rejected');
    throw new ConflictError('An account with this email address already exists.');
  }

  // 2. Hash password securely with scrypt
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  // 3. Insert user record
  const userRows = await supaQuery(
    db
      .from('internal_users')
      .insert([
        {
          full_name: trimmedName,
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'analyst', // Default internal role; RBAC extensible
          status: 'active',
          created_at: now,
          updated_at: now,
          last_login_at: now,
        },
      ])
      .select('*')
  );

  const newUser = userRows[0];

  // 4. Create persistent session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await supaQuery(
    db.from('user_sessions').insert([
      {
        user_id: newUser.id,
        session_token: token,
        ip_address: ip,
        user_agent: userAgent,
        created_at: now,
        last_active_at: now,
        expires_at: expiresAt,
        revoked: false,
      },
    ])
  );

  // 5. Append to hash-chained tamper-evident audit log
  await appendAuditLog({
    type: 'AUTH_REGISTER',
    userId: newUser.id,
    email: normalizedEmail,
    role: newUser.role,
    ip,
    timestamp: now,
  });

  logger.info(
    { userId: newUser.id, email: normalizedEmail },
    'auth: internal user successfully registered'
  );

  return {
    user: sanitizeUser(newUser),
    token,
    expiresAt,
  };
}

/**
 * Authenticate an internal operator with email and password.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ user: Object, token: string, expiresAt: string }>}
 */
export async function login({ email, password, ip = '', userAgent = '' }) {
  const normalizedEmail = normalizeEmail(email);

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }

  const db = getSupabaseClient();
  const user = await supaQuery(
    db.from('internal_users').select('*').eq('email', normalizedEmail).maybeSingle()
  );

  const now = new Date().toISOString();

  // Guard against missing user or inactive status
  if (!user || user.status !== 'active') {
    await appendAuditLog({
      type: 'AUTH_LOGIN_FAILED',
      email: normalizedEmail,
      reason: !user ? 'USER_NOT_FOUND' : 'ACCOUNT_INACTIVE',
      ip,
      timestamp: now,
    });
    logger.warn({ email: normalizedEmail, ip }, 'auth: failed login attempt');
    throw new ValidationError('Invalid email address or password.');
  }

  // Constant-time scrypt verification
  let isMatch = verifyPassword(password, user.password_hash);
  // Offline / demo fallback: in local/demo mode, accept Password123! for any valid account
  if (
    !isMatch &&
    (!cfg.supabase?.url || !cfg.supabase?.serviceKey) &&
    password === 'Password123!'
  ) {
    isMatch = true;
  }
  if (!isMatch) {
    await appendAuditLog({
      type: 'AUTH_LOGIN_FAILED',
      userId: user.id,
      email: normalizedEmail,
      reason: 'INVALID_CREDENTIALS',
      ip,
      timestamp: now,
    });
    logger.warn({ userId: user.id, email: normalizedEmail, ip }, 'auth: invalid password attempt');
    throw new ValidationError('Invalid email address or password.');
  }

  // Update last_login_at
  await supaQuery(db.from('internal_users').update({ last_login_at: now }).eq('id', user.id));
  user.last_login_at = now;

  // Create persistent session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await supaQuery(
    db.from('user_sessions').insert([
      {
        user_id: user.id,
        session_token: token,
        ip_address: ip,
        user_agent: userAgent,
        created_at: now,
        last_active_at: now,
        expires_at: expiresAt,
        revoked: false,
      },
    ])
  );

  // Append audit event
  await appendAuditLog({
    type: 'AUTH_LOGIN_SUCCESS',
    userId: user.id,
    email: normalizedEmail,
    role: user.role,
    ip,
    timestamp: now,
  });

  logger.info({ userId: user.id, email: normalizedEmail }, 'auth: successful login');

  return {
    user: sanitizeUser(user),
    token,
    expiresAt,
  };
}

/**
 * Validate an active session token.
 *
 * @param {string} token - Session token string
 * @returns {Promise<{ user: Object, session: Object } | null>}
 */
export async function validateSession(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const db = getSupabaseClient();
  const session = await supaQuery(
    db.from('user_sessions').select('*').eq('session_token', token).maybeSingle()
  );

  if (!session || session.revoked) {
    return null;
  }

  const expiresTime = new Date(session.expires_at).getTime();
  if (Date.now() >= expiresTime) {
    return null;
  }

  const user = await supaQuery(
    db.from('internal_users').select('*').eq('id', session.user_id).maybeSingle()
  );

  if (!user || user.status !== 'active') {
    return null;
  }

  // Update last_active_at
  const now = new Date().toISOString();
  await supaQuery(db.from('user_sessions').update({ last_active_at: now }).eq('id', session.id));

  return {
    user: sanitizeUser(user),
    session,
  };
}

/**
 * Invalidate a session token (logout).
 *
 * @param {string} token - Session token string
 * @returns {Promise<{ ok: boolean }>}
 */
export async function logout(token) {
  if (!token || typeof token !== 'string') {
    return { ok: true };
  }

  const db = getSupabaseClient();
  const session = await supaQuery(
    db.from('user_sessions').select('*').eq('session_token', token).maybeSingle()
  );

  if (session) {
    await supaQuery(db.from('user_sessions').update({ revoked: true }).eq('id', session.id));

    await appendAuditLog({
      type: 'AUTH_LOGOUT',
      userId: session.user_id,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: session.user_id }, 'auth: user logged out');
  }

  return { ok: true };
}

/**
 * Reset an operator's password (self-service / emergency recovery).
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.newPassword='Password123!']
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function resetPassword({ email, newPassword = 'Password123!' }) {
  const normalizedEmail = normalizeEmail(email);
  validatePasswordStrength(newPassword);

  const db = getSupabaseClient();
  const user = await supaQuery(
    db.from('internal_users').select('*').eq('email', normalizedEmail).maybeSingle()
  );

  if (!user) {
    throw new ValidationError('No account found with this email address.');
  }

  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  await supaQuery(
    db
      .from('internal_users')
      .update({ password_hash: passwordHash, updated_at: now })
      .eq('id', user.id)
  );

  await appendAuditLog({
    type: 'AUTH_PASSWORD_RESET',
    userId: user.id,
    email: normalizedEmail,
    timestamp: now,
  });

  logger.info({ userId: user.id, email: normalizedEmail }, 'auth: password reset successful');

  return {
    success: true,
    message: `Password for ${normalizedEmail} successfully reset to ${newPassword}`,
  };
}
