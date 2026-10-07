import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runFormatPreparePipeline } from '../lib/pipeline/formatPrepare';

describe('Phase V2-2: Prepare Pipeline Unit Tests', () => {
  const sampleResume = `
Jane Doe
jane.doe@example.com | San Francisco, CA

SUMMARY
Senior Software Engineer with 6 years of experience building web applications.

EXPERIENCE
Acme Corp — Senior Fullstack Engineer
2021 – Present
- Architected and built responsive React interfaces used by over 50,000 daily active users.
- Designed Node.js microservices with PostgreSQL and Redis caching.

Beta Systems — Software Developer
2018 – 2021
- Maintained REST APIs in Python using Flask and Docker containerization.

SKILLS
React, TypeScript, Node.js, Python, PostgreSQL, Docker, AWS
  `;

  const sampleJD = `
Job Title: Senior Backend Engineer
Requirements:
- 5+ years building scalable distributed systems in Node.js or Go
- Strong proficiency in PostgreSQL and database indexing
- Hands-on experience with Kubernetes and Terraform
- Familiarity with GraphQL APIs
  `;

  it('should run prepare pipeline and extract matched, missing, and partial requirements', async () => {
    const result = await runFormatPreparePipeline({
      resumeText: sampleResume,
      jobDescriptionText: sampleJD,
    });

    assert.ok(result.sessionId);
    assert.ok(result.matches.length > 0);
    assert.strictEqual(typeof result.stats.totalRequirements, 'number');

    // Node.js and PostgreSQL should match or have evidence
    const postgresMatch = result.matches.find(
      (m) => (m.requirement.normalizedSkill || m.requirement.text).toLowerCase().includes('postgres')
    );
    assert.ok(postgresMatch, 'Should detect PostgreSQL requirement');

    // Kubernetes was not in resume, so it must generate a confirmation question
    const k8sQuestion = result.questions.find(
      (q) => q.skillOrRequirementText.toLowerCase().includes('kubernetes')
    );
    assert.ok(k8sQuestion, 'Should produce a confirmation question for missing Kubernetes');
    assert.strictEqual(k8sQuestion.currentState, 'MISSING');
    assert.strictEqual(k8sQuestion.provenance, 'JD_ONLY');
  });

  it('should fail closed when given empty or minimal inputs', async () => {
    await assert.rejects(async () => {
      await runFormatPreparePipeline({
        resumeText: '',
        jobDescriptionText: '',
      });
    });
  });
});
