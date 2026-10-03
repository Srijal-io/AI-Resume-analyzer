import { describe, it } from 'node:test';
import assert from 'node:assert';
import { esc, safeUrl } from '../lib/tailor/latex';
import { canon, findTerms } from '../lib/tailor/ontology';
import {
  verifyBullet,
  assertSkillsAllowed,
  assertCarryOver,
  assertNoStructuralDrift,
} from '../lib/tailor/verify';
import {
  CanonicalResume,
  assignDeterministicIds,
  CanonicalResumeType,
} from '../lib/tailor/schemas';

describe('Resurox Web Tailoring: W0 & W1 Deterministic Core', () => {
  // 1. LaTeX Escaping & Adversarial Strings
  describe('LaTeX esc() and safeUrl()', () => {
    it('should escape every special character properly', () => {
      const input = '50% & $100 #tag_name {nested} ~home ^caret \\backslash';
      const output = esc(input);
      assert.strictEqual(output.includes('\\%'), true);
      assert.strictEqual(output.includes('\\&'), true);
      assert.strictEqual(output.includes('\\$'), true);
      assert.strictEqual(output.includes('\\#'), true);
      assert.strictEqual(output.includes('\\_'), true);
      assert.strictEqual(output.includes('\\{'), true);
      assert.strictEqual(output.includes('\\}'), true);
      assert.strictEqual(output.includes('\\textasciitilde{}'), true);
      assert.strictEqual(output.includes('\\textasciicircum{}'), true);
      assert.strictEqual(output.includes('\\textbackslash{}'), true);
    });

    it('should neutralize adversarial injection payloads', () => {
      const malicious = '\\input{/etc/passwd} \\write18{rm -rf /} }\\end{document}';
      const safe = esc(malicious);
      assert.strictEqual(safe.includes('\\input'), false);
      assert.strictEqual(safe.includes('\\write18'), false);
      assert.strictEqual(safe.includes('\\end{document}'), false);
      assert.ok(safe.includes('\\textbackslash{}input'));
      assert.ok(safe.includes('\\textbackslash{}write18'));
    });

    it('should validate and sanitize URLs for safeUrl', () => {
      assert.strictEqual(safeUrl('https://github.com/johndoe/repo'), 'https://github.com/johndoe/repo');
      assert.strictEqual(safeUrl('javascript:alert(1)'), null);
      assert.strictEqual(safeUrl('data:text/html,malicious'), null);
      assert.strictEqual(safeUrl('https://example.com/page#anchor'), 'https://example.com/page\\#anchor');
    });
  });

  // 2. Ontology & findTerms
  describe('Skill Ontology', () => {
    it('should normalize skill aliases to canonical names', () => {
      assert.strictEqual(canon('postgres'), 'PostgreSQL');
      assert.strictEqual(canon('k8s'), 'Kubernetes');
      assert.strictEqual(canon('ts'), 'TypeScript');
      assert.strictEqual(canon('py'), 'Python');
      assert.strictEqual(canon('react.js'), 'React');
    });

    it('should deterministically extract 80+ common technical terms via findTerms', () => {
      const text = 'Built backend microservices using Node.js, Spring Boot, Docker, and PostgreSQL with Redis caching.';
      const terms = findTerms(text);
      assert.ok(terms.includes('Node.js'));
      assert.ok(terms.includes('Spring Boot'));
      assert.ok(terms.includes('Docker'));
      assert.ok(terms.includes('PostgreSQL'));
      assert.ok(terms.includes('Redis'));
      assert.strictEqual(terms.includes('Kubernetes'), false);
    });
  });

  // 3. Claim Verifier
  describe('Claim Verifier: verifyBullet()', () => {
    it('should accept faithful rewrites without unverified terms, scope, or numbers', () => {
      const result = verifyBullet({
        source: 'Maintained PostgreSQL databases and resolved performance bottlenecks.',
        output: 'Maintained and tuned PostgreSQL databases, resolving critical query bottlenecks.',
        allowedExtraTerms: [],
        allowedNumbers: [],
      });
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.reasons.length, 0);
    });

    it('should reject newly introduced technologies not confirmed for the item', () => {
      const result = verifyBullet({
        source: 'Maintained PostgreSQL databases and resolved bottlenecks.',
        output: 'Maintained PostgreSQL databases and deployed Redis caching clusters.',
        allowedExtraTerms: [],
        allowedNumbers: [],
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reasons.some(r => r.includes('new term: Redis')));
    });

    it('should reject ungrounded metric/number inflation', () => {
      const result = verifyBullet({
        source: 'Wrote unit test suites for frontend React components.',
        output: 'Wrote unit test suites for frontend React components increasing test coverage by 85%.',
        allowedExtraTerms: [],
        allowedNumbers: [],
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reasons.some(r => r.includes('new number: 85%')));
    });

    it('should allow numbers that the user explicitly supplied', () => {
      const result = verifyBullet({
        source: 'Wrote unit test suites for frontend React components.',
        output: 'Wrote unit test suites for frontend React components reaching 85% coverage.',
        allowedExtraTerms: [],
        allowedNumbers: ['85%'],
      });
      assert.strictEqual(result.ok, true);
    });

    it('should reject unearned seniority and scope words (led, architected, managed)', () => {
      const result = verifyBullet({
        source: 'Assisted team members in testing backend microservices.',
        output: 'Architected and spearheaded microservices testing strategy.',
        allowedExtraTerms: [],
        allowedNumbers: [],
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reasons.some(r => r.includes('new seniority word: architected')));
      assert.ok(result.reasons.some(r => r.includes('new seniority word: spearheaded')));
    });

    it('should reject banned fluff and absolute claims', () => {
      const result = verifyBullet({
        source: 'Developed customer facing web application in TypeScript.',
        output: 'Delivered world-class results-driven web application in TypeScript with zero flaws.',
        allowedExtraTerms: [],
        allowedNumbers: [],
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reasons.some(r => r.includes('unsupported claim')));
    });
  });

  // 4. Invariant Assertions
  describe('Invariant Assertions', () => {
    it('assertSkillsAllowed should reject skills outside original ∪ confirmed set', () => {
      const allowed = new Set(['TypeScript', 'Node.js', 'PostgreSQL']);
      const finalSkills = ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'];
      const check = assertSkillsAllowed(finalSkills, allowed);
      assert.strictEqual(check.ok, false);
      assert.deepStrictEqual(check.disallowed, ['AWS']);
    });

    it('assertCarryOver should catch dropped resume items', () => {
      const canonical: CanonicalResumeType = {
        basics: { name: 'Jane Doe', links: [] },
        education: [{ id: 'edu1', institution: 'State Univ', degree: 'BS CS' }],
        experience: [
          {
            id: 'exp1',
            org: 'Acme',
            title: 'Dev',
            bullets: [{ id: 'exp1.b1', text: 'Built APIs' }, { id: 'exp1.b2', text: 'Optimized DB' }],
          },
        ],
        projects: [],
        skills: [{ id: 's1', category: 'Tech', items: ['TypeScript'] }],
        certifications: [],
        achievements: [],
        other: [],
      };

      // Tailored resume accidentally dropped bullet exp1.b2
      const tailored: CanonicalResumeType = {
        ...canonical,
        experience: [
          {
            ...canonical.experience[0],
            bullets: [{ id: 'exp1.b1', text: 'Built APIs' }],
          },
        ],
      };

      const check = assertCarryOver(canonical, tailored);
      assert.strictEqual(check.ok, false);
      assert.ok(check.missingIds.includes('exp1.b2'));
    });

    it('assertNoStructuralDrift should detect unauthorized title/org modifications', () => {
      const canonical: CanonicalResumeType = {
        basics: { name: 'Jane Doe', links: [] },
        education: [{ id: 'edu1', institution: 'State Univ', degree: 'BS CS' }],
        experience: [
          {
            id: 'exp1',
            org: 'Acme',
            title: 'Junior Developer',
            bullets: [{ id: 'exp1.b1', text: 'Built APIs' }],
          },
        ],
        projects: [],
        skills: [],
        certifications: [],
        achievements: [],
        other: [],
      };

      const tailoredWithDrift: CanonicalResumeType = {
        ...canonical,
        experience: [
          {
            ...canonical.experience[0],
            title: 'Lead Architect', // Model attempted to drift the title
          },
        ],
      };

      const check = assertNoStructuralDrift(canonical, tailoredWithDrift);
      assert.strictEqual(check.ok, false);
      assert.ok(check.drifts.some(d => d.includes('Title changed')));
    });
  });

  // 5. Deterministic ID Assignment
  describe('Deterministic ID Assignment', () => {
    it('should assign stable IDs across all sections and bullets', () => {
      const raw: CanonicalResumeType = {
        basics: { name: 'Jane Doe', links: [] },
        education: [{ id: '', institution: 'MIT', degree: 'BS' }],
        experience: [
          {
            id: '',
            org: 'Company A',
            title: 'Engineer',
            bullets: [{ id: '', text: 'Item 1' }, { id: '', text: 'Item 2' }],
          },
        ],
        projects: [
          {
            id: '',
            name: 'Project Alpha',
            tech: ['React'],
            bullets: [{ id: '', text: 'Project item' }],
          },
        ],
        skills: [{ id: '', category: 'Languages', items: ['TypeScript'] }],
        certifications: [{ id: '', name: 'AWS Certified' }],
        achievements: [{ id: '', text: 'Top contributor' }],
        other: [{ id: '', heading: 'Languages', lines: [{ id: '', text: 'English (Fluent)' }] }],
      };

      const indexed = assignDeterministicIds(raw);
      assert.strictEqual(indexed.education[0].id, 'edu1');
      assert.strictEqual(indexed.experience[0].id, 'exp1');
      assert.strictEqual(indexed.experience[0].bullets[0].id, 'exp1.b1');
      assert.strictEqual(indexed.experience[0].bullets[1].id, 'exp1.b2');
      assert.strictEqual(indexed.projects[0].id, 'proj1');
      assert.strictEqual(indexed.projects[0].bullets[0].id, 'proj1.b1');
      assert.strictEqual(indexed.skills[0].id, 'skill1');
      assert.strictEqual(indexed.certifications[0].id, 'cert1');
      assert.strictEqual(indexed.achievements[0].id, 'ach1');
      assert.strictEqual(indexed.other[0].id, 'oth1');
      assert.strictEqual(indexed.other[0].lines[0].id, 'oth1.b1');
    });
  });
});
