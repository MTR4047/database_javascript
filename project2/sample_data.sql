-- =====================================================================
-- DSE 6100 Project 2 - Sample data
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------
INSERT INTO FlooringCategory (categoryName) VALUES
('hardwood'), ('engineered wood'), ('laminate'), ('vinyl plank'),
('ceramic tile'), ('porcelain tile'), ('carpet'), ('other');

INSERT INTO Pattern (patternName) VALUES
('straight'), ('diagonal'), ('herringbone');

INSERT INTO FlooringProduct
(productID, productName, manufacturer, materialStyle, color, unitPrice, pricingUnit, lengthIn, widthIn, sqFtPerBox, description, categoryName) VALUES
(1, 'Oak Plank',                'Bruce',   'Solid red oak',      'Natural',   4.00, 'sq_ft', NULL,  NULL,  NULL,  '3/4 in. solid hardwood plank', 'hardwood'),
(2, 'Maple Plank',              'Bruce',   'Solid maple',        'Honey',     4.50, 'sq_ft', NULL,  NULL,  NULL,  NULL,                           'hardwood'),
(3, 'Hickory Engineered Plank', 'Shaw',    'Engineered hickory', 'Saddle',    3.75, 'sq_ft', NULL,  NULL,  NULL,  NULL,                           'engineered wood'),
(4, 'Coastal Laminate',         'Pergo',   'Laminate',           'Gray',      2.25, 'sq_ft', NULL,  NULL,  NULL,  'Water-resistant laminate',     'laminate'),
(5, 'LuxeCore LVP',             'COREtec', 'Luxury vinyl plank', 'Driftwood', 3.10, 'sq_ft', NULL,  NULL,  NULL,  NULL,                           'vinyl plank'),
(6, 'Matte Porcelain Tile',     'Daltile', 'Matte porcelain',    'White',     5.50, 'sq_ft', 24.00, 12.00, NULL,  NULL,                           'porcelain tile'),
(7, 'Glazed Ceramic Tile',      'MSI',     'Glazed ceramic',     'Beige',    28.00, 'box',   12.00, 12.00, 10.00, 'Sold in boxes of 10 sq ft',    'ceramic tile'),
(8, 'Plush Carpet',             'Mohawk',  'Nylon',              'Navy',      3.00, 'sq_ft', NULL,  NULL,  NULL,  NULL,                           'carpet');

-- ---------------------------------------------------------------------
-- Addresses and clients
-- ---------------------------------------------------------------------
INSERT INTO Address (addressID, street, city, state, postalCode) VALUES
(1,  '1200 Woodward Ave', 'Detroit',    'MI', '48226'),
(2,  '45 Oak St',         'Ferndale',   'MI', '48220'),
(3,  '780 Maple Rd',      'Troy',       'MI', '48083'),
(4,  '15 Cass Ave',       'Detroit',    'MI', '48201'),
(5,  '220 Lake Dr',       'Novi',       'MI', '48375'),
(6,  '9 Elm Ct',          'Dearborn',   'MI', '48124'),
(7,  '310 Pine St',       'Royal Oak',  'MI', '48067'),
(8,  '66 Grand River Ave','Livonia',    'MI', '48152'),
(9,  '500 Hill St',       'Ann Arbor',  'MI', '48104'),
(10, '12 River Rd',       'Warren',     'MI', '48093'),
(11, '88 Cedar Ln',       'Southfield', 'MI', '48075');

