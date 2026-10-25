-- Git Test
-- Create Database
CREATE DATABASE IF NOT EXISTS web_app;
USE web_app;

-- Create Table
CREATE TABLE Users(
   username VARCHAR(50) primary key NOT NULL,
   password VARCHAR(255) NOT NULL,
   firstname VARCHAR(255) CHECK ( LENGTH(firstname) >= 2 AND firstname NOT LIKE '%[^A-Za-z-]' ),
   lastname VARCHAR(255) CHECK ( LENGTH(lastname) >= 2 AND lastname NOT LIKE '%[^A-Za-z-]' ),
   salary FLOAT CHECK (salary >= 0.0),
   age INTEGER CHECK (age >= 0 AND age <= 150),
   registerday DATE,
   signintime DATETIME DEFAULT NULL
);

-- Insert Users
INSERT INTO Users (username, password, firstname, lastname, salary, age, registerday, signintime) VALUES
('alex_m', '67b80b0495c636cd9ef99da91070056d:10000:d52e33a6b0809987e17812164a7e50f165741921652a4f3f993acba7cb0fa1551a6c5c305da1af0ecdb830d9aefea6f65e4b77f8625faf493523b7a1d7fd7905', 'Alex', 'Morgan', 75000.00, 29, '2026-01-15', NULL), -- Password is: Pass2026Alex
('sarah_c', 'b0cd82240f16b45840e1b7013b520690:10000:522a1e6df1e205e3a3a3197dd38fa113170cb49661d1188c2727b1e505cb94298a18e8fd65c4b2b20a5afff83079a8ed21f00140262bdc2d43df7207db9f0401', 'Sarah', 'Chen', 82500.50, 34, '2026-02-01', NULL), -- Password is: SecurePass#99
('jordan_p', '454e511e01eafde677119b8b96f1830d:10000:652f8473fb8cce722c24bf6482eae1efc0aa2bf664fe7967c4d6381232af3d09c95e73919b8b22ddfc41a00e7fb8802f9f2ce7403f7e442eb6400bbea469a70b', 'Jordan', 'Peterson', 62000.00, 25, '2026-03-10', NULL), -- Password is: JordanP@2026
('elizabeth_w', 'f9e1f9fbc01334ce91230156b0c42cc5:10000:51793cccdd5d9c40425168392a18f78ce17d2ee06435f15988bcf85ce4fdb771cb5816cd03e8e0e533fe8ece7999e3bddf319132471fccd231fe75d549671a44', 'Elizabeth', 'Wright', 91000.75, 41, '2026-03-10', '2026-10-19 19:40:22'), -- Password is: LizWright88
('michael_k', '4d81dc18774948eac63789da8d91dd29:10000:149ecd83f3ef83c7a063b7eb08b87f8ebce9e6e3224866930ce4c1c0f303c804ab611e7ca9e5cec439d3006f51f4d8354be0f867c1b907885545a0e59e824d16', 'Michael', 'Kovacs', 54000.00, 22, '2026-04-05', NULL), -- Password is: MikeyK$12345
('diana_v', '0d40eb87c7b5e2977223d930fa36482e:10000:34c27ff15fac1a0d114f9384a28a4a8ebe619288ebd3785c36848e11eb4280a41b82fab67d0756042212272ff8c76b7c4466e564453378903ad14e9c60545c2f', 'Diana', 'Vargas', 68500.25, 30, '2026-05-18', '2026-10-20 16:55:10'), -- Password is: DianaV_2026
('carlos_r', 'c1ca8eae4f1ba75fdc6236c68195d721:10000:52eb0bcb03136a5f38fca6079ac3a4874ecb1b6ef6165aae2e89238af4fa6efe65db3bd8cfa65bb176717e0206d7ce0912b70d8c49d9df5423e8ecf885905469', 'Carlos', 'Ramirez', 79000.00, 37, '2026-06-30', '2026-10-01 12:20:00'), -- Password is: CarlosR@Safe1
('hannah_b', '70749ffa90333d5d4d239f23a3b9d86e:10000:dead9c1cf3cb692669a33f3b5f6f16b560ac2e0a866d7ce39205f29d18db0adc63648771a72734c113164c44214e7b41c2cbaaa6f82ccd84649c2bb551e727a8', 'Hannah', 'Brooks', 95000.00, 45, '2026-07-14', '2026-10-17 07:45:50'), -- Password is: HannahB#4321
('david_l', '54a5eaaa687713ed627f2be67bd20dac:10000:3c0eea1e4925e9b7d957928d4e9b9ac702523d814c561d8b923e9fd3160eafa13725bd91a9124852915fd0787737f05c04c994c7dd94a1fef1574b3f7f6389d5', 'David', 'Lee', 58000.50, 27, '2026-07-14', '2026-09-28 15:33:10'), -- Password is: DaveL_Secret
('rachel_g', '059499adf78713fb77d5f965639f056b:10000:cc9b506b214fd559baad86d45893388cd67f2cddc1e8d83e09f1ea1cffdc1271b2912cdffcaf40a12527c323a32e59e0555cc8ffa8741771c202b47df5c9a5aa', 'Rachel', 'Green', 88000.00, 32, CURDATE(), NOW()), -- Password is: RachG2026$Win
('priya_s', '9a9cbc13d6b5a2c12f0e12682cd6d24f:10000:3b3c2042aca37e7ff462e9adc070f6a6c8df9a0d47869907d7051db8daebdb3ef917d9b24a733dc06692ffd02e39cb5928d259ff3f19ada9fa940b5a84f345b0', 'Priya', 'Shah', 72000.00, 28, '2026-02-14', NULL), -- Password is: PriyaShah2026
('lena_c', 'c25d510e4c3c0d3e339549634c89998f:10000:7e0e4f4aba2f94c96383166ab28299bafb702b4b44a8547921f600192e9dd78b601bebc0b569905dc643b7333ddb3e213941f65be42083d433ebede08839224b', 'Lena', 'Chen', 64000.00, 23, '2026-04-18', '2026-10-22 14:30:00'), -- Password is: LenaChen@88
('omar_h', '31c20292c35122f2f22b0ee3a73944af:10000:336e8c0850796fa6c61a0ab2e06191735e5492a0a62e78ab36eed7867870b0abee4b4f4a06ecd6a41629887486fcd1f40016bb1e19e6100586b2c8b8f61b7686', 'Omar', 'Hassan', 58000.00, 33, '2026-06-02', NULL), -- Password is: OmarH_Secure1
('marcus_j', 'cadd5cfa5b9d95fe65b7a35de78a3598:10000:293f08c6617ff2bb5ded5c741192458029457287d51130ecad7d839693eb69316f2d01e0ef5ab15a49934addc33da18e0da874d21be389eb74353cd93be140d7', 'Marcus', 'Johnson', 105000.00, 51, '2026-08-20', '2026-10-15 09:12:00'), -- Password is: MarcusJ#2026
('grace_t', 'df514472efcef3fd495ccf3e177be3c6:10000:4bb7b6ec47c996e4b2a75f527b07306a5e5d8364f317509d15c0b8e960d1a3eeb71e0243952185e5376b142fae73e3e582ca67336f6ddaa4a67366a2fe15afe0', 'Grace', 'Taylor', 47000.00, 60, '2026-09-30', '2026-10-23 11:05:00'); -- Password is: GraceT2026$

