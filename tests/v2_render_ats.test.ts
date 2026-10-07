import { describe, it } from 'node:test';
import assert from 'node:assert';
import { escapeLatex, generateAtsLatexDocument, validateAtsText } from '../lib/render/latex';

describe('Phase V2-5: LaTeX Render & ATS Document Generation', () => {
  it('should safely escape LaTeX injection payloads', () => {
    const maliciousPayload = '\\write18{rm -rf /} & % $ # _ { } ~ ^ \\input{/etc/passwd}';
    const escaped = escapeLatex(maliciousPayload);

    assert.strictEqual(escaped.includes('\\write18'), false);
    assert.strictEqual(escaped.includes('\\input'), false);
    assert.ok(escaped.includes('\\textbackslash{}write18'));
    assert.ok(escaped.includes('\\&'));
    assert.ok(escaped.includes('\\%'));
    assert.ok(escaped.includes('\\$'));
    assert.ok(escaped.includes('\\#'));
    assert.ok(escaped.includes('\\_'));
    assert.ok(escaped.includes('\\{'));
    assert.ok(escaped.includes('\\}'));
  });

  it('should generate valid ATS single-column document structure', () => {
    const doc = generateAtsLatexDocument('Jane Doe', 'jane@example.com | 555-0100', [
      {
        heading: 'Experience',
        bullets: ['Engineered scalable microservices in TypeScript.', 'Decreased p99 latency by 30%.'],
      },
      {
        heading: 'Skills',
        bullets: ['React, TypeScript, PostgreSQL, Docker'],
      },
    ]);

    assert.ok(doc.startsWith('\\documentclass'));
    assert.ok(doc.includes('Jane Doe'));
    assert.ok(doc.includes('Decreased p99 latency by 30\\%.'));
    assert.ok(doc.endsWith('\\end{document}\n'));
  });

  it('should validate ATS text safety', () => {
    const validText = 'Jane Doe. Senior Engineer with 5 years experience in distributed systems.';
    const validRes = validateAtsText(validText);
    assert.strictEqual(validRes.valid, true);

    const binaryText = 'Jane Doe \x00\x01 invalid unprintable characters';
    const binaryRes = validateAtsText(binaryText);
    assert.strictEqual(binaryRes.valid, false);
    assert.strictEqual(binaryRes.issues.length > 0, true);
  });
});