-- Maria and James share address 1 (two clients, one address).
INSERT INTO Client
(clientID, firstName, lastName, phoneNumber, email, passwordHash, cardNumber, cardCVV, cardExpiration, addressID) VALUES
(1,  'Maria',  'Lopez',  '313-555-0101', 'maria.lopez@example.com',  'hashed_pw_1',  '4111111111111111', '123',  '2028-05-31', 1),
(2,  'James',  'Chen',   '313-555-0102', 'james.chen@example.com',   'hashed_pw_2',  '5555555555554444', '456',  '2027-11-30', 1),
(3,  'Priya',  'Shah',   '248-555-0103', 'priya.shah@example.com',   'hashed_pw_3',  '4012888888881881', '789',  '2029-01-31', 3),
(4,  'Tom',    'Baker',  '313-555-0104', 'tom.baker@example.com',    'hashed_pw_4',  '378282246310005',  '1234', '2027-08-31', 4),
(5,  'Aisha',  'Khan',   '248-555-0105', 'aisha.khan@example.com',   'hashed_pw_5',  '6011111111111117', '012',  '2028-02-29', 5),
(6,  'Luis',   'Garcia', '313-555-0106', 'luis.garcia@example.com',  'hashed_pw_6',  '4242424242424242', '321',  '2027-06-30', 6),
(7,  'Emma',   'Wilson', '248-555-0107', 'emma.wilson@example.com',  'hashed_pw_7',  '5105105105105100', '654',  '2028-09-30', 7),
(8,  'Noah',   'Patel',  '734-555-0108', 'noah.patel@example.com',   'hashed_pw_8',  '4000056655665556', '987',  '2029-03-31', 8),
(9,  'Olivia', 'Brown',  '734-555-0109', 'olivia.brown@example.com', 'hashed_pw_9',  '3530111333300000', '147',  '2027-12-31', 9),
(10, 'Daniel', 'Kim',    '586-555-0110', 'daniel.kim@example.com',   'hashed_pw_10', '6011000990139424', '258',  '2028-07-31', 10);

-- ---------------------------------------------------------------------
-- Flooring requests, photos and rooms
-- ---------------------------------------------------------------------
INSERT INTO FlooringRequest
(requestID, clientID, serviceAddressID, preferredStartDate, preferredEndDate, proposedBudget, notes, status, rejectionReason) VALUES
(1,  1,  1,  CURDATE() - INTERVAL 125 DAY, CURDATE() - INTERVAL 105 DAY, 3500.00, 'Please avoid Mondays.',                    'completed',   NULL),
(2,  1,  2,  CURDATE() - INTERVAL 75 DAY,  NULL,                         5500.00, 'Rental property; tenant moves out first.', 'completed',   NULL),
(3,  2,  1,  CURDATE() - INTERVAL 95 DAY,  CURDATE() - INTERVAL 80 DAY,  4000.00, 'I have two dogs.',                         'completed',   NULL),
(4,  4,  4,  CURDATE() - INTERVAL 60 DAY,  NULL,                         1500.00, NULL,                                       'rejected',    'The requested start date is fully booked.'),
(5,  4,  11, CURDATE() - INTERVAL 40 DAY,  NULL,                          900.00, NULL,                                       'cancelled',   NULL),
(6,  4,  4,  CURDATE() + INTERVAL 20 DAY,  CURDATE() + INTERVAL 30 DAY,  1200.00, 'Just getting estimates for now.',          'negotiating', NULL),
(7,  5,  5,  CURDATE() - INTERVAL 115 DAY, NULL,                         9000.00, NULL,                                       'completed',   NULL),
(8,  5,  5,  CURDATE() - INTERVAL 65 DAY,  NULL,                         1800.00, NULL,                                       'completed',   NULL),
(9,  6,  6,  CURDATE() - INTERVAL 55 DAY,  NULL,                          900.00, 'Small bathroom.',                          'completed',   NULL),
(10, 8,  8,  CURDATE() + INTERVAL 10 DAY,  CURDATE() + INTERVAL 20 DAY,  2500.00, NULL,                                       'accepted',    NULL),
(11, 9,  9,  CURDATE() - INTERVAL 85 DAY,  NULL,                         2500.00, NULL,                                       'completed',   NULL),
(12, 10, 10, CURDATE() - INTERVAL 30 DAY,  NULL,                         1000.00, NULL,                                       'rejected',    'We do not install the requested flooring type.'),
(13, 10, 10, CURDATE() + INTERVAL 15 DAY,  NULL,                          800.00, NULL,                                       'negotiating', NULL);