-- ----------------------------------------------------------------------
-- FEATURE QUERIES
-- Example results use the test users inserted above.
-- ----------------------------------------------------------------------

-- 1. User registration
INSERT INTO Users (username, password, registerday) VALUES (?, ?, ?);
-- Example: 'new_user', '<PBKDF2 hash of the password>', today's date
-- Returns: 1 row inserted (fails if the username is already taken)

-- 2. User sign-in: find the user, check the password hash in code, then record the sign-in time
SELECT username, password, firstname, lastname FROM Users WHERE username LIKE ?;
-- Example: 'sarah_c'
-- Returns: sarah_c's row; sign-in only succeeds if the password matches the stored hash
UPDATE Users SET signintime = ? WHERE username = ?;
-- Example inputs: current date and time, 'sarah_c'
-- Returns: 1 row updated

-- 3. Search users by first and/or last name
SELECT username, firstname, lastname, salary, age, registerday, signintime FROM Users
WHERE CONCAT_WS(' ', firstname, lastname) LIKE ?
ORDER BY username ASC;
-- Example: '%Sarah Chen%'
-- Returns: sarah_c ('%Chen%' returns lena_c and sarah_c; '%Sarah%' returns sarah_c)

-- 4. Search users by userid
SELECT username, firstname, lastname, salary, age, registerday, signintime FROM Users WHERE username = ? ORDER BY username ASC;
-- Example: 'sarah_c'
-- Returns: sarah_c

