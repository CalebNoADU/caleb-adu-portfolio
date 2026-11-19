-- ============================================================================
-- STAGE 1 (Weeks 1–4): Core MySQL Foundations & Set-Based Querying
-- Books:
--   1. Alan Beaulieu - Learning SQL (3rd Ed.) [Sakila DB]
--   2. Joel Murach   - Murach's MySQL (4th Ed.)
--   3. John Viescas  - SQL Queries for Mere Mortals (4th Ed.)
-- Run with:
--   mysql --socket=/tmp/mysql_portfolio_sandbox.sock -u root < sql/stage1_foundations_sakila.sql
-- ============================================================================

USE sakila;

-- ----------------------------------------------------------------------------
-- Exercise 1.1: Conditional Logic (CASE) & Temporal/String Functions
-- [Beaulieu Ch. 7 & Ch. 11]
-- Problem: Classify Sakila films into rental duration tiers and pivot the
-- count of films across MPAA ratings (G, PG, PG-13, R, NC-17) in a single row.
-- ----------------------------------------------------------------------------
SELECT
    SUM(CASE WHEN rating = 'G'     THEN 1 ELSE 0 END) AS G_rated,
    SUM(CASE WHEN rating = 'PG'    THEN 1 ELSE 0 END) AS PG_rated,
    SUM(CASE WHEN rating = 'PG-13' THEN 1 ELSE 0 END) AS PG13_rated,
    SUM(CASE WHEN rating = 'R'     THEN 1 ELSE 0 END) AS R_rated,
    SUM(CASE WHEN rating = 'NC-17' THEN 1 ELSE 0 END) AS NC17_rated,
    COUNT(*) AS total_films
FROM film;

-- ----------------------------------------------------------------------------
-- Exercise 1.2: Multi-Table INNER & OUTER Joins
-- [Beaulieu Ch. 5 & Ch. 10 / Murach Ch. 4]
-- Problem: Find all films in the 'Sci-Fi' category that are currently NOT in
-- inventory at Store 1 (demonstrating LEFT OUTER JOIN anti-join pattern).
-- ----------------------------------------------------------------------------
SELECT
    f.film_id,
    f.title,
    c.name AS category_name,
    COUNT(i.inventory_id) AS store_1_copies
FROM film f
INNER JOIN film_category fc USING (film_id)
INNER JOIN category c USING (category_id)
LEFT JOIN inventory i
    ON f.film_id = i.film_id AND i.store_id = 1
WHERE c.name = 'Sci-Fi'
GROUP BY f.film_id, f.title, c.name
HAVING store_1_copies = 0
ORDER BY f.title;

-- ----------------------------------------------------------------------------
-- Exercise 1.3: Hierarchical Subtotals with GROUP BY ... WITH ROLLUP
-- [Beaulieu Ch. 8 / Viescas Ch. 13]
-- Problem: Calculate total revenue by store and film category, including
-- store-level subtotals and a grand total row using WITH ROLLUP and GROUPING().
-- ----------------------------------------------------------------------------
SELECT
    IF(GROUPING(s.store_id), 'ALL STORES', CONCAT('Store #', s.store_id)) AS store_label,
    IF(GROUPING(c.name), 'ALL CATEGORIES', c.name) AS category_label,
    COUNT(p.payment_id) AS rental_payments,
    SUM(p.amount) AS total_revenue
FROM payment p
INNER JOIN rental r USING (rental_id)
INNER JOIN inventory i USING (inventory_id)
INNER JOIN store s USING (store_id)
INNER JOIN film_category fc ON i.film_id = fc.film_id
INNER JOIN category c USING (category_id)
WHERE c.name IN ('Action', 'Animation', 'Sci-Fi', 'Sports')
GROUP BY s.store_id, c.name WITH ROLLUP;

-- ----------------------------------------------------------------------------
-- Exercise 1.4: Thinking in Sets & Relational Division
-- [Viescas Ch. 11 & Ch. 15 - Translating English to Set-Based SQL]
-- English Statement: "Find customers who have rented at least one film from
-- EVERY one of the 5 MPAA ratings ('G', 'PG', 'PG-13', 'R', 'NC-17')."
-- ----------------------------------------------------------------------------
SELECT
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    COUNT(DISTINCT f.rating) AS distinct_ratings_rented,
    COUNT(r.rental_id) AS total_rentals
FROM customer c
INNER JOIN rental r USING (customer_id)
INNER JOIN inventory i USING (inventory_id)
INNER JOIN film f USING (film_id)
GROUP BY c.customer_id, c.first_name, c.last_name
HAVING COUNT(DISTINCT f.rating) = (
    SELECT COUNT(DISTINCT rating) FROM film
)
ORDER BY total_rentals DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Exercise 1.5: Querying Native JSON Documents in MySQL 8.0 / 8.4 / 26.x
-- [Beaulieu Ch. 17 - Working with JSON]
-- Problem: Construct a JSON summary payload per actor and query it using
-- JSON_EXTRACT / -> and JSON_TABLE.
-- ----------------------------------------------------------------------------
WITH actor_json_summary AS (
    SELECT
        a.actor_id,
        JSON_OBJECT(
            'actor_name', CONCAT(a.first_name, ' ', a.last_name),
            'film_count', COUNT(fa.film_id),
            'top_ratings', JSON_ARRAYAGG(f.rating)
        ) AS profile_doc
    FROM actor a
    INNER JOIN film_actor fa USING (actor_id)
    INNER JOIN film f USING (film_id)
    WHERE a.actor_id <= 5
    GROUP BY a.actor_id, a.first_name, a.last_name
)
SELECT
    actor_id,
    JSON_UNQUOTE(JSON_EXTRACT(profile_doc, '$.actor_name')) AS actor_name,
    CAST(JSON_EXTRACT(profile_doc, '$.film_count') AS UNSIGNED) AS film_count
FROM actor_json_summary
ORDER BY film_count DESC;

-- ----------------------------------------------------------------------------
-- Exercise 1.6: Connolly & Begg Hotel Exercise Fix (Section 1 of Guide)
-- Note: In Connolly & Begg Exercise 7.17 (p. 268), a print typo replaced '='
-- with '5' in: WHERE h.hotelNo = r.hotelNo AND r.roomNo = b.roomNo
-- Here is the corrected query running against your local dreamhome database!
-- ----------------------------------------------------------------------------
USE dreamhome;

SELECT
    h.hotelName,
    r.roomNo,
    r.type AS room_type,
    r.price,
    g.guestName,
    b.dateFrom,
    b.dateTo
FROM Hotel h
INNER JOIN Room r
    ON h.hotelNo = r.hotelNo
INNER JOIN Booking b
    ON r.hotelNo = b.hotelNo AND r.roomNo = b.roomNo
INNER JOIN Guest g
    ON b.guestNo = g.guestNo
WHERE h.city = 'London'
ORDER BY h.hotelName, b.dateFrom;