INSERT INTO Photo (photoID, requestID, filePath) VALUES
(1, 1, 'uploads/request1_kitchen.jpg'),
(2, 1, 'uploads/request1_hallway.jpg'),
(3, 7, 'uploads/request7_basement.jpg');

-- Each room has a desired product OR a desired category, never both.
INSERT INTO RoomArea
(requestID, roomName, squareFootage, currentFlooringType, removalRequired, desiredProductID, desiredCategoryName, patternName) VALUES
(1,  'Kitchen',     300, 'Vinyl',    TRUE,  1,    NULL,       'straight'),
(1,  'Hallway',     120, 'Carpet',   TRUE,  1,    NULL,       'straight'),
(2,  'Living Room', 900, 'Carpet',   FALSE, 5,    NULL,       NULL),
(3,  'Kitchen',     500, 'Linoleum', TRUE,  1,    NULL,       'herringbone'),
(4,  'Office',      200, NULL,       FALSE, NULL, 'hardwood', NULL),
(5,  'Den',         200, 'Hardwood', FALSE, NULL, 'carpet',   NULL),
(6,  'Kitchen',     150, 'Vinyl',    TRUE,  6,    NULL,       'diagonal'),
(7,  'Basement',    900, 'Concrete', FALSE, 6,    NULL,       'straight'),
(8,  'Bedroom',     400, 'Carpet',   TRUE,  4,    NULL,       NULL),
(9,  'Bathroom',     80, 'Tile',     TRUE,  7,    NULL,       'diagonal'),
(10, 'Living Room', 350, 'Carpet',   TRUE,  3,    NULL,       'diagonal'),
(11, 'Dining Room', 300, NULL,       FALSE, 2,    NULL,       'herringbone'),
(12, 'Patio',       150, NULL,       FALSE, NULL, 'other',    NULL),
(13, 'Bedroom',     250, 'Hardwood', FALSE, NULL, 'carpet',   NULL);

-- ---------------------------------------------------------------------
-- Quotes and quote items
-- ---------------------------------------------------------------------
INSERT INTO Quote
(quoteID, requestID, createdAt, proposedStartDate, proposedEndDate, note, status, acceptedAt) VALUES
(1,  1,  NOW() - INTERVAL 124 DAY, CURDATE() - INTERVAL 104 DAY, CURDATE() - INTERVAL 101 DAY, 'Includes removal of old flooring.', 'superseded', NULL),
(2,  1,  NOW() - INTERVAL 121 DAY, CURDATE() - INTERVAL 104 DAY, CURDATE() - INTERVAL 101 DAY, 'Revised: lower labor rate.',        'accepted',   NOW() - INTERVAL 120 DAY),
(3,  2,  NOW() - INTERVAL 72 DAY,  CURDATE() - INTERVAL 55 DAY,  CURDATE() - INTERVAL 51 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 70 DAY),
(4,  3,  NOW() - INTERVAL 92 DAY,  CURDATE() - INTERVAL 78 DAY,  CURDATE() - INTERVAL 75 DAY,  'Herringbone adds labor time.',      'accepted',   NOW() - INTERVAL 90 DAY),
(5,  5,  NOW() - INTERVAL 38 DAY,  CURDATE() - INTERVAL 20 DAY,  NULL,                         NULL,                               'rejected',   NULL),
(6,  6,  NOW() - INTERVAL 3 DAY,   CURDATE() + INTERVAL 22 DAY,  CURDATE() + INTERVAL 24 DAY,  NULL,                               'pending',    NULL),
(7,  7,  NOW() - INTERVAL 112 DAY, CURDATE() - INTERVAL 100 DAY, CURDATE() - INTERVAL 95 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 110 DAY),
(8,  8,  NOW() - INTERVAL 62 DAY,  CURDATE() - INTERVAL 42 DAY,  CURDATE() - INTERVAL 40 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 60 DAY),
(9,  9,  NOW() - INTERVAL 52 DAY,  CURDATE() - INTERVAL 22 DAY,  CURDATE() - INTERVAL 20 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 50 DAY),
(10, 10, NOW() - INTERVAL 4 DAY,   CURDATE() + INTERVAL 12 DAY,  CURDATE() + INTERVAL 14 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 2 DAY),
(11, 11, NOW() - INTERVAL 82 DAY,  CURDATE() - INTERVAL 67 DAY,  CURDATE() - INTERVAL 65 DAY,  NULL,                               'accepted',   NOW() - INTERVAL 80 DAY),
(12, 13, NOW() - INTERVAL 5 DAY,   CURDATE() + INTERVAL 16 DAY,  NULL,                         NULL,                               'countered',  NULL);

