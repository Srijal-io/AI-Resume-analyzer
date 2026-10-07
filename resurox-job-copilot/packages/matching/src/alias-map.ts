/**
 * Canonical Skill Normalization Map (v1.1.0)
 * Maps common abbreviations, syntax variants, and brand synonyms to canonical tokens.
 */
export const TECH_ALIAS_MAP: Record<string, string> = {
  // Languages
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "py": "Python",
  "python": "Python",
  "py3": "Python",
  "java": "Java",
  "c#": "C#",
  "csharp": "C#",
  "c++": "C++",
  "cpp": "C++",
  "golang": "Go",
  "go": "Go",
  "rb": "Ruby",
  "ruby": "Ruby",
  "rust": "Rust",
  "rs": "Rust",
  "php": "PHP",
  "sql": "SQL",

  // Frontend
  "react": "React",
  "react.js": "React",
  "reactjs": "React",
  "next": "Next.js",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "vue": "Vue.js",
  "vue.js": "Vue.js",
  "vuejs": "Vue.js",
  "nuxt": "Nuxt.js",
  "nuxt.js": "Nuxt.js",
  "angular": "Angular",
  "angularjs": "Angular",
  "svelte": "Svelte",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "bootstrap": "Bootstrap",
  "html": "HTML5",
  "html5": "HTML5",
  "css": "CSS3",
  "css3": "CSS3",

  // Backend & Runtime
  "node": "Node.js",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "express": "Express.js",
  "express.js": "Express.js",
  "expressjs": "Express.js",
  "nest": "NestJS",
  "nest.js": "NestJS",
  "nestjs": "NestJS",
  "fastapi": "FastAPI",
  "django": "Django",
  "flask": "Flask",
  "spring": "Spring Boot",
  "spring boot": "Spring Boot",
  "springboot": "Spring Boot",
  "asp.net": "ASP.NET",
  "aspnet": "ASP.NET",

  // Databases & Cache
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "psql": "PostgreSQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "mysql": "MySQL",
  "redis": "Redis",
  "sqlite": "SQLite",
  "sqlite3": "SQLite",
  "supabase": "Supabase",
  "prisma": "Prisma ORM",
  "drizzle": "Drizzle ORM",

  // Cloud & DevOps
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "Google Cloud",
  "google cloud": "Google Cloud",
  "azure": "Azure",
  "docker": "Docker",
  "k8s": "Kubernetes",
  "kubernetes": "Kubernetes",
  "git": "Git",
  "github": "GitHub",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "github actions": "GitHub Actions",
  "linux": "Linux"
};

export function normalizeSkill(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().toLowerCase();
  return TECH_ALIAS_MAP[cleaned] || (raw.charAt(0).toUpperCase() + raw.slice(1).trim());
}

export function areSkillsEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeSkill(a).toLowerCase() === normalizeSkill(b).toLowerCase();
}
