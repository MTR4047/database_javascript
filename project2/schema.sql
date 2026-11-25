-- =====================================================================
-- DSE 6100 Project 2 - Flooring Business Database (Anna Johnson)
-- Relational schema translated from the ER diagram.
-- Target: MySQL 8.0.16 or later (CHECK constraints are enforced from 8.0.16).
-- Text sizes: short = VARCHAR(50), medium = VARCHAR(100), long = TEXT.
--
-- Mapping notes
--   * Strong entities -> one table each, generated INT keys.
--   * Weak entities (RoomArea, QuoteItem, BillItem, Payment) -> composite
--     keys that include the owner's key; ON DELETE CASCADE from the owner.
--   * 1:N and N:1 relationships -> foreign key on the "many" side.
--   * 1:1 "becomes" (Quote -> Order) -> UNIQUE foreign key on InstallationOrder.
--   * M:N "uses" (Order -> Product) -> junction table OrderMaterialUsage.
--   * Derived attributes -> generated columns (line quantity/total) or
--     views (request, quote and bill totals).
--   * "Order" is a reserved word in SQL, so the table is InstallationOrder.
-- =====================================================================

DROP VIEW  IF EXISTS BillTotals;
DROP VIEW  IF EXISTS QuoteTotals;
DROP VIEW  IF EXISTS RequestTotals;
DROP TABLE IF EXISTS Negotiation;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS BillItem;
DROP TABLE IF EXISTS Bill;
DROP TABLE IF EXISTS OrderMaterialUsage;
DROP TABLE IF EXISTS InstallationOrder;
DROP TABLE IF EXISTS QuoteItem;
DROP TABLE IF EXISTS Quote;
DROP TABLE IF EXISTS RoomArea;
DROP TABLE IF EXISTS Photo;
DROP TABLE IF EXISTS FlooringRequest;
DROP TABLE IF EXISTS FlooringProduct;
DROP TABLE IF EXISTS Pattern;
DROP TABLE IF EXISTS FlooringCategory;
DROP TABLE IF EXISTS Client;
DROP TABLE IF EXISTS Address;

-- ---------------------------------------------------------------------
-- Clients and addresses
-- ---------------------------------------------------------------------

-- Addresses: US only, shared by clients (home) and requests (service location).
CREATE TABLE Address (
    addressID   INT          AUTO_INCREMENT PRIMARY KEY,
    street      VARCHAR(100) NOT NULL,
    city        VARCHAR(50)  NOT NULL,
    state       CHAR(2)      NOT NULL,          -- e.g. 'MI'
    postalCode  VARCHAR(50)  NOT NULL           -- text keeps leading zeros and ZIP+4
);

-- Clients: each client lives at exactly one address (N:1, total).
CREATE TABLE Client (
    clientID        INT          AUTO_INCREMENT PRIMARY KEY,
    firstName       VARCHAR(50)  NOT NULL,
    lastName        VARCHAR(50)  NOT NULL,
    phoneNumber     VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,   -- also the login name
    passwordHash    VARCHAR(100) NOT NULL,
    cardNumber      VARCHAR(50)  NOT NULL,          -- text keeps all 13-19 digits
    cardCVV         VARCHAR(50)  NOT NULL,          -- text keeps leading zeros
    cardExpiration  DATE         NOT NULL,          -- last day of the expiry month
    addressID       INT          NOT NULL,
    FOREIGN KEY (addressID) REFERENCES Address(addressID)
);

-- ---------------------------------------------------------------------
-- Catalog: categories, patterns, products
-- ---------------------------------------------------------------------

-- Flooring categories: small list maintained by Anna, keyed by name.
CREATE TABLE FlooringCategory (
    categoryName VARCHAR(50) PRIMARY KEY
);

-- Patterns: supported installation patterns maintained by Anna, keyed by name.
CREATE TABLE Pattern (
    patternName VARCHAR(50) PRIMARY KEY
);

