export const tableLimit = 25;

// #region CLIENTS, ADDRESS

// #region CLIENT TABLE
export const CLIENT_TN = "Client";
export const CLIENT_TC = Object.freeze({ 
    clientID: "clientID", addressID: "addressID",    
    firstname: "firstname", lastname: "lastname", passwordHash: "passwordHash",
    phoneNumber: "phoneNumber", email: "email", 
    cardNumber: "cardNumber", cardCVV: "cardCVV", cardExpiration: "cardExpiration"

    /* 
    salary: "salary", age: "age",
    registerday: "registerday", signintime: "signintime"
    */
});
// #endregion

// #region ADDRESS TABLE
export const ADDRESS_TN = "Address";
export const ADDRESS_TC =  Object.freeze({
    addressID: "addressID",
    street: "street", city: "city", state: "state", postalCode: "postalCode"
});
// #endregion

// #endregion

// #region FLOORING PRODUCTS, CATEGORIES, PATTERNS

// #region FLOORING PRODUCT TABLE
export const FLOORING_PRODUCT_TN = "FlooringProduct";
export const FLOORING_PRODUCT_TC = Object.freeze({ 
    productID: "productID", categoryName: "categoryName", /** FK */ 
    productName: "productName", description: "description", imagePath: "imagePath", 
    manufacturer: "manufacturer",
    materialStyle: "materialStyle", color: "color", 
    unitPrice: "unitPrice", pricingUnit: "pricingUnit",
    lengthIn: "lengthIn", widthIn: "widthIn", sqFtPerBox: "sqFtPerBox"
});
// #endregion

// #region FLOORING CATEGORY TABLE
export const FLOORING_CATEGORY_TN = "FlooringCategory";
export const FLOORING_CATEGORY_TC = Object.freeze({ 
    categoryName: "categoryName"
});
// #endregion

// #region PATTERN TABLE
export const PATTERN_TN = "Pattern";
export const PATTERN_TC = Object.freeze({
    patternName: "patternName"
});
// #endregion

// #endregion

// #region FLOORING REQUESTS, ROOMS, PHOTOS



// #endregion