-- quantity and lineTotal are calculated by the database.
INSERT INTO QuoteItem
(quoteID, lineNumber, itemType, description, baseQuantity, wastePct, unitPrice, productID) VALUES
(1,  1, 'material',     'Oak Plank - Kitchen and Hallway',          420, 10,   4.00, 1),
(1,  2, 'labor',        'Installation',                             420,  0,   2.00, NULL),
(1,  3, 'removal',      'Remove old flooring',                      420,  0,   0.75, NULL),
(1,  4, 'delivery',     'Delivery',                                   1,  0,  75.00, NULL),
(2,  1, 'material',     'Oak Plank - Kitchen and Hallway',          420, 10,   4.00, 1),
(2,  2, 'labor',        'Installation',                             420,  0,   1.80, NULL),
(2,  3, 'removal',      'Remove old flooring',                      420,  0,   0.75, NULL),
(2,  4, 'delivery',     'Delivery',                                   1,  0,  75.00, NULL),
(3,  1, 'material',     'LuxeCore LVP - Living Room',               900, 10,   3.10, 5),
(3,  2, 'labor',        'Installation',                             900,  0,   1.50, NULL),
(3,  3, 'underlayment', 'Underlayment',                             900,  0,   0.40, NULL),
(4,  1, 'material',     'Oak Plank - Kitchen',                      500, 10,   4.00, 1),
(4,  2, 'labor',        'Installation (herringbone)',               500,  0,   1.80, NULL),
(4,  3, 'removal',      'Remove old flooring',                      500,  0,   0.75, NULL),
(5,  1, 'material',     'Plush Carpet - Den',                       200,  5,   3.00, 8),
(5,  2, 'labor',        'Installation',                             200,  0,   1.00, NULL),
(6,  1, 'material',     'Matte Porcelain Tile - Kitchen',           150, 15,   5.50, 6),
(6,  2, 'labor',        'Installation',                             150,  0,   2.50, NULL),
(6,  3, 'removal',      'Remove old flooring',                      150,  0,   0.75, NULL),
(7,  1, 'material',     'Matte Porcelain Tile - Basement',          900, 15,   5.50, 6),
(7,  2, 'labor',        'Installation',                             900,  0,   2.50, NULL),
(7,  3, 'underlayment', 'Underlayment',                             900,  0,   0.40, NULL),
(8,  1, 'material',     'Coastal Laminate - Bedroom',               400, 10,   2.25, 4),
(8,  2, 'labor',        'Installation',                             400,  0,   1.20, NULL),
(8,  3, 'removal',      'Remove old carpet',                        400,  0,   0.50, NULL),
(9,  1, 'material',     'Glazed Ceramic Tile - Bathroom (boxes)',     8, 10,  28.00, 7),
(9,  2, 'labor',        'Installation',                              80,  0,   3.00, NULL),
(9,  3, 'removal',      'Remove old tile',                           80,  0,   1.00, NULL),
(10, 1, 'material',     'Hickory Engineered Plank - Living Room',   350,  8,   3.75, 3),
(10, 2, 'labor',        'Installation (diagonal)',                  350,  0,   1.80, NULL),
(10, 3, 'removal',      'Remove old carpet',                        350,  0,   0.50, NULL),
(10, 4, 'delivery',     'Delivery',                                   1,  0,  75.00, NULL),
(11, 1, 'material',     'Maple Plank - Dining Room',                300, 10,   4.50, 2),
(11, 2, 'labor',        'Installation (herringbone)',               300,  0,   1.80, NULL),
(11, 3, 'discount',     'Seasonal discount',                          1,  0, -100.00, NULL),
(12, 1, 'material',     'Plush Carpet - Bedroom',                   250,  5,   3.00, 8),
(12, 2, 'labor',        'Installation',                             250,  0,   1.00, NULL);

