"""Build a reproducible, entirely synthetic account-prioritization demo.

Run: python build.py
Only Python's standard library is required. Read docs/learning-guide.md first.
"""
import json
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AS_OF = date(2026, 9, 1)
PRODUCTS = [("CDP", "Customer Data Platform"), ("MAP", "Marketing Automation"), ("BI", "Analytics Platform")]
INDUSTRIES = ["Retail", "Technology", "Manufacturing", "Professional Services", "Healthcare"]
REGIONS = ["APAC", "EMEA", "Americas"]
INDUSTRY_FIT = {
    "CDP": {"Retail": 20, "Technology": 18, "Manufacturing": 12, "Professional Services": 14, "Healthcare": 16},
    "MAP": {"Retail": 18, "Technology": 20, "Manufacturing": 12, "Professional Services": 18, "Healthcare": 12},
    "BI": {"Retail": 16, "Technology": 20, "Manufacturing": 18, "Professional Services": 18, "Healthcare": 16},
}
SIZE_FIT = {
    "CDP": {"Small": 2, "Mid-market": 7, "Enterprise": 10},
    "MAP": {"Small": 6, "Mid-market": 10, "Enterprise": 8},
    "BI": {"Small": 4, "Mid-market": 8, "Enterprise": 10},
}
RELATIONSHIP_POINTS = {"CDP": {"MAP": 20, "BI": 8}, "MAP": {"CDP": 20, "BI": 8}, "BI": {"CDP": 12, "MAP": 8}}


def complementary_points(product, adoption):
    """For products with observed use: 20% compatibility, 80% adoption."""
    weighted = sum(RELATIONSHIP_POINTS[product].get(item, 0) * (0.2 + 0.8 * percent / 100)
                   for item, percent in adoption.items() if percent is not None and percent > 0)
    return min(20, int(weighted + 0.5))


def recency_points(last_date, as_of, maximum):
    if not last_date:
        return 0
    age = (as_of - date.fromisoformat(last_date)).days
    return maximum if 0 <= age <= 14 else maximum // 2 if 15 <= age <= 30 else maximum // 4 if 31 <= age <= 89 else 0


def human_list(items):
    if len(items) < 2:
        return "".join(items)
    if len(items) == 2:
        return " and ".join(items)
    return ", ".join(items[:-1]) + ", and " + items[-1]


def create_schema(conn):
    conn.executescript("""
    PRAGMA foreign_keys = ON;
    CREATE TABLE accounts(account_id TEXT PRIMARY KEY, name TEXT, industry TEXT,
      region TEXT, employees INTEGER, size_band TEXT, engagement_observed INTEGER);
    CREATE TABLE products(product_id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE ownership(account_id TEXT REFERENCES accounts, product_id TEXT REFERENCES products,
      start_date TEXT, renewal_date TEXT, adoption_pct INTEGER CHECK(adoption_pct BETWEEN 0 AND 100),
      PRIMARY KEY(account_id, product_id));
    CREATE TABLE events(event_id TEXT PRIMARY KEY, account_id TEXT REFERENCES accounts,
      product_id TEXT REFERENCES products, event_date TEXT, event_type TEXT);
    CREATE TABLE opportunities(opportunity_id TEXT PRIMARY KEY, account_id TEXT REFERENCES accounts,
      product_id TEXT REFERENCES products, created_date TEXT, closed_date TEXT, status TEXT);
    CREATE TABLE fit_rules(product_id TEXT REFERENCES products, industry TEXT, size_band TEXT,
      fit_points INTEGER, PRIMARY KEY(product_id, industry, size_band));
    """)


