# QUIP Score Report
**Ticket:** Store Insight v1 (EoE Pilot)
**ClickUp ID:** 869ayynqb
**ClickUp URL:** https://app.clickup.com/t/869ayynqb
**Product:** StoreInsight (created in the AvailabilityInsight list)
**Work Type:** New Feature
**Scored:** 2026-07-07
**Version:** v1
**Ticket folder:** 869ayynqb__store-insight-v1-eoe-pilot
**Trigger:** manual
**Score Status:** provisional-open-questions

> **Scope note (not a THIN DATA warning):** This ticket is at ClickUp status `8. Build & Deploy`, which is outside Quorum's orchestration scope, and it already carries an externally-set `Total Score` of **145**. This score was produced on an explicit manual `/score` request, is advisory only, and was **not written back to ClickUp**. The ticket content reads as early POC/discovery ("POC requested", "Define MVP", "Align on commercial model") despite the Build & Deploy status — scored on content evidence regardless of status.

---

## Scoring Summary

3-pass consistency check completed. Confidence: **Medium**. Content is rich, but the QUIP financial fields (ARR £, EBITDAC £) are blank and the commercial model is explicitly not yet defined, so ARR/EBITDAC are evidence-limited. The ARR Growth pilot override is applied on a clearly-named, in-motion client pilot.

Total Score: 72.5
Total Score Calculation: 0 + 72.5 = 72.5
Lever Total: 72.5
Initial Score (Time + Effort + Complexity): 0

---

## Initial Score Detail

Time: 0 — New AI platform, ~92 ROM developer-days and DS-heavy (60d); an 8+ sprint build. Defaulted to the largest band given no explicit sprint plan.
Effort: 0 — ROM TOTAL 92 developer-days across DS/FE/API/DBEng/QA, well above the 30-day Very Large threshold.
Complexity: 0 — New Store Insight platform on Snowflake Cortex AI with AI-led investigation and anomaly detection; new architecture and ML, Very Substantial.

---

## Lever Breakdown

ARR Growth: 20 (10 × 2) — No RI ARR £ figure in ticket; named EoE Coop / M&S pilot in motion, so pilot override sets base 10 (×2 = 20).
ARR Retain: 0 (0 × 2) — No existing-ARR-at-risk evidence; the Quorso threat is competitive/growth, captured under Competitor.
TAM Expansion: 5 — Two named new markets beyond the current footprint, convenience and pharmacy; grocery expansion is new buying centres within an existing segment.
CSAT: 7.5 — Validated with M&S; addresses real store/area/head-office prioritisation pain across roles.
ESAT: 0 — No evidence of RI employee-experience benefit; the product targets client store teams, not RI staff.
EBITDAC: 0 — No RI cost-saving or operational-saving evidence in ticket.
Table Stakes: 0 (0 × 2) — Field blank; positioned as a differentiator, not a baseline requirement. Defaulted to No — see ambiguity note on the competitive-pressure case for Low.
Pilot: 10 — Named EoE Coop pilot ("EoE Pilot" in title) plus M&S POC requested and designs validated.
Competitor: 10 — Quorso named explicitly ("Addressing the Quorso Challenge"); Yoobic, ThinkTime and Zipline also referenced.
USP: 10 — Only store co-pilot built natively on RI availability/waste/inventory AI, with root-cause and value attribution vs generic task logic.
Resolves Risk: 10 — Associated Risks field states Quorso will erode RI pipeline; delivering Store Insight directly mitigates that business risk.
Reputational Risk: 0 — No explicit evidence that delay damages RI credibility with a named client; market-credibility angle noted but not scored.
Contract Debt Clearance: 0 — No contractual obligation referenced.
Dependency: 0 — No roadmap items are blocked on this; it consumes AvailabilityInsight rather than blocking other work.

---

## Evidence Section

**Description:** "Store Insight directly addresses this by shifting from insight → action." Builds a KPI/drilldown layer, Store Successes, and AI-driven **Smart Actions** (detect → investigate → root cause → recommend) on **Snowflake Cortex AI**. "Initial designs validated with customers (incl. M&S)", "POC requested", "Data discussions underway (Coop + EoE)". Strategic framing: ARR upsell on AvailabilityInsight, "Addressing the Quorso Challenge", TAM expansion into store operations / field leadership tooling.

**Custom Fields Used:**
- Work Type = New Feature
- ROM day-splits: DS(d) 60, FE(d) 10, SW/API(d) 10, DBEng(d) 7, QA(d) 5, PM(d) 0 → ROM TOTAL 92
- Table Stakes = (blank)
- Alignment to Strategy = Increase ARR
- Associated Risks = "Yes, vendors like Quorso will eat into our pipeline"
- Benefits / Outcomes, Customer Gains, Customer Pains, USPs, Differentiation, Market/Competitor context, Target Addressable Market — used for lever reasoning
- Quantifiable ROI = "$200M incremental sales benefit" (client sales benefit, **not** RI ARR — not used for ARR band)
- ARR £ / EBITDAC £ = not present / blank on this ticket

