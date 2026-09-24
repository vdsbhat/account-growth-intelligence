# Validation record

Current scoring version 3.1 checked on 24 September 2026.

## Scoring version 3.1

Evidence briefs now name each signal type and count, the resulting engagement points, and the latest activity/date. The briefing update adds checks for deduplicated counts, singular/plural wording, and multiple activity types sharing the latest date. All 22 analytical tests and the client filter/export checks pass; scoring rules are unchanged by this wording update.

The modest compatibility allowance is checked with manually expected adoption examples: 0%, 25%, 50%, 75%, and 100% adoption yield 0, 8, 12, 16, and 20 points for a 20-point relationship. A mixed-product example gives 14 points after rounding. All 21 analytical tests and the client filtering/export checks pass. Current covered counts: 564 opportunities, maximum 91, one score at 90+, and 11 at 80+.

## Scoring version 3

21 analytical tests and the client filtering/export checks passed. Added tests cover engagement age boundaries, newest-demo ordering, adoption scaling, and missing adoption. The perfect-score fixture still reaches 100 with full adoption and sufficient recent signals. The same 564 covered candidates now have zero full-engagement components, 25 full-ownership components, and a maximum total of 89. Versioned data URLs load the regenerated dataset in the dashboard.

The sections below document previous scoring versions; their totals and examples describe those versions.

## Scoring version 2

17 analytical tests passed on Python 3.13.5. The updated reference case scores 83. Additional cases verify that repeated clicks alone earn at most 4 engagement and 4 recency points, fresh clicks cannot refresh an old demo, webinars receive intermediate credit, product relationships have different strengths, and full 100 remains attainable with sufficient evidence. Client tests pass for multi-range filtering, chart totals, account suggestions, coverage exclusions, and exports against the regenerated data.

Current counts: 626 eligible opportunities, 564 covered, 62 with coverage gaps. Among the covered opportunities, 5 score 90+, none score 100, and the maximum is 96. Detailed assumptions and the comparison with the original demo are in `scoring-revision.md`.

Browser verification confirmed the 564-opportunity default shortlist, leading scores of 96, 96, 94, 94, and 91, and the new component explanations. Example A0144 has fit 28, engagement 28, recency 20, and complementary ownership 20, totaling 96. Versioned asset URLs refresh the previously cached demo data.

The sections below record earlier prototype checks. Their example account IDs and totals are historical and changed when the synthetic dataset was regenerated.

## Automated analytical checks

`python -m unittest discover -s tests -v`

13 tests passed on Python 3.13.5. Coverage includes a manually calculated 92-point reference case, duplicate ID rejection, repeated signal suppression, ownership/open-opportunity exclusions, no join inflation from multiple closed opportunities, future closure handling, date-window and recency boundaries, missing versus observed-zero engagement, score caps, product fit, and generated output uniqueness.

## Client and export checks

`node --check assets/app.js`

`node tests/test_export.cjs`

Node is optional for these developer checks and is not required to view or rebuild the dashboard. The export test executes the real client code with a small document stub and inspects its CSV Blob. It covers the 50-pair limit, current product/region filters, missing-coverage exclusion, and an empty audience.

## Browser checks

Opened the local dashboard in the Codex browser and inspected its layout. Verified product/region filtering (MAP + APAC gives 81 covered pairs), next-page navigation, empty search results with disabled export, 695 pairs when coverage gaps are included, and the export confirmation for 50 covered pairs. Account A0024 shows two incomplete candidates and a disabled export button. Inspected account score components and evidence briefs.

This does not constitute cross-browser certification, production security testing, or commercial-performance validation. No live language-model evaluation was performed because that integration is not part of this version.

## Interactive distribution update

Added score-range bands 0–39, 40–59, 60–79, and 80–100, inclusive. Client tests verify boundary membership, chart totals matching filtered results, industry/score combinations, filtered exports, chart toggling, pagination reset, resetting filters, and empty-chart handling. Charts count account–product pairs across the full filtered result set, not just the visible page. Percentages use that same filtered population as the denominator. Top portfolio metrics remain overall totals.

Score bands now allow multiple selections, including non-adjacent ranges. Export tests verify their union, synchronized chart selection, and unique account suggestions restricted by the other filters. An exact selected account is cleared if a subsequent filter excludes it; free-text searches remain available. Counts and percentages have explicit chart headers.
