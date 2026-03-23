// Onboarding form dropdown options and constants

export const DEPARTMENTS = [
  // Engineering
  { value: 'software-engineering', label: 'Software Engineering', category: 'Engineering' },
  { value: 'frontend-engineering', label: 'Frontend Engineering', category: 'Engineering' },
  { value: 'backend-engineering', label: 'Backend Engineering', category: 'Engineering' },
  { value: 'full-stack-engineering', label: 'Full Stack Engineering', category: 'Engineering' },
  { value: 'mobile-engineering', label: 'Mobile Engineering', category: 'Engineering' },
  { value: 'devops-engineering', label: 'DevOps Engineering', category: 'Engineering' },
  { value: 'site-reliability-engineering', label: 'Site Reliability Engineering (SRE)', category: 'Engineering' },
  { value: 'qa-engineering', label: 'QA Engineering', category: 'Engineering' },
  { value: 'test-automation', label: 'Test Automation', category: 'Engineering' },
  { value: 'security-engineering', label: 'Security Engineering', category: 'Engineering' },
  { value: 'data-engineering', label: 'Data Engineering', category: 'Engineering' },
  { value: 'ml-engineering', label: 'Machine Learning Engineering', category: 'Engineering' },
  { value: 'ai-research', label: 'AI Research', category: 'Engineering' },
  { value: 'hardware-engineering', label: 'Hardware Engineering', category: 'Engineering' },
  { value: 'embedded-systems', label: 'Embedded Systems', category: 'Engineering' },
  { value: 'cloud-engineering', label: 'Cloud Engineering', category: 'Engineering' },
  { value: 'platform-engineering', label: 'Platform Engineering', category: 'Engineering' },
  { value: 'infrastructure', label: 'Infrastructure', category: 'Engineering' },
  
  // Product
  { value: 'product-management', label: 'Product Management', category: 'Product' },
  { value: 'technical-product-management', label: 'Technical Product Management', category: 'Product' },
  { value: 'product-design', label: 'Product Design', category: 'Product' },
  { value: 'ux-research', label: 'UX Research', category: 'Product' },
  { value: 'product-analytics', label: 'Product Analytics', category: 'Product' },
  { value: 'product-marketing', label: 'Product Marketing', category: 'Product' },
  { value: 'product-operations', label: 'Product Operations', category: 'Product' },
  
  // Design
  { value: 'ui-design', label: 'UI Design', category: 'Design' },
  { value: 'ux-design', label: 'UX Design', category: 'Design' },
  { value: 'graphic-design', label: 'Graphic Design', category: 'Design' },
  { value: 'brand-design', label: 'Brand Design', category: 'Design' },
  { value: 'motion-design', label: 'Motion Design', category: 'Design' },
  { value: 'visual-design', label: 'Visual Design', category: 'Design' },
  { value: 'interaction-design', label: 'Interaction Design', category: 'Design' },
  { value: 'design-systems', label: 'Design Systems', category: 'Design' },
  
  // Data
  { value: 'data-science', label: 'Data Science', category: 'Data' },
  { value: 'data-analytics', label: 'Data Analytics', category: 'Data' },
  { value: 'business-intelligence', label: 'Business Intelligence', category: 'Data' },
  { value: 'data-visualization', label: 'Data Visualization', category: 'Data' },
  
  // Business
  { value: 'sales', label: 'Sales', category: 'Business' },
  { value: 'business-development', label: 'Business Development', category: 'Business' },
  { value: 'account-management', label: 'Account Management', category: 'Business' },
  { value: 'customer-success', label: 'Customer Success', category: 'Business' },
  { value: 'marketing', label: 'Marketing', category: 'Business' },
  { value: 'digital-marketing', label: 'Digital Marketing', category: 'Business' },
  { value: 'content-marketing', label: 'Content Marketing', category: 'Business' },
  { value: 'growth-marketing', label: 'Growth Marketing', category: 'Business' },
  { value: 'performance-marketing', label: 'Performance Marketing', category: 'Business' },
  { value: 'finance', label: 'Finance', category: 'Business' },
  { value: 'accounting', label: 'Accounting', category: 'Business' },
  { value: 'financial-planning', label: 'Financial Planning & Analysis', category: 'Business' },
  { value: 'operations', label: 'Operations', category: 'Business' },
  { value: 'supply-chain', label: 'Supply Chain', category: 'Business' },
  { value: 'logistics', label: 'Logistics', category: 'Business' },
  { value: 'human-resources', label: 'Human Resources', category: 'Business' },
  { value: 'recruiting', label: 'Recruiting', category: 'Business' },
  { value: 'talent-acquisition', label: 'Talent Acquisition', category: 'Business' },
  { value: 'legal', label: 'Legal', category: 'Business' },
  { value: 'compliance', label: 'Compliance', category: 'Business' },
  { value: 'corporate-strategy', label: 'Corporate Strategy', category: 'Business' },
  { value: 'partnerships', label: 'Partnerships', category: 'Business' },
  
  // Support & Services
  { value: 'customer-support', label: 'Customer Support', category: 'Support' },
  { value: 'technical-support', label: 'Technical Support', category: 'Support' },
  { value: 'it-support', label: 'IT Support', category: 'Support' },
  { value: 'professional-services', label: 'Professional Services', category: 'Support' },
  
  // Other
  { value: 'other', label: 'Other', category: 'Other' }
] as const;

