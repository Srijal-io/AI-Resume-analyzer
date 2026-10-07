import { test, describe } from 'node:test';
import assert from 'node:assert';
import { compileCanonicalToLatex, compileCanonicalToPlainText, calculatePageBudget } from '../lib/tailor/render';
import { CanonicalResumeType } from '../lib/tailor/schemas';

describe('Tailor Phase W4: ATS Document Compiler & Page-Fit Budgeting', () => {
  const sampleResume: CanonicalResumeType = {
    basics: {
      name: 'Elena & Rostova #1',
      email: 'elena@example.com',
      phone: '+1 555-0199',
      location: 'Austin, TX',
      links: [
        { label: 'GitHub', url: 'https://github.com/elena/repo#main' },
        { label: 'XSS', url: 'javascript:alert(1)' },
      ],
    },
    summary: 'Experienced Backend Engineer working with 100% cloud systems & microservices.',
    education: [
      {
        id: 'edu1',
        institution: 'UT Austin & College of Engineering',
        degree: 'B.S.',
        field: 'Computer Science',
        start: '2016',
        end: '2020',
      },
    ],
    experience: [
      {
        id: 'exp1',
        org: 'CloudScale & Co.',
        title: 'Senior Software Engineer (Backend)',
        start: '2021',
        end: 'Present',
        location: 'Austin, TX',
        bullets: [
          {
            id: 'exp1.b1',
            text: 'Built high-throughput data processing pipelines using Go, Kafka & Docker, achieving 99.9% uptime.',
          },
          {
            id: 'exp1.b2',
            text: 'Reduced database queries by 45% using Redis caching and PostgreSQL indexing.',
          },
        ],
      },
    ],
    projects: [
      {
        id: 'proj1',
        name: 'KV Store _ Distributed',
        tech: ['Go', 'Raft'],
        link: 'https://github.com/elena/kv',
        bullets: [
          {
            id: 'proj1.b1',
            text: 'Implemented Raft distributed log consensus protocol.',
          },
        ],
      },
    ],
    skills: [
      {
        id: 'skill1',
        category: 'Languages & Frameworks',
        items: ['Go', 'Python', 'C++'],
      },
      {
        id: 'skill2',
        category: 'Cloud & Infrastructure',
        items: ['PostgreSQL', 'Docker', 'Kubernetes'],
      },
    ],
    certifications: [
      {
        id: 'cert1',
        name: 'AWS Solutions Architect & Associate',
        issuer: 'Amazon',
        date: '2022',
      },
    ],
    achievements: [],
    other: [],
  };

  test('should compile CanonicalResume into well-formed, escaped ATS LaTeX', () => {
    const latex = compileCanonicalToLatex(sampleResume);

    // Document structure
    assert.ok(latex.includes('\\documentclass['), 'Includes documentclass');
    assert.ok(latex.includes('\\begin{document}'), 'Includes begin document');
    assert.ok(latex.includes('\\end{document}'), 'Includes end document');

    // Escaped name and characters
    assert.ok(latex.includes('Elena \\& Rostova \\#1'), 'Escapes & and # in name');
    assert.ok(latex.includes('CloudScale \\& Co.'), 'Escapes & in org');
    assert.ok(latex.includes('100\\% cloud systems'), 'Escapes % in summary');
    assert.ok(latex.includes('KV Store \\_ Distributed'), 'Escapes _ in project name');

    // URLs: Safe URL should be present, javascript: URL rejected
    assert.ok(latex.includes('https://github.com/elena/repo\\#main'), 'Sanitizes GitHub link');
    assert.strictEqual(latex.includes('javascript:alert(1)'), false, 'Rejects javascript alert URL');

    // Section headings
    assert.ok(latex.includes('TECHNICAL SKILLS'));
    assert.ok(latex.includes('PROFESSIONAL EXPERIENCE'));
    assert.ok(latex.includes('PROJECTS'));
    assert.ok(latex.includes('EDUCATION'));
    assert.ok(latex.includes('CERTIFICATIONS'));
  });

  test('should compile CanonicalResume into clean ATS plaintext format', () => {
    const text = compileCanonicalToPlainText(sampleResume);

    assert.ok(text.includes('ELENA & ROSTOVA #1'));
    assert.ok(text.includes('TECHNICAL SKILLS'));
    assert.ok(text.includes('Languages & Frameworks: Go, Python, C++'));
    assert.ok(text.includes('CloudScale & Co.'));
    assert.ok(text.includes('• Built high-throughput data processing pipelines'));
    assert.ok(text.includes('AWS Solutions Architect & Associate'));
  });

  test('should calculate page budget and tighten spacing when content grows', () => {
    const shortBudget = calculatePageBudget(sampleResume);
    assert.strictEqual(shortBudget.recommendedPages, 1);
    assert.strictEqual(shortBudget.marginInches, 0.75);

    // Expand resume with 10 extra bullets to simulate long resume
    const longResume: CanonicalResumeType = JSON.parse(JSON.stringify(sampleResume));
    for (let i = 0; i < 15; i++) {
      longResume.experience[0].bullets.push({
        id: `extra.b${i}`,
        text: `Accomplished significant technical milestone number ${i} with cross-functional distributed teams across multiple engineering domains.`,
      });
    }

    const longBudget = calculatePageBudget(longResume);
    assert.ok(longBudget.estimatedLines > shortBudget.estimatedLines, 'Estimated lines increased');
    // Margins should tighten or recommended pages increase
    assert.ok(longBudget.marginInches < 0.75 || longBudget.recommendedPages === 2);
  });
});
