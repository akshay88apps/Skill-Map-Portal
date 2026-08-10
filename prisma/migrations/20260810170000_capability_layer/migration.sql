CREATE TYPE "ManualCapabilityTag" AS ENUM (
  'CUSTOMER_ENGINEERING',
  'INNOVATION_LAB',
  'PRODUCT_STRATEGY_VENTURE_STUDIO'
);

ALTER TABLE "Leader"
ADD COLUMN "additionalCapabilityTags" "ManualCapabilityTag"[] NOT NULL DEFAULT ARRAY[]::"ManualCapabilityTag"[];

INSERT INTO "Skill" ("id", "name", "category", "needsReview") VALUES
  ('taxonomy_' || md5('IAM (Identity & Access Management)'), 'IAM (Identity & Access Management)', 'DevOps & Cloud Engineering', false),
  ('taxonomy_' || md5('AI Governance'), 'AI Governance', 'Artificial Intelligence & Generative AI', false),
  ('taxonomy_' || md5('Cloud Security'), 'Cloud Security', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Zero Trust Architecture'), 'Zero Trust Architecture', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Threat Detection & Incident Response (SIEM/SOC)'), 'Threat Detection & Incident Response (SIEM/SOC)', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Network Security'), 'Network Security', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Ethical Hacking / Penetration Testing'), 'Ethical Hacking / Penetration Testing', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('DevSecOps / Secure Coding'), 'DevSecOps / Secure Coding', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Governance Risk & Compliance (GRC)'), 'Governance Risk & Compliance (GRC)', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Security Automation & Scripting'), 'Security Automation & Scripting', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('AI-Aware/Adversarial Defense'), 'AI-Aware/Adversarial Defense', 'Security & Cybersecurity', false),
  ('taxonomy_' || md5('Data Privacy & Regulatory Compliance'), 'Data Privacy & Regulatory Compliance', 'Security & Cybersecurity', false)
ON CONFLICT ("name") DO UPDATE SET
  "category" = EXCLUDED."category",
  "needsReview" = false;
