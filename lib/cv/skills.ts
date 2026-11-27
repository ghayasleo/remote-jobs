// Skills, tools and methods that job postings name, with the other ways people
// write them. One line each: "Canonical|alias|alias". A leading "!" marks a
// name that's also an everyday word (Go, Swift, Spark), matched only when
// written with its capital letter.

const SKILL_LINES = `
JavaScript|js|ecmascript
TypeScript|ts
Python
Java
!Go|golang
Rust
Ruby
Ruby on Rails|rails|ror
PHP
Laravel
Symfony
C++|cpp
C#|csharp
.NET|dotnet|asp.net|.net core
Kotlin
!Swift
Objective-C|objc
Scala
Elixir
Erlang
Haskell
Clojure
Perl
Dart
Lua
Bash|shell scripting|shell
PowerShell
SQL
NoSQL
GraphQL
!REST|restful|rest api|rest apis
gRPC
WebSockets|websocket
HTML|html5
CSS|css3
Sass|scss
Tailwind CSS|tailwind|tailwindcss
React|react.js|reactjs
React Native
Next.js|nextjs
Vue|vue.js|vuejs
Nuxt|nuxt.js
Angular|angularjs
Svelte|sveltekit
Redux
jQuery
Node.js|node|nodejs
!Express|express.js
NestJS|nest.js
Deno
Bun
Django
Flask
FastAPI
!Spring|spring boot
Hibernate
Flutter
iOS
Android
SwiftUI
Jetpack Compose
Electron
Webpack
Vite
Storybook
Jest
Vitest
Cypress
Playwright
Selenium
JUnit
pytest
PostgreSQL|postgres|psql
MySQL
MariaDB
SQLite
MongoDB|mongo
Redis
Elasticsearch|elastic search|opensearch
Cassandra
DynamoDB
Snowflake
BigQuery
Redshift
ClickHouse
Kafka|apache kafka
RabbitMQ
!Spark|apache spark|pyspark
Hadoop
Airflow|apache airflow
dbt
Databricks
Pandas
NumPy
scikit-learn|sklearn
TensorFlow
PyTorch
Keras
Hugging Face|huggingface
LangChain
LLMs|llm|large language models
Machine learning|ml
Deep learning
NLP|natural language processing
Computer vision
Data science
Data engineering
Data analysis|data analytics
Statistics
ETL|elt
Tableau
Looker
Power BI|powerbi
Metabase
!Excel|microsoft excel
Google Sheets
AWS|amazon web services
GCP|google cloud|google cloud platform
Azure|microsoft azure
Docker|containers
Kubernetes|k8s
!Helm
Terraform
Pulumi
Ansible
Chef
Puppet
CloudFormation
Serverless
Lambda|aws lambda
Linux
Unix
Nginx
CI/CD|ci cd|continuous integration|continuous delivery|continuous deployment
GitHub Actions
GitLab CI
Jenkins
CircleCI
Git
Prometheus
Grafana
Datadog
Sentry
New Relic
Observability
Microservices
Distributed systems
System design
Event-driven|event driven
Domain-driven design|ddd
Test-driven development|tdd
Security|cybersecurity|information security
Penetration testing|pentesting|pen testing
OWASP
SOC 2|soc2
ISO 27001
IAM
OAuth|oauth2
SSO
Networking|tcp/ip
Accessibility|a11y|wcag
Performance optimization|web performance
SEO|search engine optimization
SEM|search engine marketing
Google Analytics|ga4
Google Ads
Content marketing
Email marketing
Marketing automation
Product marketing
Copywriting
Salesforce
HubSpot
Marketo
Outreach
Gong
CRM
B2B
SaaS
Enterprise sales
Account management
Lead generation
Cold outreach|cold calling
Negotiation
Zendesk
Intercom
Customer success
Technical support
Figma
Sketch
Adobe XD
Photoshop|adobe photoshop
Illustrator|adobe illustrator
After Effects
Prototyping
Wireframing|wireframes
User research|ux research
Usability testing
!Design systems
Interaction design
Visual design
UX|user experience
UI|user interface
Product management
Product strategy
Roadmapping|roadmaps|roadmap
A/B testing|ab testing|experimentation
Agile
Scrum
Kanban
Jira
Confluence
!Notion
Stakeholder management
Project management
Program management
Technical writing|documentation
API design
Open source
Mentoring|mentorship
People management
Payments
Fintech
Blockchain
Web3
Solidity
Ethereum
Crypto|cryptocurrency
E-commerce|ecommerce
Shopify
WordPress
Embedded systems|embedded
Firmware
FPGA
!Unity
Unreal Engine|unreal
Game development
QA|quality assurance
Test automation|automated testing
Manual testing
SAP
NetSuite
QuickBooks
Accounting
Financial modeling|financial modelling
GAAP
Payroll
Recruitment|recruiting
Spanish
French
German
Portuguese
`;

export type Skill = { name: string; patterns: RegExp[] };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A skill name is a whole "word": not part of a longer word, and not followed
// by more word characters ("Go" in "Google" or "Gopher" doesn't count).
function pattern(alias: string, caseSensitive: boolean) {
  return new RegExp(`(?<![A-Za-z0-9+#.])${escape(alias).replace(/\\ /g, "[\\s-]+")}(?![A-Za-z0-9+#]|\\.[A-Za-z])`, caseSensitive ? "" : "i");
}

export const SKILLS: Skill[] = SKILL_LINES.trim()
  .split("\n")
  .map((line) => {
    const caseSensitive = line.startsWith("!");
    const [name, ...aliases] = line.replace(/^!/, "").split("|");
    return {
      name,
      patterns: [pattern(name, caseSensitive), ...aliases.map((alias) => pattern(alias, false))],
    };
  });

/** Skills named in a text, with how often each appears, most mentioned first. */
export function findSkills(text: string): { name: string; count: number }[] {
  const found: { name: string; count: number }[] = [];
  for (const skill of SKILLS) {
    let count = 0;
    for (const regex of skill.patterns) {
      const global = new RegExp(regex.source, `${regex.flags}g`);
      count += text.match(global)?.length ?? 0;
    }
    if (count > 0) found.push({ name: skill.name, count });
  }
  return found.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
