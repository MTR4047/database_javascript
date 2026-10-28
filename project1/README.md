To run the backend and frontend, here are the pre requisites: Visual Studio Code, XAMPP with MySQL (port 3306) and Apache (ports 80, 443) installed.

1. Extract the project folder (assuming we are in the XAMPP directory) into '/htdocs/database_javascript'
2. In the "Backend" directory, we run from the terminal the following: 'npm init -y', 'npm install dotenv express mysql cors nodemon'.
3. Run XAMPP with the Apache and MySQL services turned on, execute the "Create Database", "Create Table", and "Insert Users" contents as found within project1.sql or sql.txt under the Documentation folder on the mySQL admin dashboard to create the database, the table, and insert with sample contents.
4. Run from the terminal in the /backend/ directory: 'npm start'
5. Navigate to `http://localhost/database_javascript/[projectFolderName]/Frontend/index.html`, and either login using the created users or register a new user. Note that [projectFolderName] would typically refer to project1.