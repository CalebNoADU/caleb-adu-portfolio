-- ============================================================================
-- STAGE 2 (Weeks 5–8): Schema Design, Analytical SQL & SQL Antipatterns
-- Books:
--   4. Connolly & Begg - Database Systems (Chapters 10–14: ER & 1NF–3NF)
--   5. Bill Karwin     - SQL Antipatterns, Volume 1 (MySQL 8.0 / 26.x)
--   6. Molinaro & de Graaf - SQL Cookbook (2nd Ed.)
--   7. Cathy Tanimura  - SQL for Data Analysis (1st Ed.)
-- Run with:
--   mysql --socket=/tmp/mysql_portfolio_sandbox.sock -u root < sql/stage2_schema_analytics_antipatterns.sql
-- ============================================================================

USE sakila;

-- ----------------------------------------------------------------------------
-- Exercise 2.1: Refactoring the "Jaywalking" Antipattern (1NF Violation)
-- [Karwin Vol. 1, Ch. 2 & Connolly & Begg Ch. 14]
-- Antipattern: Storing a comma-separated list of tags/IDs in a VARCHAR column.
-- Fix in MySQL 8.0/26.x: Use JSON_TABLE to split comma-separated strings into
-- a normalized 1NF/3NF intersection rows!
-- ----------------------------------------------------------------------------
WITH jaywalking_film_tags AS (
    SELECT 1 AS film_id, 'ACADEMY DINOSAUR' AS title, 'Action,Classic,Dinosaur' AS csv_tags
    UNION ALL
    SELECT 2, 'ACE GOLDFINGER', 'Action,Spy,Thriller'
    UNION ALL
    SELECT 3, 'ADAPTATION HOLES', 'Comedy,Indie'
)
SELECT
    j.film_id,
    j.title,
    jt.tag_position,
    jt.tag_name AS normalized_tag
FROM jaywalking_film_tags j
CROSS JOIN JSON_TABLE(
    CONCAT('["', REPLACE(j.csv_tags, ',', '","'), '"]'),
    '$[*]' COLUMNS (
        tag_position FOR ORDINALITY,
        tag_name VARCHAR(40) PATH '$'
    )
) AS jt;

-- ----------------------------------------------------------------------------
-- Exercise 2.2: Fixing "Ambiguous Groups" (Greatest-N-Per-Group)
-- [Karwin Vol. 1, Ch. 15 & Molinaro SQL Cookbook Ch. 3]
-- Problem: Find the top 2 highest-grossing films inside EACH film category
-- using DENSE_RANK() OVER (PARTITION BY ... ORDER BY ...).
-- ----------------------------------------------------------------------------
WITH film_revenue AS (
    SELECT
        c.name AS category_name,
        f.film_id,
        f.title,
        SUM(p.amount) AS gross_revenue,
        DENSE_RANK() OVER (
            PARTITION BY c.category_id
            ORDER BY SUM(p.amount) DESC
        ) AS revenue_rank
    FROM category c
    INNER JOIN film_category fc USING (category_id)
    INNER JOIN film f USING (film_id)
    INNER JOIN inventory i USING (film_id)
    INNER JOIN rental r USING (inventory_id)
    INNER JOIN payment p USING (rental_id)
    GROUP BY c.category_id, c.name, f.film_id, f.title
)
SELECT
    category_name,
    revenue_rank,
    title,
    gross_revenue
FROM film_revenue
WHERE revenue_rank <= 2
  AND category_name IN ('Action', 'Animation', 'Comedy', 'Sci-Fi')
ORDER BY category_name, revenue_rank, title;

-- ----------------------------------------------------------------------------
-- Exercise 2.3: Fixing "Fear of the Unknown" — NOT IN (NULL) Trap vs NOT EXISTS
-- [Karwin Vol. 1, Ch. 14 - NULL Handling]
-- In DreamHome, Staff.staffNo on PropertyForRent can be NULL (e.g., property PG4).
-- Compare why `NOT IN (SELECT staffNo FROM PropertyForRent)` returns 0 rows
-- whereas `NOT EXISTS` (or filtering NULLs) works properly!
-- ----------------------------------------------------------------------------
USE dreamhome;

-- Safe Anti-Join using NOT EXISTS: Staff who do not manage any property
SELECT
    s.staffNo,
    CONCAT(s.fName, ' ', s.lName) AS staff_name,
    s.position,
    s.branchNo
