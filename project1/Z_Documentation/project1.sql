-- Table
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

-- INSERTS
INSERT INTO Users (username, password, firstname, lastname, salary, age, registerday, signintime) VALUES
('alex_m', '57ffcaf6b2b4618766bfe4112b7ac471:10000:1bf6c1fc39d497dfbee41eb881ef84f925f789c4dcca90135fb1bfa32a7ee6d0afcda15158c9073909e592c830c16bdf526ed7b3a50f1c595838d52d4046aad5', 'Alex', 'Morgan', 75000.00, 29, '2026-01-15', NULL), -- Password is: Pass2026!Alex
('sarah_c', 'b0cd82240f16b45840e1b7013b520690:10000:522a1e6df1e205e3a3a3197dd38fa113170cb49661d1188c2727b1e505cb94298a18e8fd65c4b2b20a5afff83079a8ed21f00140262bdc2d43df7207db9f0401', 'Sarah', 'Chen', 82500.50, 34, '2026-02-01', NULL), -- Password is: SecurePass#99
('jordan_p', '454e511e01eafde677119b8b96f1830d:10000:652f8473fb8cce722c24bf6482eae1efc0aa2bf664fe7967c4d6381232af3d09c95e73919b8b22ddfc41a00e7fb8802f9f2ce7403f7e442eb6400bbea469a70b', 'Jordan', 'Peterson', 62000.00, 25, '2026-03-10', NULL), -- Password is: JordanP@2026
('elizabeth_w', '622b6b6619f5fefd1a2ecf2e2a90c24d:10000:5f13cd16d1f5d1e9aac9440a828df3755af004f144fe1745465b68d328a264cfa8bb283f99d7a1f1d805949ed068eb199edafefb795ddb2fed1467c5372fcbf9', 'Elizabeth', 'Wright', 91000.75, 41, '2026-03-10', '2026-10-19 19:40:22'), -- Password is: LizWright!88
('michael_k', '4d81dc18774948eac63789da8d91dd29:10000:149ecd83f3ef83c7a063b7eb08b87f8ebce9e6e3224866930ce4c1c0f303c804ab611e7ca9e5cec439d3006f51f4d8354be0f867c1b907885545a0e59e824d16', 'Michael', 'Kovacs', 54000.00, 22, '2026-04-05', NULL), -- Password is: MikeyK$12345
('diana_v', '89c4a302a53a7ed575721b48b91b120d:10000:d6367eb62c7af88ac62ebf74ae4f2e93680702a4b6f8f8534721936cba8d3d800f315ef1d0a4546f96778484bced9c5a0dd2cd5748e8346df3426405cbca805f', 'Diana', 'Vargas', 68500.25, 30, '2026-05-18', '2026-10-20 16:55:10'), -- Password is: DianaV_2026!
('carlos_r', 'c1ca8eae4f1ba75fdc6236c68195d721:10000:52eb0bcb03136a5f38fca6079ac3a4874ecb1b6ef6165aae2e89238af4fa6efe65db3bd8cfa65bb176717e0206d7ce0912b70d8c49d9df5423e8ecf885905469', 'Carlos', 'Ramirez', 79000.00, 37, '2026-06-30', '2026-10-01 12:20:00'), -- Password is: CarlosR@Safe1
('hannah_b', '70749ffa90333d5d4d239f23a3b9d86e:10000:dead9c1cf3cb692669a33f3b5f6f16b560ac2e0a866d7ce39205f29d18db0adc63648771a72734c113164c44214e7b41c2cbaaa6f82ccd84649c2bb551e727a8', 'Hannah', 'Brooks', 95000.00, 45, '2026-07-14', '2026-10-17 07:45:50'), -- Password is: HannahB#4321
('david_l', 'a69a8d96197e44c14cde0acc779df168:10000:b50b367fc151d74b80cc5fcee900286be9e8ad480fee682954d4559622f5c3d02ce85d006679da099969412775bf73febb65345183dc664224b99d60665c300a', 'David', 'Lee', 58000.50, 27, '2026-07-14', '2026-09-28 15:33:10'), -- Password is: DaveL_Secret!
('rachel_g', '059499adf78713fb77d5f965639f056b:10000:cc9b506b214fd559baad86d45893388cd67f2cddc1e8d83e09f1ea1cffdc1271b2912cdffcaf40a12527c323a32e59e0555cc8ffa8741771c202b47df5c9a5aa', 'Rachel', 'Green', 88000.00, 32, CURDATE(), NOW()); -- Password is: RachG2026$Win

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
SELECT * FROM Users
WHERE CONCAT_WS(' ', firstname, lastname) LIKE ?
ORDER BY username ASC;
-- Example: '%Sarah Chen%'
-- Returns: sarah_c ('%Chen%' or '%Sarah%' also return sarah_c)

-- 4. Search users by userid
SELECT * FROM Users WHERE username = ? ORDER BY username ASC;
-- Example: 'sarah_c'
-- Returns: sarah_c

-- 5. Search all users whose salary is between X and Y
SELECT username, firstname, lastname, salary FROM Users
WHERE salary >= ? AND salary <= ?
ORDER BY salary DESC;
-- Example: 60000, 80000
-- Returns: carlos_r, alex_m, diana_v, jordan_p
-- (If X = Y, the app uses WHERE salary = ? instead; e.g. 79000 returns carlos_r)

-- 6. Search all users whose ages are between X and Y
SELECT username, firstname, lastname, age FROM Users
WHERE age >= ? AND age <= ?
ORDER BY age ASC;
-- Example: 25, 35
-- Returns: jordan_p, david_l, alex_m, diana_v, rachel_g, sarah_c
-- (If X = Y, the app uses WHERE age = ? instead; e.g. 30 returns diana_v)

-- 7. Search users who registered after john registered
SELECT username, registerday, signintime FROM Users
WHERE username != ?
  AND registerday > (SELECT registerday FROM Users WHERE username = ?)
ORDER BY registerday ASC;
-- Example: 'diana_v', 'diana_v' (both ? are the same userid)
-- Returns: carlos_r, hannah_b, david_l, rachel_g (hannah_b and david_l share a date, so their order can vary)

-- 8. Search users who never signed in
SELECT username, registerday, signintime FROM Users
WHERE signintime IS NULL
ORDER BY registerday ASC;
-- Returns: alex_m, sarah_c, jordan_p, michael_k

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
-- OTHER STATEMENTS THE APP USES
-- -----------------------------------------

-- List all users on the dashboard
SELECT username, firstname, lastname, salary, age, registerday, signintime FROM Users
ORDER BY username ASC LIMIT 26 OFFSET 0;
-- Returns: all 10 test users, sorted by username

-- Edit profile after login (only the fields the user changes are included)
UPDATE Users SET firstname = ?, lastname = ?, salary = ?, age = ? WHERE username = ?;
-- Example inputs: 'Sarah', 'Chen', 85000, 35, 'sarah_c'
-- Returns: 1 row updated

-- Delete account (users can only delete their own)
DELETE FROM Users WHERE username = ?;
-- Example input: 'sarah_c'
-- Returns: 1 row deleted
 