**Ambiguities:**
- **ARR Growth** — no RI ARR £ figure; scored via pilot override (base 10) rather than a revenue band. If a real ARR figure exists elsewhere it could move this materially.
- **ARR Retain** — defaulted to 0 (lowest band); no existing-ARR-at-risk evidence.
- **Table Stakes** — defaulted to No (0). A defensible case exists for **Low (5 → 10)** on competitive-pressure grounds ("Quorso will eat into our pipeline"); flagged for manual review.
- **Reputational Risk** — defaulted to 0; "Addressing the Quorso Challenge" implies market-credibility stakes but no named-client reputational risk is stated.
- **ESAT** — defaulted to 0; the "vibe coding / faster engineering cycles" note concerns build efficiency, not RI employee satisfaction, and per the ESAT rule was not counted.
- **Time** — no explicit sprint count; inferred 8+ sprints from the 92-day DS-heavy ROM.

---

## Score Explanation
Named EoE Coop/M&S pilot with a strong USP vs Quorso lifts the ARR-growth and competitive levers, but a ~92-day DS-heavy new-platform build zeros Time/Effort/Complexity. No ARR £/EBITDAC evidence. Net: high strategic pull, heavy delivery cost.

---

## Validation Block

✅ Initial Score = 0 + 0 + 0 = 0
✅ Lever Total = 20 + 0 + 5 + 7.5 + 0 + 0 + 0 + 10 + 10 + 10 + 10 + 0 + 0 + 0 = 72.5
✅ Total Score = 0 + 72.5 = 72.5

## Open Clarification Questions
<!-- quip:open-questions -->
- **ARR Growth/Retain (ARR £):** No ARR figure on the ticket — is there a target ARR for the EoE Coop pilot / wider rollout? ARR Growth currently rests on the pilot override (20) and ARR Retain is defaulted to 0.
- **EBITDAC (£):** Any RI operational saving expected from Store Insight? Currently 0.
- **Table Stakes:** Field is blank and the item is framed as a differentiator, but "Quorso will eat into our pipeline" suggests category expectation — confirm No (0) vs Low (10).
- **Effort/Time:** ROM TOTAL is 92 dev-days but there is no sprint plan — confirm the sprint count if an estimate exists.

---

## Divergence vs existing ClickUp Total Score (145)
This QUIP run computes **72.5** against the **145** already on the ticket. The gap is driven mainly by:
1. **Initial Score = 0** — QUIP penalises effort/complexity heavily; a 92-day, DS-heavy, new-architecture platform scores 0 across Time/Effort/Complexity (max possible there is 30).
2. **Conservative ARR** — no RI ARR £ evidence, so ARR Growth rests on the pilot override (20) and ARR Retain is 0. A score of 145 implies high ARR Growth **and** ARR Retain **and** Table Stakes bands (up to 60 combined from those three ×2 levers) plus generous binaries.
This is expected: the QUIP agent will not award ARR/EBITDAC/Table-Stakes points without explicit ticket evidence. If the 145 reflects figures held outside the ticket, supply them and re-run for a v2.

---

## CSV Row
```
Store Insight v1 (EoE Pilot) | New Feature | https://app.clickup.com/t/869ayynqb | StoreInsight (created in the AvailabilityInsight list) | 72.5 | Named EoE Coop/M&S pilot with a strong USP vs Quorso lifts the ARR-growth and competitive levers, but a ~92-day DS-heavy new-platform build zeros Time/Effort/Complexity. No ARR £/EBITDAC evidence. Net: high strategic pull, heavy delivery cost. | 0 | New AI platform, ~92 ROM developer-days and DS-heavy (60d); an 8+ sprint build. Defaulted to the largest band given no explicit sprint plan. | 0 | ROM TOTAL 92 developer-days across DS/FE/API/DBEng/QA, well above the 30-day Very Large threshold. | 0 | New Store Insight platform on Snowflake Cortex AI with AI-led investigation and anomaly detection; new architecture and ML, Very Substantial. | 20 | No RI ARR £ figure in ticket; named EoE Coop / M&S pilot in motion, so pilot override sets base 10 (×2 = 20). | 0 | No existing-ARR-at-risk evidence; the Quorso threat is competitive/growth, captured under Competitor. | 5 | Two named new markets beyond the current footprint, convenience and pharmacy; grocery expansion is new buying centres within an existing segment. | 7.5 | Validated with M&S; addresses real store/area/head-office prioritisation pain across roles. | 0 | No evidence of RI employee-experience benefit; the product targets client store teams, not RI staff. | 0 | No RI cost-saving or operational-saving evidence in ticket. | 0 | Field blank; positioned as a differentiator, not a baseline requirement. Defaulted to No — see ambiguity note on the competitive-pressure case for Low. | 10 | Named EoE Coop pilot ("EoE Pilot" in title) plus M&S POC requested and designs validated. | 10 | Quorso named explicitly ("Addressing the Quorso Challenge"); Yoobic, ThinkTime and Zipline also referenced. | 10 | Only store co-pilot built natively on RI availability/waste/inventory AI, with root-cause and value attribution vs generic task logic. | 10 | Associated Risks field states Quorso will erode RI pipeline; delivering Store Insight directly mitigates that business risk. | 0 | No explicit evidence that delay damages RI credibility with a named client; market-credibility angle noted but not scored. | 0 | No contractual obligation referenced. | 0 | No roadmap items are blocked on this; it consumes AvailabilityInsight rather than blocking other work.
```