-- Flooring products: each product belongs to exactly one category (N:1, total).
CREATE TABLE FlooringProduct (
    productID     INT            AUTO_INCREMENT PRIMARY KEY,
    productName   VARCHAR(100)   NOT NULL,
    manufacturer  VARCHAR(100)   NOT NULL,
    materialStyle VARCHAR(100)   NULL,
    color         VARCHAR(50)    NULL,
    unitPrice     DECIMAL(10,2)  NOT NULL CHECK (unitPrice >= 0),
    pricingUnit   ENUM('sq_ft','box','piece') NOT NULL,
    lengthIn      DECIMAL(6,2)   NULL,              -- Dimensions (composite)
    widthIn       DECIMAL(6,2)   NULL,
    sqFtPerBox    DECIMAL(6,2)   NULL,
    description   TEXT           NULL,
    categoryName  VARCHAR(50)    NOT NULL,
    FOREIGN KEY (categoryName) REFERENCES FlooringCategory(categoryName),
    -- Dimensions: both parts or neither.
    CONSTRAINT chk_product_dimensions CHECK ((lengthIn IS NULL) = (widthIn IS NULL)),
    -- Box-priced products need their coverage per box.
    CONSTRAINT chk_product_box_coverage CHECK (pricingUnit <> 'box' OR sqFtPerBox IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- Flooring requests, rooms and photos
-- ---------------------------------------------------------------------

-- Flooring requests: each request has exactly one client and one service address (N:1, total).
CREATE TABLE FlooringRequest (
    requestID          INT           AUTO_INCREMENT PRIMARY KEY,
    clientID           INT           NOT NULL,
    serviceAddressID   INT           NOT NULL,
    preferredStartDate DATE          NOT NULL,
    preferredEndDate   DATE          NULL,            -- NULL = single date, TODO: Add submitted at date
    proposedBudget     DECIMAL(10,2) NOT NULL CHECK (proposedBudget > 0),
    notes              TEXT          NULL,
    status             ENUM('submitted','rejected','negotiating','accepted','cancelled','completed')
                                     NOT NULL DEFAULT 'submitted',
    rejectionReason    TEXT          NULL,
    FOREIGN KEY (clientID)         REFERENCES Client(clientID),
    FOREIGN KEY (serviceAddressID) REFERENCES Address(addressID),
    CONSTRAINT chk_request_dates CHECK (preferredEndDate IS NULL OR preferredEndDate >= preferredStartDate),
    CONSTRAINT chk_request_rejection CHECK (status <> 'rejected' OR rejectionReason IS NOT NULL)
);

-- Photos: each photo belongs to exactly one request, at most 5 per request (N:1, total).
CREATE TABLE Photo (
    photoID   INT          AUTO_INCREMENT PRIMARY KEY,
    requestID INT          NOT NULL,
    filePath  TEXT         NOT NULL,
    FOREIGN KEY (requestID) REFERENCES FlooringRequest(requestID) ON DELETE CASCADE
);

-- Rooms/areas: weak entity owned by its request, with one desired product or category (N:1, total).
CREATE TABLE RoomArea (
    requestID           INT           NOT NULL,
    roomName            VARCHAR(50)   NOT NULL,       -- partial key
    squareFootage       DECIMAL(8,2)  NOT NULL CHECK (squareFootage > 0),
    currentFlooringType VARCHAR(50)   NULL,
    removalRequired     BOOLEAN       NOT NULL DEFAULT FALSE,
    desiredProductID    INT           NULL,
    desiredCategoryName VARCHAR(50)   NULL,
    patternName         VARCHAR(50)   NULL,
    PRIMARY KEY (requestID, roomName),
    FOREIGN KEY (requestID)           REFERENCES FlooringRequest(requestID) ON DELETE CASCADE,
    FOREIGN KEY (desiredProductID)    REFERENCES FlooringProduct(productID),
    FOREIGN KEY (desiredCategoryName) REFERENCES FlooringCategory(categoryName),
    FOREIGN KEY (patternName)         REFERENCES Pattern(patternName),
    CONSTRAINT chk_room_desired CHECK ((desiredProductID IS NULL) <> (desiredCategoryName IS NULL))
);

-- ---------------------------------------------------------------------
-- Quotes and quote items
-- ---------------------------------------------------------------------

-- Quotes: each quote belongs to exactly one request; a revision is a new row (N:1, total).
CREATE TABLE Quote (
    quoteID           INT       AUTO_INCREMENT PRIMARY KEY,
    requestID         INT       NOT NULL,
    createdAt         DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proposedStartDate DATE      NOT NULL,
    proposedEndDate   DATE      NULL,
    note              TEXT      NULL,
    status            ENUM('pending','countered','accepted','rejected','cancelled','superseded')
                                NOT NULL DEFAULT 'pending',
    acceptedAt        DATETIME  NULL,                   -- used by query 3
    FOREIGN KEY (requestID) REFERENCES FlooringRequest(requestID),
    CONSTRAINT chk_quote_dates    CHECK (proposedEndDate IS NULL OR proposedEndDate >= proposedStartDate),
    CONSTRAINT chk_quote_accepted CHECK ((status = 'accepted') = (acceptedAt IS NOT NULL))
);

-- Quote items: weak entity owned by its quote; only material items link to a product (N:1, total).
CREATE TABLE QuoteItem (
    quoteID      INT           NOT NULL,
    lineNumber   INT           NOT NULL,                -- partial key, set by the backend
    itemType     ENUM('material','removal','labor','underlayment','trim','stairs','delivery','charge','discount')
                               NOT NULL,
    description  TEXT          NOT NULL,
    baseQuantity DECIMAL(10,2) NOT NULL CHECK (baseQuantity > 0),
    wastePct     DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK (wastePct BETWEEN 0 AND 100),
    unitPrice    DECIMAL(10,2) NOT NULL,                -- negative for discounts
    quantity     DECIMAL(10,2) AS (ROUND(baseQuantity * (1 + wastePct / 100), 2)) STORED,
    lineTotal    DECIMAL(10,2) AS (ROUND(baseQuantity * (1 + wastePct / 100) * unitPrice, 2)) STORED,
    productID    INT           NULL,
    PRIMARY KEY (quoteID, lineNumber),
    FOREIGN KEY (quoteID)   REFERENCES Quote(quoteID) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES FlooringProduct(productID),
    CONSTRAINT chk_qitem_product CHECK (itemType <> 'material' OR productID IS NOT NULL),
    CONSTRAINT chk_qitem_sign    CHECK ((itemType = 'discount' AND unitPrice <= 0)
                                     OR (itemType <> 'discount' AND unitPrice >= 0))
);

-- ---------------------------------------------------------------------
-- Orders and actual material usage
-- ---------------------------------------------------------------------

-- Installation orders: each order comes from exactly one accepted quote (1:1, total).
CREATE TABLE InstallationOrder (
    orderID                INT   AUTO_INCREMENT PRIMARY KEY,
    quoteID                INT   NOT NULL UNIQUE,
    actualInstallationDate DATE  NULL,
    completionDate         DATE  NULL,
    status                 ENUM('scheduled','in_progress','completed','canceled')
                                 NOT NULL DEFAULT 'scheduled',
    completionNotes        TEXT  NULL,
    FOREIGN KEY (quoteID) REFERENCES Quote(quoteID),
    CONSTRAINT chk_order_dates     CHECK (completionDate IS NULL OR actualInstallationDate IS NULL
                                          OR completionDate >= actualInstallationDate),
    CONSTRAINT chk_order_completed CHECK (status <> 'completed' OR completionDate IS NOT NULL)
);

-- Order material usage: products actually installed on each order (M:N).
CREATE TABLE OrderMaterialUsage (
    orderID            INT           NOT NULL,
    productID          INT           NOT NULL,
    installedSqFt      DECIMAL(10,2) NOT NULL CHECK (installedSqFt > 0),
    actualQuantityUsed DECIMAL(10,2) NOT NULL CHECK (actualQuantityUsed > 0),
    PRIMARY KEY (orderID, productID),
    FOREIGN KEY (orderID)   REFERENCES InstallationOrder(orderID) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES FlooringProduct(productID)
);

-- ---------------------------------------------------------------------
-- Bills, bill items and payments
-- ---------------------------------------------------------------------

-- Bills: each bill belongs to exactly one order; a revision is a new row (N:1, total).
CREATE TABLE Bill (
    billID      INT       AUTO_INCREMENT PRIMARY KEY,
    orderID     INT       NOT NULL,
    generatedAt DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- bill date (queries 8-10)
    status      ENUM('unpaid','disputed','paid','superseded') NOT NULL DEFAULT 'unpaid',
    FOREIGN KEY (orderID) REFERENCES InstallationOrder(orderID)
);

-- Bill items: weak entity owned by its bill (N:1, total).
CREATE TABLE BillItem (
    billID      INT           NOT NULL,
    lineNumber  INT           NOT NULL,                 -- partial key, set by the backend
    itemType    ENUM('material','removal','labor','underlayment','trim','stairs','delivery',
                     'additional_material','subfloor_repair','additional_labor','upgrade',
                     'charge','discount','credit') NOT NULL,
    description TEXT          NOT NULL,
    quantity    DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unitPrice   DECIMAL(10,2) NOT NULL,                 -- negative for discounts and credits
    lineTotal   DECIMAL(10,2) AS (ROUND(quantity * unitPrice, 2)) STORED,
    PRIMARY KEY (billID, lineNumber),
    FOREIGN KEY (billID) REFERENCES Bill(billID) ON DELETE CASCADE,
    CONSTRAINT chk_bitem_sign CHECK ((itemType IN ('discount','credit') AND unitPrice <= 0)
                                  OR (itemType NOT IN ('discount','credit') AND unitPrice >= 0))
);

-- Payments: weak entity owned by its bill, at most one per bill (1:1, total).
CREATE TABLE Payment (
    billID INT      PRIMARY KEY,
    paidAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (billID) REFERENCES Bill(billID)
);

-- ---------------------------------------------------------------------
-- Negotiation history (quote counterproposals and bill disputes)
-- ---------------------------------------------------------------------

-- Negotiations: each message belongs to exactly one quote or one bill (N:1).
CREATE TABLE Negotiation (
    negotiationID INT       AUTO_INCREMENT PRIMARY KEY,
    quoteID       INT       NULL,
    billID        INT       NULL,
    sender        ENUM('client','contractor') NOT NULL,
    messageText   TEXT      NOT NULL,
    createdAt     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quoteID) REFERENCES Quote(quoteID),
    FOREIGN KEY (billID)  REFERENCES Bill(billID),
    CONSTRAINT chk_negotiation_owner CHECK ((quoteID IS NULL) <> (billID IS NULL))
);

-- ---------------------------------------------------------------------
-- Derived attributes (views)
-- ---------------------------------------------------------------------

-- Request totals: Total_Square_Footage, derived from the request's rooms.
CREATE VIEW RequestTotals AS
SELECT r.requestID,
       COALESCE(SUM(ra.squareFootage), 0) AS totalSquareFootage
FROM FlooringRequest r
LEFT JOIN RoomArea ra ON ra.requestID = r.requestID
GROUP BY r.requestID;

-- Quote totals: material cost, labor cost, other charges and total price, derived from the quote's items.
CREATE VIEW QuoteTotals AS
SELECT q.quoteID,
       COALESCE(SUM(CASE WHEN qi.itemType = 'material' THEN qi.lineTotal END), 0) AS estimatedMaterialCost,
       COALESCE(SUM(CASE WHEN qi.itemType = 'labor'    THEN qi.lineTotal END), 0) AS estimatedLaborCost,
       COALESCE(SUM(CASE WHEN qi.itemType NOT IN ('material','labor') THEN qi.lineTotal END), 0) AS otherChargesDiscounts,
       COALESCE(SUM(qi.lineTotal), 0) AS totalPrice
FROM Quote q
LEFT JOIN QuoteItem qi ON qi.quoteID = q.quoteID
GROUP BY q.quoteID;

-- Bill totals: Total_Amount, derived from the bill's items.
CREATE VIEW BillTotals AS
SELECT b.billID,
       COALESCE(SUM(bi.lineTotal), 0) AS totalAmount
FROM Bill b
LEFT JOIN BillItem bi ON bi.billID = b.billID
GROUP BY b.billID;

-- ---------------------------------------------------------------------
-- Rules a CHECK constraint can't express (they look at other rows)
-- ---------------------------------------------------------------------

DELIMITER //

-- At most 5 photos per request.
CREATE TRIGGER trg_photo_limit
BEFORE INSERT ON Photo
FOR EACH ROW
BEGIN
    IF (SELECT COUNT(*) FROM Photo WHERE requestID = NEW.requestID) >= 5 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A request can have at most 5 photos.';
    END IF;
END//

-- At most one accepted quote per request.
CREATE TRIGGER trg_one_accepted_quote_ins
BEFORE INSERT ON Quote
FOR EACH ROW
BEGIN
    IF NEW.status = 'accepted' AND EXISTS (
        SELECT 1 FROM Quote WHERE requestID = NEW.requestID AND status = 'accepted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This request already has an accepted quote.';
    END IF;
END//

CREATE TRIGGER trg_one_accepted_quote_upd
BEFORE UPDATE ON Quote
FOR EACH ROW
BEGIN
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' AND EXISTS (
        SELECT 1 FROM Quote WHERE requestID = NEW.requestID AND status = 'accepted'
                              AND quoteID <> NEW.quoteID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This request already has an accepted quote.';
    END IF;
END//

-- Only an unpaid or disputed bill can be paid; paying marks it 'paid'.
CREATE TRIGGER trg_payment_check
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    IF (SELECT status FROM Bill WHERE billID = NEW.billID) NOT IN ('unpaid','disputed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an unpaid or disputed bill can be paid.';
    END IF;
END//

CREATE TRIGGER trg_payment_mark_paid
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    UPDATE Bill SET status = 'paid' WHERE billID = NEW.billID;
END//

DELIMITER ;
