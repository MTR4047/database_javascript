-- =====================================================================
-- DSE 6100 Project 2 - Anna Johnson's Dashboard Queries (MySQL 8)
-- =====================================================================

-- Query 1: Best Customers
-- Clients ranked by total amount paid on completed and paid projects.
SELECT c.clientID,
       CONCAT(c.firstName, ' ', c.lastName) AS clientName,
       COUNT(DISTINCT o.orderID)            AS completedProjects,
       SUM(bt.totalAmount)                  AS totalAmountPaid
FROM Client c
JOIN FlooringRequest r   ON r.clientID  = c.clientID
JOIN Quote q             ON q.requestID = r.requestID
JOIN InstallationOrder o ON o.quoteID   = q.quoteID
JOIN Bill b              ON b.orderID   = o.orderID
JOIN BillTotals bt       ON bt.billID   = b.billID
WHERE o.status = 'completed'
  AND b.status = 'paid'
GROUP BY c.clientID, c.firstName, c.lastName
ORDER BY totalAmountPaid DESC;


-- Query 2: Window Shoppers
-- Clients with 3 or more requests who have never accepted a quote.
SELECT c.clientID,
       CONCAT(c.firstName, ' ', c.lastName) AS clientName,
       COUNT(r.requestID)                   AS requestCount
FROM Client c
JOIN FlooringRequest r ON r.clientID = c.clientID
WHERE NOT EXISTS (
        SELECT 1
        FROM FlooringRequest r2
        JOIN Quote q ON q.requestID = r2.requestID
        WHERE r2.clientID = c.clientID
          AND q.status = 'accepted')
GROUP BY c.clientID, c.firstName, c.lastName
HAVING COUNT(r.requestID) >= 3;


-- Query 3: This Month's Flooring Sales
-- Accepted quotes in a user-specified month.
-- Placeholders: ? = year (e.g. 2026), ? = month (1-12)
SELECT CONCAT(c.firstName, ' ', c.lastName)    AS clientName,
       r.requestID                             AS projectID,
       CONCAT(a.street, ', ', a.city)          AS serviceAddress,
       q.quoteID,
       q.acceptedAt                            AS acceptedDate,
       qt.totalPrice                           AS quotedAmount,
       q.proposedStartDate                     AS scheduledInstallationDate
FROM Quote q
JOIN QuoteTotals qt    ON qt.quoteID  = q.quoteID
JOIN FlooringRequest r ON r.requestID = q.requestID
JOIN Client c          ON c.clientID  = r.clientID
JOIN Address a         ON a.addressID = r.serviceAddressID
WHERE q.status = 'accepted'
  AND YEAR(q.acceptedAt)  = ?
  AND MONTH(q.acceptedAt) = ?
ORDER BY q.acceptedAt;


-- Query 4: Registered but Inactive Clients
-- Clients who have never submitted a flooring request.
SELECT c.clientID,
       CONCAT(c.firstName, ' ', c.lastName) AS clientName,
       c.email,
       c.phoneNumber
FROM Client c
LEFT JOIN FlooringRequest r ON r.clientID = c.clientID
WHERE r.requestID IS NULL;


-- Query 5: Largest Flooring Project
-- Completed project(s) with the largest total installed square footage.
-- Ties are all shown
-- quote total if no bill exists yet
WITH OrderArea AS (
    SELECT o.orderID,
           SUM(u.installedSqFt) AS totalSqFt
    FROM InstallationOrder o
    JOIN OrderMaterialUsage u ON u.orderID = o.orderID
    WHERE o.status = 'completed'
    GROUP BY o.orderID
)
SELECT CONCAT(c.firstName, ' ', c.lastName)     AS clientName,
       r.requestID                              AS projectID,
       o.orderID,
       oa.totalSqFt                             AS totalSquareFootage,
       o.completionDate,
       COALESCE(bt.totalAmount, qt.totalPrice)  AS totalProjectPrice
FROM OrderArea oa
JOIN InstallationOrder o ON o.orderID   = oa.orderID
JOIN Quote q             ON q.quoteID   = o.quoteID
JOIN QuoteTotals qt      ON qt.quoteID  = q.quoteID
JOIN FlooringRequest r   ON r.requestID = q.requestID
JOIN Client c            ON c.clientID  = r.clientID
LEFT JOIN Bill b         ON b.orderID   = o.orderID AND b.status <> 'superseded'
LEFT JOIN BillTotals bt  ON bt.billID   = b.billID
WHERE oa.totalSqFt = (SELECT MAX(totalSqFt) FROM OrderArea);


-- Query 6: Most Popular Flooring Materials
-- Installed square footage per product, largest first.
-- Products never installed show 0.
SELECT p.productID,
       p.productName,
       p.manufacturer,
       p.categoryName,
       COALESCE(i.installedSqFt, 0) AS totalInstalledSqFt
FROM FlooringProduct p
LEFT JOIN (
    SELECT u.productID,
           SUM(u.installedSqFt) AS installedSqFt
    FROM OrderMaterialUsage u
    JOIN InstallationOrder o ON o.orderID = u.orderID
    WHERE o.status = 'completed'
    GROUP BY u.productID
) i ON i.productID = p.productID
ORDER BY totalInstalledSqFt DESC, p.productName;


