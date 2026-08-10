# QuikITScale KPI handover

The Skill Map Portal does not directly integrate with QuikITScale. At handover time, the KPI team receives a documented, read-only database contract or an export built from that contract. Credentials, transfer schedule, retention, and ownership remain human approval points.

## Read-only views

### `v_leader_skill_snapshot`

One row per current self-rated leader skill. Fields are `leader_id`, `leader_email`, `skill_id`, `skill_name`, `skill_category`, `current_proficiency`, `rating_source`, and `rated_at`.

### `v_leader_aspiration`

One row per aspiration target skill, while retaining a row with nullable skill fields when an aspiration has no target rows. Fields are:

- `leader_id`, `leader_email`
- `target_capability`, `target_role`, `target_timeframe`, `secondary_capability`, `notes`
- `target_skill_id`, `target_skill_name`
- `current_proficiency`, `target_proficiency`
- `aspiration_updated_at`

`current_proficiency` comes only from the leader’s `SELF_REPORTED` rating for the same canonical skill. `target_proficiency` comes from `CareerAspirationSkill`. Both use the portal’s 1–5 scale, making the gap directly measurable without translating free text.

The timeframe enum maps as follows:

| Stored value | Business label |
|---|---|
| `ZERO_TO_SIX_MONTHS` | 0-6 months |
| `SIX_TO_TWELVE_MONTHS` | 6-12 months |
| `ONE_TO_TWO_YEARS` | 1-2 years |
| `TWO_PLUS_YEARS` | 2+ years |

## Handover controls

- Create a dedicated database principal with `SELECT` on these views only; do not grant table writes.
- Agree the export cadence and secure transport with the KPI team before enabling access.
- Treat leader email, aspirations, and skill gaps as employee data subject to the approved retention policy.
- Version any future export schema rather than changing these columns silently.