def generate_data(conn, count=500, seed=42):
    """Scenario-based synthetic activity, not observed market rates or buying labels."""
    rng = random.Random(seed)
    activity_rng = random.Random(seed + 1000)
    adoption_rng = random.Random(seed + 2000)
    conn.executemany("INSERT INTO products VALUES (?, ?)", PRODUCTS)
    for product, _ in PRODUCTS:
        for industry in INDUSTRIES:
            for band in ("Small", "Mid-market", "Enterprise"):
                industry_fit = INDUSTRY_FIT[product][industry]
                size_fit = SIZE_FIT[product][band]
                conn.execute("INSERT INTO fit_rules VALUES (?,?,?,?)", (product, industry, band, industry_fit + size_fit))
    event_number = 0
    for number in range(1, count + 1):
        account = f"A{number:04d}"
        employees = rng.choice([80, 150, 350, 800, 2500, 8000])
        band = "Small" if employees < 200 else "Mid-market" if employees < 1000 else "Enterprise"
        observed = int(rng.random() > 0.10)
        conn.execute("INSERT INTO accounts VALUES (?,?,?,?,?,?,?)", (
            account, f"Demo Account {number:03d}", rng.choice(INDUSTRIES), rng.choice(REGIONS), employees, band, observed))
        owned = rng.sample([p[0] for p in PRODUCTS], rng.choices([1, 2, 3], weights=[65, 30, 5])[0])
        for product in owned:
            usage_band = adoption_rng.choices(["low", "moderate", "high"], weights=[20, 55, 25])[0]
            adoption = adoption_rng.randint(*{"low": (5, 34), "moderate": (35, 75), "high": (76, 100)}[usage_band])
            conn.execute("INSERT INTO ownership VALUES (?,?,?,?,?)", (
                account, product, str(AS_OF - timedelta(days=rng.randint(100, 900))), str(AS_OF + timedelta(days=rng.randint(1, 365))), adoption))
        for product, _ in PRODUCTS:
            if observed:
                # Most products receive little attention; active evaluation is rarer.
                # Separate RNG streams keep activity changes from changing accounts.
                scenario = activity_rng.choices(["quiet", "exploring", "evaluating"], weights=[60, 30, 10])[0]
                if scenario == "quiet":
                    event_count = activity_rng.choices([0, 1, 2], weights=[60, 25, 15])[0]
                    type_weights, day_range = [88, 11, 1], (0, 179)
                elif scenario == "exploring":
                    event_count = activity_rng.randint(2, 6)
                    type_weights, day_range = [65, 30, 5], (15, 119)
                else:
                    event_count = activity_rng.randint(5, 10)
                    type_weights, day_range = [40, 35, 25], (0, 44)
                for _ in range(event_count):
                    event_number += 1
                    conn.execute("INSERT INTO events VALUES (?,?,?,?,?)", (
                        f"E{event_number:06d}", account, product,
                        str(AS_OF - timedelta(days=activity_rng.randint(*day_range))),
                        activity_rng.choices(["email_click", "webinar", "demo_request"], weights=type_weights)[0]))
            if rng.random() < 0.18:
                status = rng.choice(["Open", "Won", "Lost"])
                closed = None if status == "Open" else str(AS_OF - timedelta(days=rng.randint(-10, 40)))
                conn.execute("INSERT INTO opportunities VALUES (?,?,?,?,?,?)", (
                    f"O{number:04d}{product}", account, product, str(AS_OF - timedelta(days=rng.randint(50, 120))), closed, status))
    conn.commit()


