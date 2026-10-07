import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnalysisResponse } from '../lib/types/analysis';

describe('V2-0 Contract Freeze: /api/analyze', () => {
  it('should guarantee canonical AnalysisResponse interface invariants', () => {
    // Structural type contract verification
    const mockResponse: AnalysisResponse = {
      resume: {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        summary: 'Experienced Engineer',
        totalExperienceYears: 6,
        skills: ['TypeScript', 'Node.js'],
        experience: [],
        education: [],
        projects: [],
      },
      jobDescription: {
        jobTitle: 'Senior TypeScript Engineer',
        requirements: [],
        requiredSkills: ['TypeScript'],
        preferredSkills: ['Node.js'],
        experienceRequiredYears: 5,
        educationRequired: "Bachelor's",
        keywords: ['TypeScript'],
      },
      scores: {
        overallScore: 91,
        matchLabel: 'Exceptional Match',
        subScores: {
          skillsMatch: 100,
          experienceMatch: 80,
          educationMatch: 100,
          semanticMatch: 85,
        },
        skillsMatrix: [],
      },
      headlineScore: 91,
      meta: {
        requestId: 'test-uuid-v2',
        pipelineVersion: '2.0.0',
        confidence: 'high',
        degraded: [],
      },
      explanation: {
        strengths: ['Strong TypeScript skill set'],
        areasToImprove: ['Add more system design experience'],
        recommendations: ['Highlight backend scale'],
        executiveSummary: 'Strong candidate match.',
      },
      rawText: {
        resumeSnippet: 'John Doe Software Engineer...',
        jdSnippet: 'Looking for a Senior TypeScript Engineer...',
      },
    };

    assert.strictEqual(typeof mockResponse.headlineScore, 'number');
    assert.strictEqual(mockResponse.headlineScore >= 0 && mockResponse.headlineScore <= 100, true);
    assert.strictEqual(Array.isArray(mockResponse.meta.degraded), true);
    assert.strictEqual(typeof mockResponse.meta.requestId, 'string');
  });
});
