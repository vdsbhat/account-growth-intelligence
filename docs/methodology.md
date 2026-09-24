# Scoring methodology

## Snapshot and eligibility

Scoring version: 3.1. Analysis date: 2026-09-01. The 90-day window is 2026-06-04 through 2026-09-01, inclusive. Dates after the snapshot never contribute engagement; a dedicated test checks that boundary.

An account must own at least one active product. Ownership is active when `start_date <= snapshot <= renewal_date`. A candidate product is eligible only when it is not actively owned, its fit score is at least 20, and there is no opportunity created on/before the snapshot that remains open. An opportunity is treated as open if closed_date is absent or after the snapshot. This avoids incorrectly using a future closed status in the current analysis.

This is a fixed synthetic snapshot. Account attributes and coverage flags have no change history; changing the analysis date alone does not produce a historically complete backtest.

## Exact score rules

Total score = fit + engagement + recency + complementary ownership.

### Fit: maximum 30

Fit is industry points (maximum 20) plus company-size points (maximum 10). The previous version gave almost everyone full credit; the new matrix distinguishes product suitability more explicitly.

| Industry | CDP | MAP | BI |
|---|---:|---:|---:|
| Retail | 20 | 18 | 16 |
| Technology | 18 | 20 | 20 |
| Manufacturing | 12 | 12 | 18 |
| Professional Services | 14 | 18 | 18 |
| Healthcare | 16 | 12 | 16 |

| Company size | CDP | MAP | BI |
|---|---:|---:|---:|
| Small: fewer than 200 employees | 2 | 6 | 4 |
| Mid-market: 200–999 | 7 | 10 | 8 |
| Enterprise: 1,000 or more | 10 | 8 | 10 |

The fictional rationale is that CDP implementation is better suited to larger organizations, MAP has its strongest size fit in the mid-market, and BI fit varies by data needs and scale. These are design assumptions, not verified claims about actual industries, product vendors, or customer needs. Product-fit points below 20 remain ineligible. A real implementation needs stakeholder-approved criteria and better evidence of actual need.

### Engagement: maximum 30

One signal means a distinct account/product/event-type/calendar-date combination in the window. Signal types now have separate caps:

- Demo requests: 12 for the most recent distinct signal, 6 for each additional distinct signal; maximum 18 after age adjustment.
- Webinars: 4 per distinct signal; maximum 8.
- Email clicks: 1 per distinct signal; maximum 4.

Before applying those type caps, multiply each signal's base points by an age factor: 1.0 for 0–14 days, 0.75 for 15–30 days, 0.5 for 31–60 days, and 0.25 for 61–89 days. Sum the adjusted points within each type and apply its cap. Add the three capped subtotals and round once to the nearest whole number (halves round up).

For example, a demo two days ago earns 12, while an additional demo 70 days ago earns 6 × 0.25 = 1.5; engagement rounds from 13.5 to 14. Full 30-point engagement remains attainable with sufficient recent activity across all three types. Repeated clicks alone cannot create a high-intent score. Event IDs must be unique. Type/day deduplication can also merge legitimate same-day activity; a production model would need contact identity and event provenance.

### Recency: maximum 20

Calculate recency credit separately using the latest qualifying event of each type, then take the **maximum**, not their sum:

| Days ago | Demo request | Webinar | Email click |
|---|---:|---:|---:|
| 0–14 | 20 | 12 | 4 |
| 15–30 | 10 | 6 | 2 |
| 31–89 | 5 | 3 | 1 |
| No qualifying signal | 0 | 0 | 0 |

A fresh click cannot refresh an old demo request's credit. For example, a 50-day-old demo plus a click today receives max(5, 4) = 5 recency points.

### Complementary ownership: maximum 20

The following relationship strengths are the starting points, before adjustment for adoption:

| Target product | Existing CDP | Existing MAP | Existing BI |
|---|---:|---:|---:|
| CDP | Ineligible | 20 | 8 |
| MAP | 20 | Ineligible | 8 |
| BI | 12 | 8 | Ineligible |

For products with observed positive adoption, multiply relationship strength by `0.2 + 0.8 × adoption_pct / 100`, sum the results, round once to whole points (halves up), and cap at 20. The 20% base recognizes the potential benefit of an existing compatible deployment; 80% remains tied to usage. This is a modest relaxation of the previous fully adoption-proportional rule, not a uniform bonus to every priority score.

