# QUIP Score Report
**Ticket:** Store Insight v1 (EoE Pilot)
**ClickUp ID:** 869ayynqb
**ClickUp URL:** https://app.clickup.com/t/869ayynqb
**Product:** StoreInsight (created in the AvailabilityInsight list)
**Work Type:** New Feature
**Scored:** 2026-07-07
**Version:** v2
**Ticket folder:** 869ayynqb__store-insight-v1-eoe-pilot
**Trigger:** manual
**Score Status:** final

> **Supersedes v1.** v1 was `provisional-open-questions`. The four clarifiable levers were put to the Head of Product at scoring; all were confirmed at their defaults (ARR Growth = keep pilot override; ARR Retain = 0; EBITDAC = 0; Table Stakes = No). Total Score is unchanged at **72.5** — the change is confidence, not value.
>
> **Scope note:** ticket is at ClickUp status `8. Build & Deploy` (outside Quorum orchestration scope) and carries an externally-set `Total Score` of 145. Scored on content evidence at explicit manual request; **not written back to ClickUp**.

---

## Scoring Summary

3-pass consistency check completed. Confidence: **High**. All clarifiable financial levers were confirmed with the Head of Product; remaining defaults rest on ticket evidence, not missing data.

Total Score: 72.5
Total Score Calculation: 0 + 72.5 = 72.5
Lever Total: 72.5
Initial Score (Time + Effort + Complexity): 0

---

## Initial Score Detail

Time: 0 — New AI platform, ~92 ROM developer-days and DS-heavy (60d); an 8+ sprint build. Largest band.
Effort: 0 — ROM TOTAL 92 developer-days across DS/FE/API/DBEng/QA, well above the 30-day Very Large threshold.
Complexity: 0 — New Store Insight platform on Snowflake Cortex AI with AI-led investigation and anomaly detection; new architecture and ML, Very Substantial.

---

## Lever Breakdown

ARR Growth: 20 (10 × 2) — No ARR £ figure; Head of Product confirmed at scoring to keep the named EoE Coop / M&S pilot override (base 10, ×2 = 20).
ARR Retain: 0 (0 × 2) — Head of Product confirmed no existing ARR is at risk if not built.
TAM Expansion: 5 — Two named new markets beyond the current footprint, convenience and pharmacy; grocery expansion is new buying centres within an existing segment.
CSAT: 7.5 — Validated with M&S; addresses real store/area/head-office prioritisation pain across roles.
ESAT: 0 — No evidence of RI employee-experience benefit; the product targets client store teams, not RI staff.
EBITDAC: 0 — Head of Product confirmed no RI operational saving (the $200M is client sales benefit, not RI cost).
Table Stakes: 0 (0 × 2) — Head of Product confirmed this is a differentiator, not a baseline requirement clients demand.
Pilot: 10 — Named EoE Coop pilot ("EoE Pilot" in title) plus M&S POC requested and designs validated.
Competitor: 10 — Quorso named explicitly ("Addressing the Quorso Challenge"); Yoobic, ThinkTime and Zipline also referenced.
USP: 10 — Only store co-pilot built natively on RI availability/waste/inventory AI, with root-cause and value attribution vs generic task logic.
Resolves Risk: 10 — Associated Risks field states Quorso will erode RI pipeline; delivering Store Insight directly mitigates that business risk.
Reputational Risk: 0 — No explicit evidence that delay damages RI credibility with a named client; market-credibility angle noted but not scored.
Contract Debt Clearance: 0 — No contractual obligation referenced.
Dependency: 0 — No roadmap items are blocked on this; it consumes AvailabilityInsight rather than blocking other work.

---

## Evidence Section

**Description:** "Store Insight directly addresses this by shifting from insight → action." KPI/drilldown layer, Store Successes, and AI-driven **Smart Actions** (detect → investigate → root cause → recommend) on **Snowflake Cortex AI**. "Initial designs validated with customers (incl. M&S)", "POC requested", "Data discussions underway (Coop + EoE)".

**Custom Fields Used:**
- Work Type = New Feature
- ROM day-splits: DS(d) 60, FE(d) 10, SW/API(d) 10, DBEng(d) 7, QA(d) 5, PM(d) 0 → ROM TOTAL 92
- Table Stakes = (blank; confirmed No by Head of Product)
- Alignment to Strategy = Increase ARR
- Associated Risks = "Yes, vendors like Quorso will eat into our pipeline"
- Quantifiable ROI = "$200M incremental sales benefit" (client benefit, not RI ARR/EBITDAC)
- ARR £ / EBITDAC £ = not present; confirmed with Head of Product (ARR via pilot override, EBITDAC 0)