FROM Staff s
WHERE NOT EXISTS (
    SELECT 1
    FROM PropertyForRent p
    WHERE p.staffNo = s.staffNo
);

-- ----------------------------------------------------------------------------
-- Exercise 2.4: Time-Series Rolling Windows & Period-over-Period Trends
-- [Cathy Tanimura - SQL for Data Analysis, Ch. 3]
-- Problem: Calculate daily Sakila revenue, the previous active day's revenue
-- (LAG), day-over-day change, and a 3-period moving average.
-- ----------------------------------------------------------------------------
USE sakila;

WITH daily_sales AS (
    SELECT
        DATE(payment_date) AS sale_date,
        COUNT(*) AS tx_count,
        SUM(amount) AS daily_revenue
    FROM payment
    GROUP BY DATE(payment_date)
)
SELECT
    sale_date,
    tx_count,
    daily_revenue,
    LAG(daily_revenue, 1) OVER (ORDER BY sale_date) AS prev_day_revenue,
    daily_revenue - LAG(daily_revenue, 1) OVER (ORDER BY sale_date) AS dod_diff,
    ROUND(
        AVG(daily_revenue) OVER (
            ORDER BY sale_date
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    ) AS rolling_3day_avg
FROM daily_sales
ORDER BY sale_date
LIMIT 12;

-- ----------------------------------------------------------------------------
-- Exercise 2.5: Customer Cohort Retention Analysis
-- [Cathy Tanimura - SQL for Data Analysis, Ch. 4]
-- Problem: Group customers by the month of their very first rental (cohort_month)
-- and compute how many customers remained active 0, 1, 2, and 3 months later.
-- ----------------------------------------------------------------------------
WITH customer_first_rental AS (
    SELECT
        customer_id,
        DATE_FORMAT(MIN(rental_date), '%Y-%m-01') AS cohort_month
    FROM rental
    GROUP BY customer_id
),
cohort_activity AS (
    SELECT
        cfr.customer_id,
        cfr.cohort_month,
        TIMESTAMPDIFF(
            MONTH,
            STR_TO_DATE(cfr.cohort_month, '%Y-%m-%d'),
            DATE_FORMAT(r.rental_date, '%Y-%m-01')
        ) AS month_offset
    FROM customer_first_rental cfr
    INNER JOIN rental r USING (customer_id)
)
SELECT
    cohort_month,
    COUNT(DISTINCT CASE WHEN month_offset = 0 THEN customer_id END) AS month_0_cohort_size,
    COUNT(DISTINCT CASE WHEN month_offset = 1 THEN customer_id END) AS month_1_retained,
    COUNT(DISTINCT CASE WHEN month_offset = 2 THEN customer_id END) AS month_2_retained,
    COUNT(DISTINCT CASE WHEN month_offset = 3 THEN customer_id END) AS month_3_retained,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN month_offset = 1 THEN customer_id END)
        / NULLIF(COUNT(DISTINCT CASE WHEN month_offset = 0 THEN customer_id END), 0),
        1
    ) AS month_1_retention_pct
FROM cohort_activity
GROUP BY cohort_month
ORDER BY cohort_month;

-- ----------------------------------------------------------------------------
-- Exercise 2.6: Statistical Anomaly Detection (Z-Score Outliers & NTILE)
-- [Cathy Tanimura - SQL for Data Analysis, Ch. 6]
-- Problem: Identify anomalous high-spending customers whose total spend is
-- more than 2.5 standard deviations above the mean (Z-Score > 2.5).
-- ----------------------------------------------------------------------------
WITH customer_spend AS (
    SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        COUNT(p.payment_id) AS payments_count,
        SUM(p.amount) AS total_spent
    FROM customer c
    INNER JOIN payment p USING (customer_id)
    GROUP BY c.customer_id, c.first_name, c.last_name
),
spend_stats AS (
    SELECT
        customer_id,
        customer_name,
        payments_count,
        total_spent,
        AVG(total_spent) OVER () AS mean_spend,
        STDDEV_POP(total_spent) OVER () AS stddev_spend,
        NTILE(100) OVER (ORDER BY total_spent) AS spend_percentile
    FROM customer_spend
)
SELECT
    customer_id,
    customer_name,
    payments_count,
    total_spent,
    ROUND(mean_spend, 2) AS avg_customer_spend,
    ROUND((total_spent - mean_spend) / stddev_spend, 2) AS z_score,
    spend_percentile
FROM spend_stats
WHERE (total_spent - mean_spend) / stddev_spend > 2.5
ORDER BY z_score DESC;
