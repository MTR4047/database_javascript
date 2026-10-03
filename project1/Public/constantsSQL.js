
export const tableLimit = 25;
export const USERS_TABLE_NAME = "Users";
export const USERS_TABLE_COLUMNS = Object.freeze({ 
    username: "username", password: "password",
    firstname: "firstname", lastname: "lastname",
    salary: "salary", age: "age",
    registerday: "registerday", signintime: "signintime"
});

const deepFreeze = (obj) => {
    if (obj === null || typeof obj !== "object") {
        return obj; // Exit if not an object or is null
    }

    // Recursively freeze properties (including arrays)
    Object.keys(obj).forEach((key) => {
        deepFreeze(obj[key]);
    });

    return Object.freeze(obj); // Freeze the current object
};

export const srchOps = Object.freeze({
    searchByUsersName:                          Object.freeze({ key: "searchByUsersName", params: { name: "name" } } ),
    searchByUsersID:                            Object.freeze({ key: "searchByUsersID", params: { username: "username" } } ),
    searchBetweenUsersSalary:                   Object.freeze({ key: "searchBetweenUsersSalary", params: { minSalary:"minSalary", maxSalary:"maxSalary" }} ),
    searchBetweenUsersAges:                     Object.freeze({ key: "searchBetweenUsersAges", params: { minAge: "minAge", maxAge: "maxAge" }} ),
    searchUsersRegistrationAfterUserID:         Object.freeze({ key: "searchUsersRegistrationAfterUserID", params: { username: "username" }} ),
    searchUsersRegistrationTimeSameAsUserID:    Object.freeze({ key: "searchUsersRegistrationTimeSameAsUserID", params: { username: "username" }} ),
    searchNeverSignedInUsers:                   Object.freeze({ key: "searchNeverSignedInUsers", params: {}} ),
    searchUsersSignedInToday:                   Object.freeze({ key: "searchUsersSignedInToday", params: {}} )
});

export function fixPage(page) 
{ return Math.max(1, parseInt(page, 10) || 1); }