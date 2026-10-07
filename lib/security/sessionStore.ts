import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import { SecurityStore, getSecurityStore } from './store';
import { ProvenanceState } from '../types/provenance';
import { RequirementMatch } from '../types/matching';
import { ConfirmationQuestion } from '../matching/confirmation';

export interface UserConfirmationPayload {
  questionId: string;
  requirementId: string;
  confirmed: boolean;
  level?: 'Used' | 'Comfortable' | 'Familiar';
  context?: string;
  description?: string; // Tier 2 user-written context
}

export interface StoredSessionData {
  sessionId: string;
  createdAt: string;
  resumeText: string;
  jobDescriptionText: string;
  matches: RequirementMatch[];
  questions: ConfirmationQuestion[];
  confirmations: Record<string, UserConfirmationPayload & { provenance: ProvenanceState; confirmedAt: string }>;
}

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes per Decision D7
const SESSION_SECRET = process.env.SESSION_SECRET || 'resurox-v2-dev-session-secret-32-chars-ok';
const ENCRYPTION_KEY = Buffer.from(
  createHmac('sha256', SESSION_SECRET).update('session_encryption_v2').digest()
);

function encryptData(data: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptData(encryptedStr: string): string {
  const [ivHex, authTagHex, encryptedData] = encryptedStr.split(':');
  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error('Malformed encrypted session string');
  }
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Ephemeral Encrypted Session Store (Section 4.4, Decision D7, Gap G6).
 */
export class EphemeralSessionStore {
  private customStore?: SecurityStore;

  constructor(store?: SecurityStore) {
    this.customStore = store;
  }

  private getStore(): SecurityStore {
    return this.customStore || getSecurityStore();
  }

  async saveSession(session: StoredSessionData, ttlSeconds = SESSION_TTL_SECONDS): Promise<void> {
    const key = `session:${session.sessionId}`;
    const encrypted = encryptData(JSON.stringify(session));
    await this.getStore().set(key, encrypted, ttlSeconds);
  }

  async getSession(sessionId: string): Promise<StoredSessionData | null> {
    const key = `session:${sessionId}`;
    const encrypted = await this.getStore().get(key);
    if (!encrypted) return null;
    try {
      const decrypted = decryptData(encrypted);
      return JSON.parse(decrypted) as StoredSessionData;
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.getStore().del(key);
  }
}

export const ephemeralSessionStore = new EphemeralSessionStore();
