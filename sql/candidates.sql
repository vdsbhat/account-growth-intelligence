-- Grain: one eligible account-product pair at the supplied analysis date.
-- Aggregate each one-to-many source BEFORE joining to avoid inflated counts.
WITH active_ownership AS (
    SELECT * FROM ownership WHERE start_date <= :as_of AND renewal_date >= :as_of
), owned AS (
    SELECT account_id, group_concat(product_id) AS owned_products,
           group_concat(product_id || ':' || coalesce(cast(adoption_pct AS TEXT), 'unknown')) AS ownership_adoption
    FROM active_ownership GROUP BY account_id
), distinct_signals AS (
    -- A signal is capped at one account/product/type/day, including repeat clicks.
    SELECT DISTINCT account_id, product_id, event_date, event_type
    FROM events WHERE event_date BETWEEN :window_start AND :as_of
), weighted_signals AS (
    SELECT *,
           CASE WHEN julianday(:as_of) - julianday(event_date) <= 14 THEN 1.0
                WHEN julianday(:as_of) - julianday(event_date) <= 30 THEN 0.75
                WHEN julianday(:as_of) - julianday(event_date) <= 60 THEN 0.5
                ELSE 0.25 END AS age_weight,
           row_number() OVER (PARTITION BY account_id, product_id, event_type ORDER BY event_date DESC) AS type_rank
    FROM distinct_signals
), engagement AS (
    SELECT account_id, product_id, count(*) AS event_count,
           max(event_date) AS last_event,
           sum(CASE WHEN event_type = 'demo_request' THEN 1 ELSE 0 END) AS demo_count,
           sum(CASE WHEN event_type = 'webinar' THEN 1 ELSE 0 END) AS webinar_count,
           sum(CASE WHEN event_type = 'email_click' THEN 1 ELSE 0 END) AS email_count,
           sum(CASE WHEN event_type = 'demo_request' THEN (CASE WHEN type_rank = 1 THEN 12 ELSE 6 END) * age_weight ELSE 0 END) AS demo_points,
           sum(CASE WHEN event_type = 'webinar' THEN 4 * age_weight ELSE 0 END) AS webinar_points,
           sum(CASE WHEN event_type = 'email_click' THEN age_weight ELSE 0 END) AS email_points,
           max(CASE WHEN event_type = 'demo_request' THEN event_date END) AS last_demo,
           max(CASE WHEN event_type = 'webinar' THEN event_date END) AS last_webinar,
           max(CASE WHEN event_type = 'email_click' THEN event_date END) AS last_email
    FROM weighted_signals GROUP BY account_id, product_id
)
SELECT a.*, p.product_id, p.name AS product_name, f.fit_points, o.owned_products, o.ownership_adoption,
       coalesce(e.event_count, 0) AS event_count,
       coalesce(e.demo_count, 0) AS demo_count, coalesce(e.webinar_count, 0) AS webinar_count,
       coalesce(e.email_count, 0) AS email_count,
       coalesce(e.demo_points, 0) AS demo_points, coalesce(e.webinar_points, 0) AS webinar_points,
       coalesce(e.email_points, 0) AS email_points, e.last_demo, e.last_webinar, e.last_email, e.last_event
FROM accounts a
CROSS JOIN products p
JOIN fit_rules f ON f.product_id = p.product_id
    AND f.industry = a.industry AND f.size_band = a.size_band
JOIN owned o ON o.account_id = a.account_id
LEFT JOIN engagement e ON e.account_id = a.account_id AND e.product_id = p.product_id
WHERE f.fit_points >= 20
AND NOT EXISTS (
    SELECT 1 FROM active_ownership x
    WHERE x.account_id = a.account_id AND x.product_id = p.product_id
)
AND NOT EXISTS (
    SELECT 1 FROM opportunities x
    WHERE x.account_id = a.account_id AND x.product_id = p.product_id
      AND x.created_date <= :as_of
      AND (x.closed_date IS NULL OR x.closed_date > :as_of)
);
