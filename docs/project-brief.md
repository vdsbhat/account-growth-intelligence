# Project brief and data model

## Business situation

A fictional B2B software company sells a Customer Data Platform (CDP), Marketing Automation (MAP), and an Analytics Platform (BI). Sales and marketing need to choose up to 50 account–product opportunities for review. Account information, ownership, engagement, and opportunity records need to be brought together.

The project focuses on cross-selling to customers with at least one active product. It answers who to target, for which product, what evidence supports the recommendation, and what an account owner should validate next.

## Intended users and decisions

- Marketing analyst: filter a candidate audience and export a shortlist.
- Account manager: review product whitespace and supporting signals before outreach.
- Analytics reviewer: inspect rules, data grain, date cutoffs, and score calculations.

## Data model

| Table | Grain and key | Selected fields |
|---|---|---|
| accounts | One account; account_id | industry, region, employees, size_band, engagement_observed |
| products | One product; product_id | name |
| ownership | One account/product snapshot; account_id + product_id | start_date, renewal_date, adoption_pct |
| events | One recorded event; event_id | account_id, product_id, event_date, event_type |
| opportunities | One opportunity; opportunity_id | account_id, product_id, created_date, closed_date, status |
| fit_rules | One product/industry/size combination | fit_points |

Account ID and product ID are foreign keys in the activity tables. Ownership uses a simple current subscription record, not a complete subscription event history. Reopened opportunities and changing account attributes would require richer history in production.

Analytical output grain: one eligible account–product pair. Engagement and ownership are aggregated before joining to the account/product candidate universe; exclusions use `NOT EXISTS` so multiple opportunities cannot multiply results.

## Acceptance criteria

1. Only active customers with product fit of at least 20 qualify.
2. Owned products and opportunities open at the snapshot date are excluded.
3. Only the 90 calendar dates ending at the snapshot contribute engagement.
4. Repeated account/product/type/day signals count once; duplicate event IDs are rejected.
5. Scores add up to their visible components and stay within 0–100.
6. Missing engagement coverage is distinguishable from observed zero activity.
7. Exports respect active filters, contain at most 50 pairs, and exclude coverage gaps.
8. The same seed and analysis date reproduce the same outputs in the validated runtime.

## Scope and success

Success means a functioning, explainable decision workflow with verified calculations and an interview walkthrough. Demonstrated business value is the ability to inspect and prioritize consistently. Actual conversion or revenue improvement remains unmeasured.

No live CRM connection, automated outreach, predictive model, renewal-risk model, or live AI service is included. A fictional opportunity closed as Won does not necessarily imply active ownership at the snapshot: this simplified generator does not simulate contract activation. That relationship would need reconciliation in real data.
