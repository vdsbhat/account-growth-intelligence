# Learning and interview walkthrough

## Start with the decision

Practice explaining this in your own words: "I am helping a sales team select account–product opportunities. Eligibility removes owned products and active deals. Scoring ranks the remaining candidates, and the interface shows why each was selected."

## A five-minute demonstration

1. Explain that the 500 accounts are synthetic and the analysis date is fixed.
2. Filter to a product and region. Explain why the export is a list of account–product pairs.
3. Select an account and explain all four score components.
4. Enable coverage gaps. Explain why unknown engagement differs from observed zero activity and why gaps are excluded from export.
5. Export the current audience and explain that it still requires an account owner's review.
6. Open the SQL query and the manually calculated 83-point test case.

## Read the code in this order

1. `sql/candidates.sql`: identify the table grain, aggregated engagement, and `NOT EXISTS` exclusions. This connects directly to your SQL experience.
2. `build.py`, function `score_candidate`: follow dictionary lookups, date subtraction, conditions, and the final sum.
3. `build.py`, function `build_candidates`: understand query parameters and deterministic sorting.
4. `tests/test_scoring.py`: read `test_manual_score_and_deduplicated_signals` and predict its result before running it.
5. `assets/app.js`: understand the filtering/export flow at a high level; the business score is already computed in Python.

## Python concepts this project gives you practice with

- Functions: named, reusable steps with inputs and outputs.
- Dictionaries: named fields such as `components['fit']`.
- Lists and loops: processing candidate accounts.
- Conditions: applying business rules and handling missing values.
- Dates: calculating recency and enforcing a snapshot.
- SQL access: passing query parameters through `sqlite3`.
- Tests: checking a result against an independently expected answer.

## Three small exercises

1. Add a new fictional account to a test, calculate its expected score on paper, and confirm the program agrees.
2. Change the recency threshold from 14 to 10 days. Update the boundary tests and methodology, rebuild, and inspect changes near the shortlist cutoff.
3. Change the complementary-ownership assumption for BI. Identify which tests and explanations need to change with it.

Make changes in a separate copy or a Git branch so you can compare against this starting version. Do not merely change a failed expected test value: establish the intended business outcome first.

## Questions to prepare for

- Why account–product grain instead of account grain?
- How did you prevent inflated counts when joining multiple event tables?
- Why these weights, and how would you test alternative weights?
- What does missing engagement mean? Could excluding it bias your audience?
- Why does a score of 83 not mean an 83% chance of conversion?
- What is the difference between an open deal and whitespace?
- How would you evaluate real commercial performance?
- What did AI implement, what have you personally reviewed, and what can you now modify?

## Honest ownership

The initial implementation and tests were AI-generated from the agreed brief. Before claiming that you independently built or validated a component, review it, reproduce the output, and make a change you understand. Your strongest interview account will be specific about your business judgment, what AI contributed, and what you personally checked.

You have already identified a concrete modelling issue: the initial shortlist contained too many near-perfect scores. Read `docs/scoring-revision.md` and practise explaining the causes, the revised assumptions, and why a more varied synthetic score distribution is not proof of predictive accuracy.
