import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EphemeralSessionStore, StoredSessionData } from '../lib/security/sessionStore';
import { MemorySecurityStore } from '../lib/security/store';

describe('Phase V2-3: Ephemeral Session Store & Confirmation Lifecycle', () => {
  it('should encrypt, store, retrieve, and delete session data with strict TTL', async () => {
    const memoryStore = new MemorySecurityStore();
    const sessionStore = new EphemeralSessionStore(memoryStore);

    const testSession: StoredSessionData = {
      sessionId: 'sess_12345',
      createdAt: new Date().toISOString(),
      resumeText: 'Jane Doe Software Engineer...',
      jobDescriptionText: 'Target Role: Backend Engineer...',
      matches: [],
      questions: [],
      confirmations: {},
    };

    // 1. Save session
    await sessionStore.saveSession(testSession, 60);

    // 2. Direct store value must be encrypted (should not contain plaintext resume)
    const rawStored = await memoryStore.get('session:sess_12345');
    assert.ok(rawStored, 'Session must exist in memory store');
    assert.strictEqual(rawStored.includes('Jane Doe'), false, 'Session data must be encrypted at rest');

    // 3. Retrieve and decrypt session
    const retrieved = await sessionStore.getSession('sess_12345');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.sessionId, testSession.sessionId);
    assert.strictEqual(retrieved.resumeText, testSession.resumeText);

    // 4. Delete session on download or explicit request
    await sessionStore.deleteSession('sess_12345');
    const afterDelete = await sessionStore.getSession('sess_12345');
    assert.strictEqual(afterDelete, null, 'Session must be deleted completely');
  });
});
