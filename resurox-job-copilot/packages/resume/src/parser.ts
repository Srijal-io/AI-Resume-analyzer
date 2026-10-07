import { ResumeProfile, EvidenceRecord } from "@resurox/schemas";
import { normalizeSkill, TECH_ALIAS_MAP } from "@resurox/matching";
import { randomUUID } from "node:crypto";

/**
 * Builds Srijal's baseline full-stack developer profile with verified verbatim evidence records.
 */
export function createSrijalProfile(): ResumeProfile {
  const rawText = `Srijal
Computer Science & Engineering, 3rd Year Undergrad
Target Role: Full Stack Developer
Email: srijal@example.edu | Phone: +91-9876543210 | Location: India
Links: github.com/srijal, linkedin.com/in/srijal

EDUCATION
Bachelor of Technology in Computer Science & Engineering (2024 - 2028)
Relevant Coursework: Data Structures & Algorithms, Database Systems, Web Architectures, Operating Systems

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
- Frameworks & Libraries: React, Next.js, Node.js, Express.js, Tailwind CSS
- Databases & Backend: PostgreSQL, Supabase, Prisma ORM, MongoDB, Redis
- Tools & Cloud: Git, GitHub, Docker, Linux, REST APIs

PROJECTS
1. E-Commerce Platform & Admin Dashboard
- Built a full-stack e-commerce marketplace using Next.js, TypeScript, and Supabase.
- Designed relational PostgreSQL schemas, implementing role-based access control and inventory webhooks.
- Optimized query latency by 35% through indexing and server-side cached API routes.

2. Real-Time Collaborative Canvas
- Developed an interactive collaborative whiteboard using React, Node.js, and WebSockets.
- Implemented optimistic UI updates and synchronized cursor positions with low latency.
- Containerized the microservices using Docker for streamlined local development.

EXPERIENCE / ACADEMIC PROJECTS
Full Stack Developer Mentee — Open Source & Project Practicum
- Architected RESTful endpoints in Node.js and Express.js with input validation.
- Integrated automated GitHub Actions CI/CD workflows for linting and unit testing.`;

  const profileId = "prof-srijal-v1";
  const evidenceRecords: EvidenceRecord[] = [];

  // Helper to extract verbatim span
  function addEvidence(
    claimText: string,
    canonical: string,
    claimType: "SKILL" | "PROJECT" | "EXPERIENCE" | "EDUCATION",
    contextType: "PROJECT_OR_EXPERIENCE" | "SKILL_LIST_ONLY"
  ) {
    const idx = rawText.indexOf(claimText);
    if (idx !== -1) {
      evidenceRecords.push({
        id: randomUUID(),
        profileId,
        claimType,
        claimText,
        canonicalSkill: canonical,
        sourceSpan: claimText,
        charStart: idx,
        charEnd: idx + claimText.length,
        contextType,
        state: "RESUME_EVIDENCE",
        createdAt: new Date().toISOString()
      });
    }
  }

  // Skills
  const skillsList = [
    "TypeScript", "JavaScript", "Python", "SQL", "React", "Next.js",
    "Node.js", "Express.js", "PostgreSQL", "Supabase", "Prisma ORM",
    "MongoDB", "Redis", "Docker", "Git", "Tailwind CSS", "REST APIs"
  ];

  for (const s of skillsList) {
    addEvidence(s, normalizeSkill(s), "SKILL", "SKILL_LIST_ONLY");
  }

  // Project evidence spans (higher context multiplier)
  addEvidence("Next.js, TypeScript, and Supabase", "Next.js", "PROJECT", "PROJECT_OR_EXPERIENCE");
  addEvidence("relational PostgreSQL schemas", "PostgreSQL", "PROJECT", "PROJECT_OR_EXPERIENCE");
  addEvidence("React, Node.js, and WebSockets", "React", "PROJECT", "PROJECT_OR_EXPERIENCE");
  addEvidence("Containerized the microservices using Docker", "Docker", "PROJECT", "PROJECT_OR_EXPERIENCE");
  addEvidence("Optimized query latency by 35%", "PostgreSQL", "PROJECT", "PROJECT_OR_EXPERIENCE");

  return {
    id: profileId,
    userId: "user-srijal",
    version: 1,
    candidateName: "Srijal",
    targetRole: "Full Stack Developer",
    email: "srijal@example.edu",
    phone: "+91-9876543210",
    location: "India",
    links: ["github.com/srijal", "linkedin.com/in/srijal"],
    summary: "3rd Year Computer Science Undergrad and Full Stack Developer proficient in modern TypeScript, React, Next.js, Node.js, and PostgreSQL architectures.",
    education: [
      {
        institution: "Institute of Technology",
        degree: "Bachelor of Technology in Computer Science & Engineering",
        graduationYear: "2028"
      }
    ],
    experience: [
      {
        company: "Open Source & Project Practicum",
        role: "Full Stack Developer Mentee",
        startDate: "2024",
        highlights: [
          "Architected RESTful endpoints in Node.js and Express.js with input validation.",
          "Integrated automated GitHub Actions CI/CD workflows for linting and unit testing."
        ]
      }
    ],
    projects: [
      {
        name: "E-Commerce Platform & Admin Dashboard",
        description: "Full-stack marketplace with real-time inventory management.",
        technologies: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "Tailwind CSS"],
        highlights: [
          "Built a full-stack e-commerce marketplace using Next.js, TypeScript, and Supabase.",
          "Designed relational PostgreSQL schemas with role-based access control.",
          "Optimized query latency by 35% through indexing and server-side caching."
        ]
      },
      {
        name: "Real-Time Collaborative Canvas",
        description: "Interactive multi-user whiteboard system.",
        technologies: ["React", "Node.js", "WebSockets", "Docker"],
        highlights: [
          "Developed an interactive collaborative whiteboard using React, Node.js, and WebSockets.",
          "Implemented optimistic UI updates and synchronized cursor positions.",
          "Containerized the microservices using Docker for streamlined local development."
        ]
      }
    ],
    skills: {
      "Languages": ["TypeScript", "JavaScript", "Python", "SQL", "HTML5", "CSS3"],
      "Frameworks": ["React", "Next.js", "Node.js", "Express.js", "Tailwind CSS"],
      "Databases": ["PostgreSQL", "Supabase", "Prisma ORM", "MongoDB", "Redis"],
      "Tools & DevOps": ["Git", "GitHub", "Docker", "Linux", "REST APIs"]
    },
    rawText,
    evidenceRecords,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