For example, owning CDP at 50% adoption gives a MAP candidate 20 × (0.2 + 0.8 × 0.5) = 12 points. A BI candidate owning CDP at 50% and MAP at 75% receives (12 × 0.6) + (8 × 0.8) = 13.6, rounded to 14. Zero adoption and missing adoption both earn no credit for that product; the explanation distinguishes them. Unknown usage is not treated as active use.

For this fictional suite, adoption means the modelled percentage of licensed user seats active in the 30 days ending at the snapshot. The demo generates that percentage directly; it does not contain underlying user telemetry. In a real implementation it would need to be calculated and validated from usage and licensing data, and an appropriate metric chosen for each product.

This assumes a more direct relationship between customer data and marketing activation than between either product and BI alone. These relationships and adoption adjustments are hypotheses about the fictional product suite, not validated purchase predictors. Ownership still controls eligibility regardless of usage; a zero-adoption owned product is not treated as whitespace.

## Missing coverage and ranking

The synthetic account-level `engagement_observed` flag indicates whether engagement tracking is available. This simplified flag applies to all products for that account. A real system may need coverage by source/product/date.

If coverage is missing, engagement and recency contribute zero and the UI explicitly labels the score incomplete. These accounts are hidden by default and never exported. If tracking is available but there are zero signals, the score also receives zero engagement/recency points, but evidence is marked covered. Covered means the tracking field is available, not that every source is accurate or that a customer intends to buy.

Results sort by descending total score, then account ID, then product ID. Tie-breaks are deterministic and have no business significance. Users should inspect ties near a campaign cutoff. The exporter chooses at most 50 eligible, covered pairs within active filters. It can contain multiple products for the same account.

## Worked example

The reference fixture below assumes 100% CDP adoption. At 50% adoption its complementary-ownership credit would be 12 instead of 20 and its total would be 75 instead of 83.

An eligible Technology/Mid-market account owns CDP and is a MAP candidate. It has one demo request five days ago and one email click eight days ago. Fit = 20 + 10 = 30; engagement = 12 + 1 = 13; recency = 20; complement = 20. Total = **83**. A duplicate same-day demo signal must not change that result. This independent reference case is covered by an automated test. A perfect score of 100 is still attainable when all criteria are fully satisfied; no arbitrary maximum below 100 is imposed.

## Synthetic activity generation

For each account/product with observed engagement coverage, a seeded random generator assigns an activity scenario:

| Scenario | Probability | Event count | Email / webinar / demo weights | Event age in days |
|---|---:|---|---|---|
| Quiet | 60% | 0, 1, or 2 with probabilities 60%, 25%, 15% | 88 / 11 / 1 | 0–179 |
| Exploring | 30% | Uniform 2–6 | 65 / 30 / 5 | 15–119 |
| Evaluating | 10% | Uniform 5–10 | 40 / 35 / 25 | 0–44 |

Event-type weights are relative sampling weights, not score contributions. Scenario labels are generation devices, not known buying intent or outcomes, and are never inputs to the score. Event dates are sampled uniformly within the scenario's range. Quiet and exploring accounts can have activity outside the scoring window. Account and activity generation use separate random streams. These percentages are declared synthetic assumptions, not market benchmarks. There is no target score distribution, percentile remapping, or random score adjustment.

## Interpretation and evaluation

Adoption values use a separate seeded random stream: 20% of owned subscriptions draw uniformly from 5–34%, 55% from 35–75%, and 25% from 76–100%. These are synthetic assumptions. Adding adoption leaves the version 2 accounts, ownership dates, events, and eligibility decisions intact. The source is a fixed snapshot and cannot support historical adoption backtests without time-stamped usage records.

Engagement decay and the recency component both reward freshness. That deliberate overlap should be tested for over-weighting when real outcomes become available; it is not evidence that the two components capture independent effects.

The score is a prioritization rule, not a probability. Engagement and recency share a source; scoring both intentionally favors recent interest but may overweight it. Missingness is not assumed random. The synthetic data is randomized and contains no conversion labels, so it cannot establish model accuracy or financial impact.

Before using similar logic commercially: validate definitions with account owners, compare shortlist quality with existing practice, vary weights and examine top-50 overlap, and evaluate genuine future outcomes with a time-separated comparison. Those analyses are planned extensions, not claimed results.
