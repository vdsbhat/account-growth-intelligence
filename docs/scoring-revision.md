# Scoring revision: excessive near-perfect priorities

## Latest update: modest compatibility credit, version 3.1

The owner observed that version 3 had no scores above 89 and requested a slightly more liberal treatment. For existing products with positive observed adoption, complementary ownership now uses 20% compatibility credit and 80% adoption-based credit. Missing or zero adoption still earns no points. The rationale is that an existing compatible deployment can reduce some cross-sell implementation effort even before full adoption; this remains an unvalidated demo assumption.

On the same 564 covered opportunities, the highest score moves from 89 to 91, one opportunity scores 90+, and the 80+ group increases from 9 to 11. The mean score increase is 1.20 points. Activity, fit, recency, eligibility, and the underlying synthetic records remain unchanged. This is a documented scoring-policy adjustment, not an empirical calibration or proof of a realistic buying probability.

## Previous update: engagement and ownership, version 3

The owner requested the same scrutiny for Relevant engagement and Complementary ownership. Version 2 still gave full ownership credit to 239 of 564 covered opportunities. Version 3 discounts each engagement signal by its age, retains signal-type caps, and scales each product relationship by an explicitly synthetic usage/adoption percentage. See `methodology.md` for the formulas, rounding, and adoption definition.

| Covered opportunities (same 564 candidates) | Version 2 | Version 3 |
|---|---:|---:|
| Full 30/30 engagement | 4 | 0 |
| Full 20/20 complementary ownership | 239 | 25 |
| Top-50 opportunities with full ownership points | 26 | 4 |
| Mean engagement contribution | 4.7 | 3.1 |
| Mean ownership contribution | 13.7 | 8.3 |
| Highest total priority score | 96 | 89 |

No target distribution is imposed and full marks remain possible. The revised covered score bands contain 371 opportunities at 0–39, 152 at 40–59, 32 at 60–79, and 9 at 80–100. The mean total is 39.0. The underlying account, event, and eligibility records remain stable from version 2; the added adoption values are generated using a separate random stream. These comparisons describe a prototype, not validated commercial performance.

The remaining sections document the earlier version 1-to-2 revision.

The portfolio owner noticed that most visible opportunities scored close to 100 and asked for a more realistic demonstration. Inspection found 43 perfect scores, 110 scores of 90 or higher, and all of the top 50 at 90 or higher among 625 covered opportunities.

## Why this happened

The original generator selected demos, webinars, and email clicks with equal likelihood. Its scoring reached maximum engagement after just a demo plus a webinar, awarded full recency for any recent click, gave every industry maximum BI fit, and gave full BI relationship points for either existing product. Sorting by score made this concentration especially visible on the first page.

## What changed

- Generate quiet, exploring, and evaluating activity patterns, with quiet activity more common and demo requests less common than clicks.
- Use a graduated industry/size fit matrix and product-specific relationship strengths.
- Cap click, webinar, and demo contributions separately; repeated low-intent activity cannot fill the engagement component.
- Make recency credit depend on event type, so a recent click does not count like a recent demo request.
- Show supporting signal counts and rule explanations beneath the component bars.

See `methodology.md` for every coefficient and generation assumption. No scores were manually lowered, mapped to percentiles, or assigned to a desired distribution. The 30/30/20/20 component maxima remain unchanged, and 100 remains attainable.

## Observed demo comparison

| Measure | Original demo | Revised demo |
|---|---:|---:|
| Eligible product opportunities | 695 | 626 |
| Opportunities with engagement coverage | 625 | 564 |
| Coverage gaps | 70 | 62 |
| Covered opportunities scoring 90+ | 110 (17.6%) | 5 (0.9%) |
| Covered opportunities scoring 100 | 43 (6.9%) | 0 |
| Highest covered score | 100 | 96 |
| Mean covered score | 66.2 | 46.0 |
| Top-50 opportunities scoring 90+ | 50 | 5 |

Both the generator and scoring rules changed, and the data was regenerated. These columns describe two synthetic demonstrations, not a controlled before/after experiment on identical accounts. Eligibility totals changed with the fit rules and regenerated account/opportunity records. This comparison is not evidence of improved predictive accuracy, conversion, or business results.

The revised covered population has 201 opportunities at 0–39, 291 at 40–59, 46 at 60–79, and 26 at 80–100. These counts are outputs of the declared rules, not target quotas.

## Interview discussion

Explain how you noticed score saturation, traced it to data-generation and scoring assumptions, and asked for changes that require stronger evidence for high priority. Acknowledge that these assumptions still need validation against actual sales outcomes before commercial use.