**Head of Product clarifications (manual run):**
- ARR Growth → keep pilot override (20)
- ARR Retain → None / 0
- EBITDAC → None / 0
- Table Stakes → No / 0

**Ambiguities:** None outstanding — all clarifiable levers confirmed. Remaining zero/low levers (ESAT, Reputational Risk, TAM ceiling) rest on ticket evidence.

---

## Score Explanation
Named EoE Coop/M&S pilot with a strong USP vs Quorso lifts ARR-growth and competitive levers, but a ~92-day DS-heavy new-platform build zeros Time/Effort/Complexity. ARR/EBITDAC/Table-Stakes confirmed at default by Head of Product. Net: high strategic pull, heavy delivery cost.

---

## Validation Block

✅ Initial Score = 0 + 0 + 0 = 0
✅ Lever Total = 20 + 0 + 5 + 7.5 + 0 + 0 + 0 + 10 + 10 + 10 + 10 + 0 + 0 + 0 = 72.5
✅ Total Score = 0 + 72.5 = 72.5

## Open Clarification Questions
<!-- quip:open-questions -->
None — all clarifiable levers were confirmed with the Head of Product at scoring.

---

## Divergence vs existing ClickUp Total Score (145)
This QUIP run computes **72.5** against the **145** on the ticket. With ARR/EBITDAC/Table-Stakes now confirmed at default, the gap is structural: QUIP's Initial Score is **0** for this 92-day, DS-heavy, new-architecture build (max there is 30), and there is no ARR Retain / Table Stakes contribution. A 145 would require materially higher ARR bands and/or effort scoring than the evidence and the Head of Product's clarifications support.

---

## CSV Row
```
Store Insight v1 (EoE Pilot) | New Feature | https://app.clickup.com/t/869ayynqb | StoreInsight (created in the AvailabilityInsight list) | 72.5 | Named EoE Coop/M&S pilot with a strong USP vs Quorso lifts ARR-growth and competitive levers, but a ~92-day DS-heavy new-platform build zeros Time/Effort/Complexity. ARR/EBITDAC/Table-Stakes confirmed at default by Head of Product. Net: high strategic pull, heavy delivery cost. | 0 | New AI platform, ~92 ROM developer-days and DS-heavy (60d); an 8+ sprint build. Largest band. | 0 | ROM TOTAL 92 developer-days across DS/FE/API/DBEng/QA, well above the 30-day Very Large threshold. | 0 | New Store Insight platform on Snowflake Cortex AI with AI-led investigation and anomaly detection; new architecture and ML, Very Substantial. | 20 | No ARR £ figure; Head of Product confirmed at scoring to keep the named EoE Coop / M&S pilot override (base 10, ×2 = 20). | 0 | Head of Product confirmed no existing ARR is at risk if not built. | 5 | Two named new markets beyond the current footprint, convenience and pharmacy; grocery expansion is new buying centres within an existing segment. | 7.5 | Validated with M&S; addresses real store/area/head-office prioritisation pain across roles. | 0 | No evidence of RI employee-experience benefit; the product targets client store teams, not RI staff. | 0 | Head of Product confirmed no RI operational saving (the $200M is client sales benefit, not RI cost). | 0 | Head of Product confirmed this is a differentiator, not a baseline requirement clients demand. | 10 | Named EoE Coop pilot ("EoE Pilot" in title) plus M&S POC requested and designs validated. | 10 | Quorso named explicitly ("Addressing the Quorso Challenge"); Yoobic, ThinkTime and Zipline also referenced. | 10 | Only store co-pilot built natively on RI availability/waste/inventory AI, with root-cause and value attribution vs generic task logic. | 10 | Associated Risks field states Quorso will erode RI pipeline; delivering Store Insight directly mitigates that business risk. | 0 | No explicit evidence that delay damages RI credibility with a named client; market-credibility angle noted but not scored. | 0 | No contractual obligation referenced. | 0 | No roadmap items are blocked on this; it consumes AvailabilityInsight rather than blocking other work.
```