-- ---------------------------------------------------------------------
-- Orders and actual material used
-- ---------------------------------------------------------------------
INSERT INTO InstallationOrder
(orderID, quoteID, actualInstallationDate, completionDate, status, completionNotes) VALUES
(1, 2,  CURDATE() - INTERVAL 103 DAY, CURDATE() - INTERVAL 100 DAY, 'completed', 'Installed as planned.'),
(2, 3,  CURDATE() - INTERVAL 54 DAY,  CURDATE() - INTERVAL 50 DAY,  'completed', 'Subfloor repair needed in one corner.'),
(3, 4,  CURDATE() - INTERVAL 78 DAY,  CURDATE() - INTERVAL 75 DAY,  'completed', 'Herringbone cuts used extra material.'),
(4, 7,  CURDATE() - INTERVAL 100 DAY, CURDATE() - INTERVAL 95 DAY,  'completed', NULL),
(5, 8,  CURDATE() - INTERVAL 42 DAY,  CURDATE() - INTERVAL 40 DAY,  'completed', 'Uneven floor required extra material.'),
(6, 9,  CURDATE() - INTERVAL 22 DAY,  CURDATE() - INTERVAL 20 DAY,  'completed', NULL),
(7, 10, NULL,                         NULL,                         'scheduled', NULL),
(8, 11, CURDATE() - INTERVAL 67 DAY,  CURDATE() - INTERVAL 65 DAY,  'completed', NULL);

-- Estimated quantities (from the quote items, with waste):
-- order 1: 462, order 2: 990, order 3: 550, order 4: 1035, order 5: 440,
-- order 6: 8.8 boxes, order 8: 330
INSERT INTO OrderMaterialUsage (orderID, productID, installedSqFt, actualQuantityUsed) VALUES
(1, 1, 420,  460),     -- under the estimate
(2, 5, 900,  990),     -- exactly the estimate
(3, 1, 500,  620),     -- 12.7% over (query 7)
(4, 6, 900, 1000),     -- under the estimate
(5, 4, 400,  500),     -- 13.6% over (query 7)
(6, 7,  80,    9),     -- 2.3% over (boxes)
(8, 2, 300,  360);     -- 9.1% over, just under the 10% cutoff

-- ---------------------------------------------------------------------
-- Bills, bill items and payments
-- ---------------------------------------------------------------------
INSERT INTO Bill (billID, orderID, generatedAt, status) VALUES
(1, 1, NOW() - INTERVAL 98 DAY, 'unpaid'),
(2, 2, NOW() - INTERVAL 48 DAY, 'superseded'),   -- replaced by bill 3 after a dispute
(3, 2, NOW() - INTERVAL 45 DAY, 'unpaid'),
(4, 3, NOW() - INTERVAL 73 DAY, 'unpaid'),
(5, 4, NOW() - INTERVAL 90 DAY, 'unpaid'),
(6, 5, NOW() - INTERVAL 30 DAY, 'unpaid'),       -- stays unpaid (overdue)
(7, 6, NOW() - INTERVAL 10 DAY, 'disputed'),     -- under dispute (overdue)
(8, 8, NOW() - INTERVAL 63 DAY, 'unpaid');

