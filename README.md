# Account Growth Intelligence Workbench

A working analytics portfolio project for prioritizing cross-sell opportunities at a fictional B2B software company.

**Business question:** With capacity for 50 account–product opportunities, which customers should a sales or marketing team review first, for which product, and why?

All accounts, events, and assumptions are synthetic. The snapshot is **1 September 2026**. This is a rule-based decision-support prototype, not a trained prediction model.

## Try the dashboard

Open `index.html` in a modern browser. The included demo data works offline without installation, an API key, or a server. Keep the `assets` and `data` folders beside the HTML file.

To rebuild the synthetic data and scores, run these commands from this project folder with Python 3.10 or later:

```sh
python build.py
python -m unittest discover -s tests -v
```

Optional local server:

```sh
python -m http.server 8501 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8501. Stop the server with Ctrl+C. No third-party Python packages are needed. Development validation used Python 3.13.5.

## What works

- 500 synthetic customer accounts, three products, and six related source tables.
- SQL eligibility checks and aggregation at account–product grain.
- Transparent priority scores with four visible components.
- Product, region, industry, multiple score-range selections, and account search filters; account detail explorer and pagination. Account dropdown suggestions follow the other filters and list each matching account once.
- Interactive industry and score distribution charts with Product opportunities and Share % headers. One product opportunity is one account–product recommendation; a single account may have several. Click an industry to filter or score bars to add/remove ranges. Score ranges combine with OR (for example, 0–39 or 80–100); other filters combine with AND. No selected score ranges means all scores. Charts count all matching product opportunities and show each group's share of those opportunities.
- CSV export of up to 50 covered account–product pairs under the current filters.
- Evidence labels say "Engagement data available" or "Engagement data missing." The "Include missing engagement data" checkbox reveals the latter for review; those opportunities are always excluded from campaign export.
- Evidence briefs generated from factual templates, naming the demo requests, webinar interactions, and email-click signals behind engagement points, plus the latest interaction type and date.
- Automated tests for core business rules, date boundaries, missing coverage, duplicate signals, and manually calculated scores.

The version 3.1 demo contains **626 eligible product opportunities**, including **564 with engagement coverage** and **62 with coverage gaps**. The highest covered score is 91; one opportunity scores 90+ and 11 score 80+. Engagement discounts older signals. Complementary ownership gives modest credit for an actively used compatible product, with most points still tied to adoption. These are synthetic demonstration results, not business performance outcomes. [Why the scoring changed](docs/scoring-revision.md).

An account may appear for more than one product. Export capacity is 50 pairs, not necessarily 50 distinct accounts. Account-owner review is required before any actual campaign; this prototype does not send messages.

## How it works

`Synthetic tables → SQLite eligibility and aggregation → Python scoring → browser dashboard → campaign audience`

The browser consumes precomputed scores; it does not secretly alter their weights. Changing scoring rules means changing the documented Python/SQL logic and rebuilding. The dashboard is static so it is easy to share and inspect. Python and SQL do the analytical work; HTML, CSS, and JavaScript provide the interface.

See [business brief and data model](docs/project-brief.md), [exact methodology](docs/methodology.md), [learning and interview guide](docs/learning-guide.md), and [AI contribution record](docs/ai-use.md).

Verification details and optional client export checks are in the [validation record](docs/validation.md).

## Repository map

```text
build.py                     Synthetic data generation and Python scoring
sql/candidates.sql           Eligibility and aggregation query
index.html                   Dashboard entry point
assets/                      Interface styling and interactions
data/synthetic-source.json   Generated source records for all six tables
data/dashboard-data.js       Generated analytical output loaded by dashboard
tests/test_scoring.py        Automated business-rule checks
docs/                        Assumptions, business context, learning guide
```

## Limits and next experiments

Weights are hypotheses. Engagement amount and recency are related, so their combined influence deserves sensitivity testing. Synthetic data cannot establish conversion lift, commercial ROI, or model accuracy. Product fit and complementary ownership are fictional assumptions, not advice about real vendors.

The next useful experiment is to vary component weights and measure overlap in the top 50. Historical outcomes would support a later comparison against simple baselines using a time-separated evaluation. A live language-model integration could draft grounded summaries, but it is **not implemented in this version**.

## GitHub publication

This folder is prepared for repository upload but has not been published. Before publishing, work through the learning guide and personalize the business rationale and contribution record to reflect what you have actually reviewed. You can upload the project contents to a new repository; a GitHub Pages deployment is optional and is not configured here. Do not add private employer data, your CV, or API keys to the repository.