export const SENIORITY_LEVELS = [
  { value: 'intern', label: 'Intern' },
  { value: 'entry-level', label: 'Entry Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid-level', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'senior-staff', label: 'Senior Staff' },
  { value: 'principal', label: 'Principal' },
  { value: 'senior-principal', label: 'Senior Principal' },
  { value: 'distinguished', label: 'Distinguished' },
  { value: 'fellow', label: 'Fellow' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior-manager', label: 'Senior Manager' },
  { value: 'director', label: 'Director' },
  { value: 'senior-director', label: 'Senior Director' },
  { value: 'vp', label: 'Vice President' },
  { value: 'svp', label: 'Senior Vice President' },
  { value: 'evp', label: 'Executive Vice President' },
  { value: 'c-level', label: 'C-Level (CTO, CEO, etc.)' }
] as const;

export const SKILLS_DATABASE = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Haskell', 'Elixir', 'Clojure', 'Dart',
  'Objective-C', 'Shell Scripting', 'Bash', 'PowerShell', 'SQL', 'PL/SQL', 'T-SQL',
  
  // Frontend Frameworks & Libraries
  'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby', 'Remix',
  'jQuery', 'Backbone.js', 'Ember.js', 'Alpine.js', 'Solid.js', 'Preact',
  
  // Backend Frameworks
  'Node.js', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring Framework',
  'Ruby on Rails', 'Laravel', 'Symfony', 'ASP.NET', '.NET Core', 'Gin', 'Echo', 'Fiber',
  
  // Mobile Development
  'React Native', 'Flutter', 'iOS Development', 'Android Development', 'Xamarin', 'Ionic',
  'SwiftUI', 'UIKit', 'Jetpack Compose',
  
  // Databases
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB',
  'Oracle Database', 'SQL Server', 'SQLite', 'MariaDB', 'CouchDB', 'Neo4j', 'InfluxDB',
  'TimescaleDB', 'Snowflake', 'BigQuery', 'Redshift',
  
  // Cloud Platforms
  'AWS', 'Azure', 'Google Cloud Platform', 'DigitalOcean', 'Heroku', 'Vercel', 'Netlify',
  'Cloudflare', 'Linode', 'Oracle Cloud',
  
  // AWS Services
  'EC2', 'S3', 'Lambda', 'RDS', 'DynamoDB', 'CloudFront', 'Route 53', 'ECS', 'EKS',
  'API Gateway', 'CloudWatch', 'IAM', 'VPC', 'SQS', 'SNS', 'Kinesis',
  
  // DevOps & Infrastructure
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions',
  'CircleCI', 'Travis CI', 'ArgoCD', 'Helm', 'Prometheus', 'Grafana', 'ELK Stack',
  'Datadog', 'New Relic', 'Splunk', 'Nagios', 'Consul', 'Vault',
  
  // Version Control
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',
  
  // Testing
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Playwright', 'Puppeteer', 'JUnit',
  'TestNG', 'PyTest', 'RSpec', 'Jasmine', 'Karma', 'Vitest', 'Testing Library',
  
  // Data Science & ML
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras', 'Pandas', 'NumPy', 'Matplotlib',
  'Seaborn', 'Jupyter', 'Apache Spark', 'Hadoop', 'Airflow', 'MLflow', 'Kubeflow',
  'XGBoost', 'LightGBM', 'NLTK', 'spaCy', 'Hugging Face', 'OpenCV',
  
  // API & Integration
  'REST API', 'GraphQL', 'gRPC', 'WebSockets', 'SOAP', 'Postman', 'Swagger', 'OpenAPI',
  
  // Message Queues
  'RabbitMQ', 'Kafka', 'ActiveMQ', 'ZeroMQ', 'NATS', 'Pulsar',
  
  // Security
  'OAuth', 'JWT', 'SAML', 'SSL/TLS', 'Penetration Testing', 'OWASP', 'Security Auditing',
  'Encryption', 'IAM', 'Zero Trust', 'SIEM',
  
  // Methodologies
  'Agile', 'Scrum', 'Kanban', 'Lean', 'DevOps', 'CI/CD', 'TDD', 'BDD', 'DDD',
  'Microservices', 'Event-Driven Architecture', 'Serverless',
  
  // Design Tools
  'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Photoshop', 'Illustrator', 'After Effects',
  'Framer', 'Principle', 'Zeplin', 'Abstract',
  
  // Project Management
  'Jira', 'Confluence', 'Asana', 'Trello', 'Monday.com', 'Linear', 'ClickUp', 'Notion',
  
  // Analytics
  'Google Analytics', 'Mixpanel', 'Amplitude', 'Segment', 'Heap', 'Looker', 'Tableau',
  'Power BI', 'Metabase',
  
  // CMS & E-commerce
  'WordPress', 'Contentful', 'Strapi', 'Sanity', 'Shopify', 'WooCommerce', 'Magento',
  
  // Soft Skills
  'Leadership', 'Communication', 'Problem Solving', 'Critical Thinking', 'Team Collaboration',
  'Mentoring', 'Public Speaking', 'Technical Writing', 'Stakeholder Management',
  'Conflict Resolution', 'Time Management', 'Adaptability', 'Creativity', 'Empathy',
  
  // Domain Expertise
  'Fintech', 'Healthcare', 'E-commerce', 'EdTech', 'SaaS', 'B2B', 'B2C', 'Blockchain',
  'Cryptocurrency', 'IoT', 'AR/VR', 'Gaming', 'Social Media', 'Advertising Technology',
  'Supply Chain', 'Logistics', 'Real Estate Technology', 'Legal Technology'
] as const;

