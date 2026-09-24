"""Business invariants, boundary cases, and a manually calculated reference case."""
import sqlite3
import unittest
from datetime import timedelta

from build import AS_OF, build_candidates, create_schema, generate_data, complementary_points


class ScoringTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        create_schema(self.db)
        self.db.executemany("INSERT INTO products VALUES (?,?)", [("CDP", "Customer Data Platform"), ("MAP", "Marketing Automation"), ("BI", "Analytics Platform")])
        self.db.execute("INSERT INTO accounts VALUES ('A1','Reference Account','Technology','APAC',500,'Mid-market',1)")
        self.db.execute("INSERT INTO ownership VALUES ('A1','CDP','2025-01-01','2027-01-01',100)")
        self.db.executemany("INSERT INTO fit_rules VALUES (?,'Technology','Mid-market',30)", [("CDP",), ("MAP",), ("BI",)])

    def tearDown(self):
        self.db.close()

    def event(self, identifier, days, kind="demo_request"):
        self.db.execute("INSERT INTO events VALUES (?,'A1','MAP',?,?)", (identifier, str(AS_OF - timedelta(days=days)), kind))

    def target(self):
        return next(row for row in build_candidates(self.db) if row["product_id"] == "MAP")

    def test_manual_score_and_deduplicated_signals(self):
        self.event("E1", 5)
        self.event("E2", 5)  # Same signal type/day: should not inflate the score.
        self.event("E3", 8, "email_click")
        row = self.target()
        self.assertEqual(row["event_count"], 2)
        self.assertEqual(row["components"], {"fit": 30, "engagement": 13, "recency": 20, "complement": 20})
        self.assertEqual(row["score"], 83)
        self.assertIn("1 demo request and 1 email-click signal", row["brief"])
        self.assertIn("13/30 engagement points", row["brief"])
        self.assertIn("Latest activity: demo request", row["brief"])
        self.assertIn("5 days before the analysis date", row["brief"])

    def test_brief_lists_signal_types_and_handles_latest_date_ties(self):
        self.event("D1", 10)
        self.event("D2", 11)
        self.event("W1", 1, "webinar")
        self.event("C1", 1, "email_click")
        row = self.target()
        self.assertIn("2 demo requests, 1 webinar interaction, and 1 email-click signal", row["brief"])
        self.assertIn("Latest activity: webinar interaction and email click", row["brief"])
        self.assertIn("1 day before the analysis date", row["brief"])
        self.assertNotIn("signal(s)", row["brief"])

    def test_owned_products_are_excluded(self):
        self.assertNotIn("CDP", [r["product_id"] for r in build_candidates(self.db)])

    def test_open_opportunity_excluded_even_with_multiple_events(self):
        for i in range(5):
            self.event(f"E{i}", i)
        self.db.execute("INSERT INTO opportunities VALUES ('O1','A1','MAP','2026-06-01',NULL,'Open')")
        self.assertNotIn("MAP", [r["product_id"] for r in build_candidates(self.db)])

    def test_future_closed_opportunity_was_still_open_at_snapshot(self):
        self.db.execute("INSERT INTO opportunities VALUES ('O1','A1','MAP','2026-06-01','2026-09-05','Won')")
        self.assertNotIn("MAP", [r["product_id"] for r in build_candidates(self.db)])

    def test_closed_opportunity_does_not_block_or_multiply_rows(self):
        for i in range(3):
            self.db.execute("INSERT INTO opportunities VALUES (?,'A1','MAP','2026-06-01','2026-08-01','Lost')", (f"O{i}",))
        self.event("E1", 2)
        targets = [r for r in build_candidates(self.db) if r["product_id"] == "MAP"]
        self.assertEqual(len(targets), 1)
        self.assertEqual(targets[0]["event_count"], 1)

    def test_window_is_90_calendar_dates_and_excludes_future(self):
        self.event("E1", -1)
        self.event("E2", 90)
        self.event("E3", 89, "email_click")
        row = self.target()
        self.assertEqual(row["event_count"], 1)
        self.assertEqual(row["days_since_engagement"], 89)
        self.assertEqual(row["components"]["recency"], 1)

    def test_recency_boundaries(self):
        for days, expected in [(0, 20), (14, 20), (15, 10), (30, 10), (31, 5), (89, 5), (90, 0)]:
            with self.subTest(days=days):
                self.db.execute("DELETE FROM events")
                self.event("E1", days)
                self.assertEqual(self.target()["components"]["recency"], expected)

    def test_missing_coverage_differs_from_observed_zero(self):
        observed_zero = self.target()
        self.assertTrue(observed_zero["evidence_complete"])
        self.assertIn("no relevant engagement", observed_zero["brief"])
        self.db.execute("UPDATE accounts SET engagement_observed=0")
        missing = self.target()
        self.assertFalse(missing["evidence_complete"])
        self.assertIn("coverage is missing", missing["brief"])
        self.assertEqual(missing["components"]["engagement"], 0)

    def test_unsuitable_fit_excluded(self):
        self.db.execute("UPDATE fit_rules SET fit_points=10 WHERE product_id='MAP'")
        self.assertNotIn("MAP", [r["product_id"] for r in build_candidates(self.db)])

    def test_duplicate_event_id_rejected(self):
        self.event("E1", 2)
        with self.assertRaises(sqlite3.IntegrityError):
            self.event("E1", 2)

    def test_engagement_cap(self):
        for i in range(10):
            self.event(f"E{i}", i)
        self.assertEqual(self.target()["components"]["engagement"], 18)
        for i in range(10):
            self.event(f"W{i}", i, "webinar")
            self.event(f"C{i}", i, "email_click")
        self.assertEqual(self.target()["components"]["engagement"], 30)
        self.assertEqual(self.target()["score"], 100)

    def test_no_complement_means_zero_points(self):
        self.assertEqual(complementary_points("MAP", {}), 0)

    def test_relationship_strengths(self):
        self.assertEqual(complementary_points("MAP", {"BI": 100}), 8)
        self.assertEqual(complementary_points("BI", {"CDP": 100}), 12)
        self.assertEqual(complementary_points("BI", {"CDP": 100, "MAP": 100}), 20)
        self.assertEqual(complementary_points("MAP", {"CDP": 100, "BI": 100}), 20)

    def test_product_adoption_controls_relationship_credit(self):
        for adoption, expected in [(0, 0), (25, 8), (50, 12), (75, 16), (100, 20)]:
            with self.subTest(adoption=adoption):
                self.db.execute("UPDATE ownership SET adoption_pct=?", (adoption,))
                self.assertEqual(self.target()["components"]["complement"], expected)
        self.assertEqual(complementary_points("BI", {"CDP": 50, "MAP": 75}), 14)

    def test_missing_adoption_is_explained(self):
        self.db.execute("UPDATE ownership SET adoption_pct=NULL")
        row = self.target()
        self.assertEqual(row["components"]["complement"], 0)
        self.assertIn("adoption not observed", row["component_reasons"]["complement"])

    def test_engagement_age_boundaries(self):
        for days, expected in [(0, 12), (14, 12), (15, 9), (30, 9), (31, 6), (60, 6), (61, 3), (89, 3), (90, 0)]:
            with self.subTest(days=days):
                self.db.execute("DELETE FROM events")
                self.event("D1", days)
                self.assertEqual(self.target()["components"]["engagement"], expected)

    def test_recency_order_assigns_strongest_demo_credit(self):
        self.event("old", 70)
        self.event("recent", 2)
        # Recent demo earns 12, older additional demo earns 6 * 0.25 = 1.5.
        self.assertEqual(self.target()["components"]["engagement"], 14)

    def test_clicks_alone_cannot_look_like_strong_intent(self):
        for i in range(20):
            self.event(f"E{i}", i, "email_click")
        self.assertEqual(self.target()["components"]["engagement"], 4)
        self.assertEqual(self.target()["components"]["recency"], 4)
        self.assertEqual(self.target()["score"], 58)

    def test_recent_click_does_not_refresh_old_demo_credit(self):
        self.event("D1", 50)
        self.event("C1", 0, "email_click")
        self.assertEqual(self.target()["components"]["recency"], 5)

    def test_recent_webinar_has_intermediate_recency_credit(self):
        self.event("W1", 2, "webinar")
        self.assertEqual(self.target()["components"]["engagement"], 4)
        self.assertEqual(self.target()["components"]["recency"], 12)

    def test_generated_dataset_invariants(self):
        other = sqlite3.connect(":memory:")
        create_schema(other)
        generate_data(other)
        rows = build_candidates(other)
        keys = [(r["account_id"], r["product_id"]) for r in rows]
        self.assertEqual(len(keys), len(set(keys)))
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertNotIn(row["product_id"], row["owned_products"])
            self.assertTrue(0 <= row["score"] <= 100)
            self.assertEqual(row["score"], sum(row["components"].values()))
        self.assertEqual(rows, sorted(rows, key=lambda r: (-r["score"], r["account_id"], r["product_id"])))
        other.close()


if __name__ == "__main__":
    unittest.main()