def score_candidate(row, as_of):
    """Keep business rules small enough to explain line by line in an interview."""
    item = dict(row)
    observed = bool(item["engagement_observed"])
    owned = sorted(filter(None, (item["owned_products"] or "").split(",")))
    item["owned_products"] = owned
    days = (as_of - date.fromisoformat(item["last_event"])).days if observed and item["last_event"] else None
    demos, webinars, clicks = item["demo_count"], item["webinar_count"], item["email_count"]
    engagement_subtotals = {"demos": min(18, item["demo_points"]), "webinars": min(8, item["webinar_points"]), "clicks": min(4, item["email_points"])}
    engagement = int(sum(engagement_subtotals.values()) + 0.5) if observed else 0
    # A recent email click cannot receive the same recency credit as a demo request.
    recency = max(recency_points(item["last_demo"], as_of, 20),
                  recency_points(item["last_webinar"], as_of, 12),
                  recency_points(item["last_email"], as_of, 4)) if observed else 0
    adoption = {product: None if value == "unknown" else int(value)
                for product, value in (entry.split(":") for entry in item["ownership_adoption"].split(","))}
    complement = complementary_points(item["product_id"], adoption)
    item["ownership_adoption"] = adoption
    item["components"] = {"fit": item["fit_points"], "engagement": engagement, "recency": recency, "complement": complement}
    item["score"] = sum(item["components"].values())
    item["evidence_complete"] = observed
    item["days_since_engagement"] = days
    item["component_reasons"] = {
        "fit": f"Suitability for {item['industry']} and {item['size_band']} accounts under the product-specific fit matrix.",
        "engagement": (f"Age-adjusted credit: demos {engagement_subtotals['demos']:g}/18, webinars {engagement_subtotals['webinars']:g}/8, clicks {engagement_subtotals['clicks']:g}/4. Older signals earn less; total rounded to whole points." if observed else "Tracking coverage is missing; no engagement credit assigned."),
        "recency": ("Strongest recency credit across demos, webinars, and clicks. Recent clicks alone earn at most 4 points." if observed else "Tracking coverage is missing; no recency credit assigned."),
        "complement": "; ".join(f"{product}: adoption not observed (0 credit)" if adoption[product] is None else f"{product}: no active adoption (0 credit)" if adoption[product] == 0 else f"{product}: {RELATIONSHIP_POINTS[item['product_id']].get(product, 0)} × (20% compatibility + 80% × {adoption[product]}% adoption)" for product in owned) + ". Total rounded and capped at 20.",
    }
    if not observed:
        evidence = "Engagement coverage is missing; engagement and recency contribute zero. Validate coverage before targeting."
        action = "Resolve missing engagement coverage before campaign selection."
    elif days is None:
        evidence = "Tracking is available, but no relevant engagement was recorded in the 90-day window."
        action = "Validate the account's needs before considering a nurture campaign."
    else:
        activities = [f"{count} {label}{'' if count == 1 else 's'}"
                      for count, label in [(demos, "demo request"), (webinars, "webinar interaction"), (clicks, "email-click signal")] if count]
        latest_types = [label for field, label in [("last_demo", "demo request"), ("last_webinar", "webinar interaction"), ("last_email", "email click")]
                        if item[field] == item["last_event"]]
        relative_date = "on the analysis date" if days == 0 else f"{days} {'day' if days == 1 else 'days'} before the analysis date"
        evidence = (f"Product-related activity in the 90-day window: {human_list(activities)} "
                    "(one signal per activity type per day). "
                    f"This contributes {engagement}/30 engagement points after age adjustment and caps. "
                    f"Latest activity: {human_list(latest_types) or 'recorded interaction'} on {item['last_event']} ({relative_date}).")
        action = "Ask the account owner to validate product need and agree a targeted follow-up."
    item["brief"] = (f"{item['name']} is eligible for {item['product_name']}: the product is not owned and has no open opportunity as of {as_of}. "
                     f"Its rule-based priority score is {item['score']}/100. {evidence}")
    item["suggested_action"] = action
    return item


def build_candidates(conn, as_of=AS_OF):
    conn.row_factory = sqlite3.Row
    rows = conn.execute((ROOT / "sql" / "candidates.sql").read_text(encoding="utf-8"), {
        "as_of": str(as_of), "window_start": str(as_of - timedelta(days=89))}).fetchall()
    items = [score_candidate(row, as_of) for row in rows]
    return sorted(items, key=lambda x: (-x["score"], x["account_id"], x["product_id"]))


def main():
    # Build in memory: no existing database or user records are overwritten.
    conn = sqlite3.connect(":memory:")
    create_schema(conn)
    generate_data(conn)
    candidates = build_candidates(conn)
    dataset = {table: [dict(row) for row in conn.execute(f"SELECT * FROM {table}")]
               for table in ["accounts", "products", "ownership", "events", "opportunities", "fit_rules"]}
    payload = {"as_of": str(AS_OF), "scoring_version": "3.1", "account_count": len(dataset["accounts"]), "candidates": candidates}
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "synthetic-source.json").write_text(json.dumps(dataset, indent=2), encoding="utf-8")
    (ROOT / "data" / "dashboard-data.js").write_text("window.DEMO_DATA = " + json.dumps(payload) + ";\n", encoding="utf-8")
    print(f"Built {len(dataset['accounts'])} synthetic accounts; {len(candidates)} eligible account-product pairs.")
    print(f"{sum(x['evidence_complete'] for x in candidates)} pairs have complete engagement coverage.")
    print("Open index.html in your browser, or run: python -m http.server 8501 --bind 127.0.0.1")
    conn.close()


if __name__ == "__main__":
    main()