export const JOB_SEARCH_STATUS = [
  { value: 'actively-searching', label: 'Actively Searching' },
  { value: 'casually-looking', label: 'Casually Looking' },
  { value: 'open-to-opportunities', label: 'Open to Opportunities' },
  { value: 'not-looking', label: 'Not Looking' }
] as const;

export const AVAILABILITY_STATUS = [
  { value: 'actively-referring', label: 'Actively Referring' },
  { value: 'open-to-requests', label: 'Open to Requests' },
  { value: 'limited-availability', label: 'Limited Availability' },
  { value: 'not-available', label: 'Not Available' }
] as const;

export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'platform-messages', label: 'Platform Messages' },
  { value: 'phone', label: 'Phone' }
] as const;

export const COMPANY_SIZES = [
  { value: '1-10', label: 'Startup (1-10 employees)' },
  { value: '11-50', label: 'Small (11-50 employees)' },
  { value: '51-200', label: 'Medium (51-200 employees)' },
  { value: '201-1000', label: 'Large (201-1000 employees)' },
  { value: '1001-5000', label: 'Enterprise (1001-5000 employees)' },
  { value: '5001+', label: 'Large Enterprise (5000+ employees)' }
] as const;

export const MAJOR_TECH_HUBS = [
  // North America
  'San Francisco, CA', 'San Jose, CA', 'Palo Alto, CA', 'Mountain View, CA', 'Sunnyvale, CA',
  'Seattle, WA', 'New York, NY', 'Austin, TX', 'Boston, MA', 'Los Angeles, CA',
  'San Diego, CA', 'Denver, CO', 'Chicago, IL', 'Atlanta, GA', 'Miami, FL',
  'Portland, OR', 'Raleigh, NC', 'Washington, DC', 'Toronto, Canada', 'Vancouver, Canada',
  'Montreal, Canada',
  
  // Europe
  'London, UK', 'Berlin, Germany', 'Munich, Germany', 'Amsterdam, Netherlands', 'Paris, France',
  'Dublin, Ireland', 'Stockholm, Sweden', 'Copenhagen, Denmark', 'Zurich, Switzerland',
  'Barcelona, Spain', 'Madrid, Spain', 'Milan, Italy', 'Warsaw, Poland', 'Prague, Czech Republic',
  
  // Asia
  'Bangalore, India', 'Hyderabad, India', 'Mumbai, India', 'Delhi, India', 'Pune, India',
  'Singapore', 'Tokyo, Japan', 'Seoul, South Korea', 'Beijing, China', 'Shanghai, China',
  'Shenzhen, China', 'Hong Kong', 'Tel Aviv, Israel', 'Dubai, UAE', 'Sydney, Australia',
  'Melbourne, Australia',
  
  // Remote
  'Remote - US', 'Remote - Europe', 'Remote - Asia', 'Remote - Global'
] as const;
