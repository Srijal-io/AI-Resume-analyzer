import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateFormatAndChangeReport } from '../lib/pipeline/formatGenerate';

describe('Phase V2-4: Generate & Change Report Engine', () => {
  it('should accept verified rewrites and flag them in change report', () => {
    const bullets = [
      {
        id: 'b1',
        section: 'Experience',
        text: 'Maintained PostgreSQL databases and resolved performance bottlenecks.',
        candidateRewrite: 'Maintained and optimized PostgreSQL databases, resolving critical query bottlenecks.',
      },
    ];

    const result = generateFormatAndChangeReport(
      bullets,
      new Set(['PostgreSQL']),
      { b1: 'RESUME_EVIDENCE' }
    );

    assert.strictEqual(result.formattedBullets.length, 1);
    assert.strictEqual(result.changeReport.length, 1);
    assert.strictEqual(result.changeReport[0].verified, true);
  });

  it('should reject ungrounded metric smuggling and fall back to original text', () => {
    const bullets = [
      {
        id: 'b2',
        section: 'Experience',
        text: 'Wrote automated integration test suites for backend microservices.',
        candidateRewrite: 'Wrote automated test suites boosting deployment velocity by 85%.',
      },
    ];

    const result = generateFormatAndChangeReport(
      bullets,
      new Set(['Testing']),
      { b2: 'RESUME_EVIDENCE' }
    );

    // Because '85%' was not in source, it must fail verification and fall back to original
    assert.strictEqual(result.changeReport[0].verified, false);
    assert.strictEqual(result.changeReport[0].rewrittenText, bullets[0].text);
    assert.strictEqual(result.formattedBullets[0].text, bullets[0].text);
  });
});