-- lineTotal is calculated by the database.
INSERT INTO BillItem (billID, lineNumber, itemType, description, quantity, unitPrice) VALUES
(1, 1, 'material',            'Oak Plank - Kitchen and Hallway',          462,  4.00),
(1, 2, 'labor',               'Installation',                             420,  1.80),
(1, 3, 'removal',             'Remove old flooring',                      420,  0.75),
(1, 4, 'delivery',            'Delivery',                                   1, 75.00),
(2, 1, 'material',            'LuxeCore LVP - Living Room',               990,  3.10),
(2, 2, 'labor',               'Installation',                             900,  1.50),
(2, 3, 'underlayment',        'Underlayment',                             900,  0.40),
(2, 4, 'subfloor_repair',     'Subfloor repair',                            1, 600.00),
(3, 1, 'material',            'LuxeCore LVP - Living Room',               990,  3.10),
(3, 2, 'labor',               'Installation',                             900,  1.50),
(3, 3, 'underlayment',        'Underlayment',                             900,  0.40),
(3, 4, 'subfloor_repair',     'Subfloor repair (revised)',                  1, 300.00),
(4, 1, 'material',            'Oak Plank - Kitchen',                      550,  4.00),
(4, 2, 'labor',               'Installation (herringbone)',               500,  1.80),
(4, 3, 'removal',             'Remove old flooring',                      500,  0.75),
(4, 4, 'additional_material', 'Extra Oak Plank for herringbone cuts',      70,  4.00),
(5, 1, 'material',            'Matte Porcelain Tile - Basement',         1035,  5.50),
(5, 2, 'labor',               'Installation',                             900,  2.50),
(5, 3, 'underlayment',        'Underlayment',                             900,  0.40),
(6, 1, 'material',            'Coastal Laminate - Bedroom',               440,  2.25),
(6, 2, 'labor',               'Installation',                             400,  1.20),
(6, 3, 'removal',             'Remove old carpet',                        400,  0.50),
(6, 4, 'additional_material', 'Extra laminate for uneven floor',           60,  2.25),
(7, 1, 'material',            'Glazed Ceramic Tile - Bathroom (boxes)',     9, 28.00),
(7, 2, 'labor',               'Installation',                              80,  3.00),
(7, 3, 'removal',             'Remove old tile',                           80,  1.00),
(7, 4, 'charge',              'Disposal fee',                               1, 150.00),
(8, 1, 'material',            'Maple Plank - Dining Room',                330,  4.50),
(8, 2, 'labor',               'Installation (herringbone)',               300,  1.80),
(8, 3, 'discount',            'Seasonal discount',                          1, -100.00);

-- Each payment marks its bill 'paid' (trigger).
INSERT INTO Payment (billID, paidAt) VALUES
(1, NOW() - INTERVAL 98 DAY + INTERVAL 5 HOUR),    -- paid within 24 hours
(3, NOW() - INTERVAL 45 DAY + INTERVAL 10 HOUR),   -- paid within 24 hours
(4, NOW() - INTERVAL 73 DAY + INTERVAL 20 HOUR),   -- paid within 24 hours
(5, NOW() - INTERVAL 70 DAY),                      -- paid 20 days late
(8, NOW() - INTERVAL 60 DAY);                      -- paid after 3 days

-- ---------------------------------------------------------------------
-- Negotiation history
-- ---------------------------------------------------------------------
INSERT INTO Negotiation (quoteID, billID, sender, messageText, createdAt) VALUES
(1,    NULL, 'client',     'Can the total come in under $3,000?',                     NOW() - INTERVAL 123 DAY),
(1,    NULL, 'contractor', 'I lowered the labor rate. Please see the revised quote.', NOW() - INTERVAL 121 DAY),
(5,    NULL, 'client',     'This is over my budget, so I will pass for now.',         NOW() - INTERVAL 37 DAY),
(12,   NULL, 'client',     'Can you use a less expensive carpet?',                    NOW() - INTERVAL 4 DAY),
(NULL, 2,    'client',     'The subfloor repair seems high for one corner.',          NOW() - INTERVAL 47 DAY),
(NULL, 2,    'contractor', 'Agreed. I reduced it to $300 in the revised bill.',       NOW() - INTERVAL 45 DAY),
(NULL, 7,    'client',     'The disposal fee was never mentioned in the quote.',      NOW() - INTERVAL 9 DAY);