export const USERS_TABLE_NAME = "Users";
export const USERS_TABLE_COLUMNS = Object.freeze({ 
    username: "username", password: "password",
    firstname: "firstname", lastname: "lastname",
    salary: "salary", age: "age",
    registerday: "registerday", signintime: "signintime"
});

export function fixPage(page) 
{ return Math.max(1, parseInt(page, 10) || 1); }