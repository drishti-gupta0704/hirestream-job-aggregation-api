require('dotenv').config();
const pool = require('../config/db');

const jobs = [
  { title: 'Junior Backend Developer', company: 'Northstar Labs', location: 'Noida, India', description: 'Build REST APIs, write tests, and work with PostgreSQL.', skills: ['Node.js','Express.js','PostgreSQL'], workplace: 'Hybrid', min: 500000, max: 800000 },
  { title: 'Java Software Engineer', company: 'CloudCanvas', location: 'Gurugram, India', description: 'Develop backend services using Java, Spring Boot, and SQL.', skills: ['Java','Spring Boot','SQL'], workplace: 'On-site', min: 600000, max: 1000000 },
  { title: 'Full Stack Developer', company: 'PixelForge', location: 'Remote, India', description: 'Build user-facing applications and reliable backend services.', skills: ['React','Node.js','REST API'], workplace: 'Remote', min: 500000, max: 900000 },
  { title: 'Data Engineer - Associate', company: 'DataRiver', location: 'Bengaluru, India', description: 'Create batch pipelines and validate data quality.', skills: ['Python','SQL','Apache Spark'], workplace: 'Hybrid', min: 700000, max: 1200000 },
  { title: 'Platform Engineer Intern', company: 'LaunchStack', location: 'Delhi, India', description: 'Support CI/CD, containers, monitoring, and internal developer tools.', skills: ['Docker','Linux','AWS'], workplace: 'On-site', min: 200000, max: 400000 }
];

(async () => {
  try {
    for (const j of jobs) {
      await pool.query(
        `INSERT INTO jobs (title, company, location, description, skills, workplace_type, salary_min, salary_max, currency, source, external_id, posted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'INR','demo-seed',$9,NOW())
         ON CONFLICT (source, external_id) DO NOTHING`,
        [j.title, j.company, j.location, j.description, j.skills, j.workplace, j.min, j.max, j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
      );
    }
    console.log('Demo jobs seeded. These are fictional sample listings, not real vacancies.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();