import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canEnterOutput, transitionProvenance } from '../lib/types/provenance';
import { verifyClaim, SourceBulletItem } from '../lib/matching/claimVerifier';

describe('V2-1 Domain Core: Provenance State Machine & Claim Verifier', () => {
  it('should enforce that AI_INFERRED, JD_ONLY, and REJECTED states cannot enter output', () => {
    assert.strictEqual(canEnterOutput('RESUME_EVIDENCE'), true);
    assert.strictEqual(canEnterOutput('USER_CONFIRMED_T1'), true);
    assert.strictEqual(canEnterOutput('USER_CONFIRMED_T2'), true);
    assert.strictEqual(canEnterOutput('USER_PROVIDED_ENTRY'), true);

    assert.strictEqual(canEnterOutput('AI_INFERRED'), false);
    assert.strictEqual(canEnterOutput('JD_ONLY'), false);
    assert.strictEqual(canEnterOutput('REJECTED'), false);
    assert.strictEqual(canEnterOutput('CONFLICT'), false);
  });

  it('should handle provenance state transitions deterministically', () => {
    assert.strictEqual(transitionProvenance('JD_ONLY', 'USER_CONFIRM_T1'), 'USER_CONFIRMED_T1');
    assert.strictEqual(transitionProvenance('JD_ONLY', 'USER_CONFIRM_T2'), 'USER_CONFIRMED_T2');
    assert.strictEqual(transitionProvenance('USER_CONFIRMED_T1', 'USER_REJECT'), 'REJECTED');
  });

  it('should catch unverified metric inflation in Claim Verifier', () => {
    const sourceBullet: SourceBulletItem = {
      id: 'b1',
      text: 'Built React dashboard for internal analytics',
      technologies: ['React'],
      numbers: [],
      dates: [],
    };

    const fabricatedRewrite = 'Built React dashboard improving throughput by 50%';
    const result = verifyClaim(fabricatedRewrite, sourceBullet, new Set(['React']), 'RESUME_EVIDENCE');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.violations.some((v) => v.includes("Unverified metric/number introduced: '50%'")), true);
    assert.strictEqual(result.fallbackText, sourceBullet.text);
  });

  it('should catch unverified scope inflation in Claim Verifier', () => {
    const sourceBullet: SourceBulletItem = {
      id: 'b2',
      text: 'Assisted team in migrating legacy node backend to TypeScript',
      technologies: ['Node.js', 'TypeScript'],
      numbers: [],
      dates: [],
    };

    const fabricatedRewrite = 'Spearheaded and architected migration of legacy backend';
    const result = verifyClaim(fabricatedRewrite, sourceBullet, new Set(['TypeScript']), 'RESUME_EVIDENCE');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.violations.some((v) => v.includes('spearheaded')), true);
  });

  it('should approve valid, grounded rewrites', () => {
    const sourceBullet: SourceBulletItem = {
      id: 'b3',
      text: 'Developed REST API endpoints handling 1000 requests per minute in Node.js',
      technologies: ['Node.js', 'REST'],
      numbers: ['1000'],
      dates: [],
    };

    const validRewrite = 'Engineered high-throughput REST API endpoints handling 1000 requests per minute using Node.js';
    const result = verifyClaim(validRewrite, sourceBullet, new Set(['Node.js']), 'RESUME_EVIDENCE');

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.violations.length, 0);
  });
});