-- 5. Search all users whose salary is between X and Y
SELECT username, firstname, lastname, salary FROM Users
WHERE salary >= ? AND salary <= ?
ORDER BY salary DESC;
-- Example: 60000, 80000
-- Returns: carlos_r, alex_m, priya_s, diana_v, lena_c, jordan_p
-- (If X = Y, the app uses WHERE salary = ? instead | 79000 returns carlos_r)

-- 6. Search all users whose ages are between X and Y
SELECT username, firstname, lastname, age FROM Users
WHERE age >= ? AND age <= ?
ORDER BY age ASC;
-- Example: 25, 35
-- Returns: jordan_p, david_l, priya_s, alex_m, diana_v, rachel_g, omar_h, sarah_c
-- (If X = Y, the app uses WHERE age = ? instead | 30 returns diana_v)

-- 7. Search users who registered after john registered
SELECT username, registerday, signintime FROM Users
WHERE username != ?
  AND registerday > (SELECT registerday FROM Users WHERE username = ?)
ORDER BY registerday ASC;
-- Example: 'diana_v', 'diana_v' (both ? are the same userid)
-- Returns: omar_h, carlos_r, hannah_b, david_l, marcus_j, grace_t, rachel_g (hannah_b and david_l share a date, so their order can vary)

-- 8. Search users who never signed in
SELECT username, registerday, signintime FROM Users
WHERE signintime IS NULL
ORDER BY registerday ASC;
-- Returns: alex_m, sarah_c, priya_s, jordan_p, michael_k, omar_h

-- 9. Search users who registered on the same day that john registered
SELECT username, registerday, signintime FROM Users
WHERE username != ?
  AND registerday = (SELECT registerday FROM Users WHERE username = ?)
ORDER BY registerday ASC;
-- Example: 'hannah_b', 'hannah_b' (both ? are the same userid)
-- Returns: david_l (both registered on 2026-07-14)
-- Second pair: 'jordan_p' returns elizabeth_w (both registered on 2026-03-10)

-- 10. Return the users who registered today
SELECT username, firstname, lastname, registerday FROM Users
WHERE registerday = CURDATE()
ORDER BY username ASC;
-- Returns: rachel_g (registered with CURDATE(), so she counts as today on the day the data is loaded)

-- -----------------------------------------
-- Change Statements
-- -----------------------------------------

-- List all users on the dashboard
SELECT username, firstname, lastname, salary, age, registerday, signintime FROM Users
ORDER BY username ASC LIMIT 26 OFFSET 0;
-- Returns: all 15 test users, sorted by username

-- Edit profile after login (only the fields the user changes are included)
UPDATE Users SET firstname = ?, lastname = ?, salary = ?, age = ? WHERE username = ?;
-- Example inputs: 'Sarah', 'Chen', 85000, 35, 'sarah_c'
-- Returns: 1 row updated

-- Delete account (users can only delete their own)
DELETE FROM Users WHERE username = ?;
-- Example input: 'sarah_c'
-- Returns: 1 row deleted
 