-- Query 7: Material Cost Analysis
-- Completed projects where actual material used was at least 10% over
-- the quoted estimate (estimate includes waste).
SELECT CONCAT(c.firstName, ' ', c.lastName)                         AS clientName,
       o.orderID,
       p.productName,
       est.estimatedQuantity,
       u.actualQuantityUsed,
       ROUND((u.actualQuantityUsed - est.estimatedQuantity)
             / est.estimatedQuantity * 100, 1)                       AS percentDifference,
       ROUND((u.actualQuantityUsed - est.estimatedQuantity)
             * est.unitPrice, 2)                                     AS additionalMaterialCost
FROM InstallationOrder o
JOIN OrderMaterialUsage u ON u.orderID = o.orderID
JOIN (
    SELECT quoteID,
           productID,
           SUM(quantity)  AS estimatedQuantity,
           MAX(unitPrice) AS unitPrice
    FROM QuoteItem
    WHERE itemType = 'material'
    GROUP BY quoteID, productID
) est ON est.quoteID = o.quoteID AND est.productID = u.productID
JOIN FlooringProduct p ON p.productID = u.productID
JOIN Quote q           ON q.quoteID   = o.quoteID
JOIN FlooringRequest r ON r.requestID = q.requestID
JOIN Client c          ON c.clientID  = r.clientID
WHERE o.status = 'completed'
  AND u.actualQuantityUsed >= est.estimatedQuantity * 1.10
ORDER BY percentDifference DESC;


-- Query 8: Overdue Bills
-- Unpaid (or disputed) bills outstanding for more than 7 days.
SELECT CONCAT(c.firstName, ' ', c.lastName) AS clientName,
       b.billID                             AS billNumber,
       b.generatedAt                        AS billDate,
       bt.totalAmount                       AS amountDue,
       DATEDIFF(NOW(), b.generatedAt)       AS daysOutstanding
FROM Bill b
JOIN BillTotals bt       ON bt.billID   = b.billID
JOIN InstallationOrder o ON o.orderID   = b.orderID
JOIN Quote q             ON q.quoteID   = o.quoteID
JOIN FlooringRequest r   ON r.requestID = q.requestID
JOIN Client c            ON c.clientID  = r.clientID
WHERE b.status IN ('unpaid', 'disputed')
  AND b.generatedAt < NOW() - INTERVAL 7 DAY
ORDER BY daysOutstanding DESC;


-- Query 9: Problem Customers
-- Clients with at least 2 overdue bills who never paid an overdue bill
-- within 7 days after it became overdue.
--   Overdue = paid more than 7 days after the bill date,
--             or still unpaid more than 7 days after the bill date.
--   Paid within 7 days after becoming overdue = paid by bill date + 14 days.
SELECT c.clientID,
       CONCAT(c.firstName, ' ', c.lastName) AS clientName,
       COUNT(*)                             AS overdueBills
FROM Bill b
LEFT JOIN Payment p      ON p.billID    = b.billID
JOIN InstallationOrder o ON o.orderID   = b.orderID
JOIN Quote q             ON q.quoteID   = o.quoteID
JOIN FlooringRequest r   ON r.requestID = q.requestID
JOIN Client c            ON c.clientID  = r.clientID
WHERE b.status <> 'superseded'
  AND (   (p.paidAt IS NOT NULL AND p.paidAt > b.generatedAt + INTERVAL 7 DAY)
       OR (p.paidAt IS NULL     AND NOW()    > b.generatedAt + INTERVAL 7 DAY))
GROUP BY c.clientID, c.firstName, c.lastName
HAVING COUNT(*) >= 2
   AND SUM(p.paidAt IS NOT NULL AND p.paidAt <= b.generatedAt + INTERVAL 14 DAY) = 0;


-- Query 10: Excellent Customers
-- Clients who paid every bill within 24 hours of it being generated
-- (at least one paid bill required).
SELECT CONCAT(c.firstName, ' ', c.lastName)                    AS clientName,
       COUNT(*)                                                AS numberOfBills,
       SUM(bt.totalAmount)                                     AS totalAmountPaid,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE, b.generatedAt, p.paidAt)) / 60, 1)
                                                               AS avgHoursToPay
FROM Bill b
JOIN BillTotals bt       ON bt.billID   = b.billID
LEFT JOIN Payment p      ON p.billID    = b.billID
JOIN InstallationOrder o ON o.orderID   = b.orderID
JOIN Quote q             ON q.quoteID   = o.quoteID
JOIN FlooringRequest r   ON r.requestID = q.requestID
JOIN Client c            ON c.clientID  = r.clientID
WHERE b.status <> 'superseded'
GROUP BY c.clientID, c.firstName, c.lastName
HAVING COUNT(p.billID) >= 1
   AND SUM(p.paidAt IS NULL OR p.paidAt > b.generatedAt + INTERVAL 24 HOUR) = 0;