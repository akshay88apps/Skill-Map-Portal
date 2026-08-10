# Data dictionary

## Leader

| Field | Type | Meaning |
|---|---|---|
| `role` | `ADMIN`, `LEADER`, or `VIEWER` | Entra-derived application access role. |
| `profileStatus` | workflow enum | Invitation, draft, review, publication, and deactivation state. |
| `additionalCapabilityTags` | `ManualCapabilityTag[]` | Optional admin-managed function tags. Valid values are Customer Engineering, Innovation Lab, and Product Strategy & Venture Studio. These are not editable in the leader wizard. |

## Skill taxonomy

`data/tech-skills-taxonomy.json` is the canonical HR source for skill and tool selection. After the 2026-08-10 capability update it contains 14 categories, 169 listed entries, and 167 unique names. `Power BI` and `Microsoft Fabric` appear in two source categories; the first-listed category remains canonical because `Skill.name` is globally unique.

The update adds:

- `IAM (Identity & Access Management)` under DevOps & Cloud Engineering.
- `AI Governance` under Artificial Intelligence & Generative AI.
- Security & Cybersecurity with Cloud Security, Zero Trust Architecture, Threat Detection & Incident Response (SIEM/SOC), Network Security, Ethical Hacking / Penetration Testing, DevSecOps / Secure Coding, Governance Risk & Compliance (GRC), Security Automation & Scripting, AI-Aware/Adversarial Defense, and Data Privacy & Regulatory Compliance.

## Capability layer

Capability is an executive rollup above skill category. It does not replace Practice Area. A leader can contribute to multiple capabilities, and is counted once per relevant capability.

| Skill category | Skill-derived capability |
|---|---|
| Microsoft Technologies | Product Engineering |
| Microsoft Business Applications | Enterprise Platforms |
| Salesforce | Enterprise Platforms |
| Artificial Intelligence & Generative AI | AI & Autonomous Systems |
| Data Science & Machine Learning | AI & Autonomous Systems |
| Data Engineering & Analytics | Data Platforms & Intelligence |
| DevOps & Cloud Engineering | Platform Engineering |
| Frontend Technologies | Experience Engineering |
| Backend Technologies | Product Engineering |
| Mobile Development | Experience Engineering |
| CMS & E-commerce | Experience Engineering |
| QA & Testing | Product Engineering |
| UI/UX Design | Experience Engineering |
| Security & Cybersecurity | Digital Trust |

The remaining three CTO capabilities have no skill-category mapping and are stored only as `ManualCapabilityTag` values:

- `CUSTOMER_ENGINEERING` → Customer Engineering
- `INNOVATION_LAB` → Innovation Lab
- `PRODUCT_STRATEGY_VENTURE_STUDIO` → Product Strategy & Venture Studio

The Capability Matrix always returns all 10 rows, including zero-headcount rows. Manual rows carry a “Manually tagged” source indicator.

## Taxonomy review

`ReviewItem` stores unmatched AI/legacy terms and leader-submitted “Other” requests. Pending requests do not create canonical `Skill` or `Tool` rows. An administrator must explicitly approve them through the taxonomy review workflow.
