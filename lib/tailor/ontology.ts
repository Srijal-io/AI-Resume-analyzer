/**
 * Skill Ontology & Technology Normalization Dictionary (Section 2, 4.3).
 * Contains 80+ common software engineering and technical terms,
 * normalization aliases, and deterministic findTerms() search.
 */

export const SKILL_ONTOLOGY: Record<string, { canonical: string; aliases: string[] }> = {
  // Languages
  typescript: { canonical: 'TypeScript', aliases: ['ts', 'typescript'] },
  javascript: { canonical: 'JavaScript', aliases: ['js', 'javascript', 'es6', 'es2020'] },
  python: { canonical: 'Python', aliases: ['python', 'py', 'python3'] },
  java: { canonical: 'Java', aliases: ['java', 'jdk', 'jre'] },
  cplusplus: { canonical: 'C++', aliases: ['c++', 'cpp'] },
  csharp: { canonical: 'C#', aliases: ['c#', 'csharp', '.net'] },
  go: { canonical: 'Go', aliases: ['go', 'golang'] },
  rust: { canonical: 'Rust', aliases: ['rust', 'rs'] },
  ruby: { canonical: 'Ruby', aliases: ['ruby', 'rails'] },
  php: { canonical: 'PHP', aliases: ['php', 'laravel'] },
  swift: { canonical: 'Swift', aliases: ['swift', 'swiftui'] },
  kotlin: { canonical: 'Kotlin', aliases: ['kotlin'] },
  sql: { canonical: 'SQL', aliases: ['sql', 't-sql', 'pl-sql'] },
  bash: { canonical: 'Bash', aliases: ['bash', 'sh', 'shell'] },
  scala: { canonical: 'Scala', aliases: ['scala'] },
  r: { canonical: 'R', aliases: ['r-lang', 'r language'] },

  // Frontend Frameworks & Libraries
  react: { canonical: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  nextjs: { canonical: 'Next.js', aliases: ['nextjs', 'next.js', 'next'] },
  vue: { canonical: 'Vue.js', aliases: ['vue', 'vuejs', 'vue.js'] },
  angular: { canonical: 'Angular', aliases: ['angular', 'angularjs', 'angular.io'] },
  svelte: { canonical: 'Svelte', aliases: ['svelte', 'sveltekit'] },
  tailwind: { canonical: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'] },
  redux: { canonical: 'Redux', aliases: ['redux', 'redux-toolkit', 'rtk'] },
  graphql: { canonical: 'GraphQL', aliases: ['graphql', 'apollo-client'] },

  // Backend Frameworks & Runtimes
  nodejs: { canonical: 'Node.js', aliases: ['node', 'nodejs', 'node.js'] },
  express: { canonical: 'Express', aliases: ['express', 'express.js', 'expressjs'] },
  fastapi: { canonical: 'FastAPI', aliases: ['fastapi', 'fast-api'] },
  django: { canonical: 'Django', aliases: ['django', 'django-rest-framework', 'drf'] },
  flask: { canonical: 'Flask', aliases: ['flask'] },
  springboot: { canonical: 'Spring Boot', aliases: ['spring boot', 'springboot', 'spring-boot', 'spring framework'] },
  nestjs: { canonical: 'NestJS', aliases: ['nestjs', 'nest.js'] },
  gin: { canonical: 'Gin', aliases: ['gin', 'gin-gonic'] },
  grpc: { canonical: 'gRPC', aliases: ['grpc'] },
  rest: { canonical: 'REST API', aliases: ['rest', 'restful', 'rest api', 'rest apis'] },

  // Databases & Stores
  postgresql: { canonical: 'PostgreSQL', aliases: ['postgres', 'postgresql', 'psql'] },
  mysql: { canonical: 'MySQL', aliases: ['mysql'] },
  mongodb: { canonical: 'MongoDB', aliases: ['mongo', 'mongodb'] },
  redis: { canonical: 'Redis', aliases: ['redis'] },
  sqlite: { canonical: 'SQLite', aliases: ['sqlite', 'sqlite3'] },
  dynamodb: { canonical: 'DynamoDB', aliases: ['dynamodb', 'dynamo'] },
  elasticsearch: { canonical: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search', 'elk'] },
  cassandra: { canonical: 'Cassandra', aliases: ['cassandra', 'apache cassandra'] },
  neo4j: { canonical: 'Neo4j', aliases: ['neo4j'] },
  prisma: { canonical: 'Prisma', aliases: ['prisma', 'prisma orm'] },

  // Cloud & DevOps & Infra
  docker: { canonical: 'Docker', aliases: ['docker', 'dockerfile', 'docker-compose'] },
  kubernetes: { canonical: 'Kubernetes', aliases: ['k8s', 'kubernetes'] },
  aws: { canonical: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
  gcp: { canonical: 'Google Cloud', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  azure: { canonical: 'Azure', aliases: ['azure', 'microsoft azure'] },
  terraform: { canonical: 'Terraform', aliases: ['terraform', 'tf'] },
  ansible: { canonical: 'Ansible', aliases: ['ansible'] },
  jenkins: { canonical: 'Jenkins', aliases: ['jenkins'] },
  githubactions: { canonical: 'GitHub Actions', aliases: ['github actions', 'gh actions'] },
  linux: { canonical: 'Linux', aliases: ['linux', 'ubuntu', 'debian', 'centos'] },
  nginx: { canonical: 'Nginx', aliases: ['nginx'] },
  cloudflare: { canonical: 'Cloudflare', aliases: ['cloudflare', 'workers'] },

  // Messaging & Streams
  kafka: { canonical: 'Kafka', aliases: ['kafka', 'apache kafka'] },
  rabbitmq: { canonical: 'RabbitMQ', aliases: ['rabbitmq', 'amqp'] },
  sqs: { canonical: 'AWS SQS', aliases: ['sqs', 'aws sqs'] },

  // Testing & Quality
  jest: { canonical: 'Jest', aliases: ['jest'] },
  cypress: { canonical: 'Cypress', aliases: ['cypress'] },
  playwright: { canonical: 'Playwright', aliases: ['playwright'] },
  vitest: { canonical: 'Vitest', aliases: ['vitest'] },
  mocha: { canonical: 'Mocha', aliases: ['mocha'] },
  pytest: { canonical: 'PyTest', aliases: ['pytest'] },

  // Tools & Version Control
  git: { canonical: 'Git', aliases: ['git', 'github', 'gitlab'] },
  jira: { canonical: 'Jira', aliases: ['jira'] },
  postman: { canonical: 'Postman', aliases: ['postman'] },
  webpack: { canonical: 'Webpack', aliases: ['webpack'] },
  vite: { canonical: 'Vite', aliases: ['vite'] },
  latex: { canonical: 'LaTeX', aliases: ['latex', 'tex'] },
};

// Map each alias to its canonical term
const ALIAS_LOOKUP = new Map<string, string>();
for (const entry of Object.values(SKILL_ONTOLOGY)) {
  for (const alias of entry.aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase(), entry.canonical);
  }
}

/**
 * Returns canonical representation of a technical term.
 */
export function canon(term: string): string {
  if (!term) return '';
  const lower = term.trim().toLowerCase();
  return ALIAS_LOOKUP.get(lower) || term.trim();
}

/**
 * Extracts recognized technical terms from text deterministically.
 */
export function findTerms(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const [alias, canonical] of ALIAS_LOOKUP.entries()) {
    // Word boundary matching accounting for special characters like C++, C#, .NET, and sentence-ending periods
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;()/\\[\\]:!?-])${escaped}(?=[\\s,;()/\\[\\]:!?-]|\\.(?:[\\s,;()/\\[\\]:!?-]|$)|$)`, 'i');
    if (regex.test(lower)) {
      found.add(canonical);
    }
  }

  return Array.from(found);
}
