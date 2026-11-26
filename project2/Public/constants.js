export const tableLimit = 25;
export const userID_alias = "email"; // Used in the frontend and backend, this indicates the user ID
export function fixPage(page) { return Math.max(1, parseInt(page, 10) || 1); }

// Not to be used on text box entries
export function sanitizeString(val, limit) 
{
    if (typeof val !== 'string') return val;

    const limited = limitString(val, limit);
    if (typeof limited !== 'string') return limited;

    // Matches specified dangerous/unwanted punctuation: ' " ? ! = ` ; < >
    // Replaces matches with an empty string ''; double protection (as SQL query parameters handle this already)
    return limited.replace(/['"?!=`;<>]/g, '');
};

export function limitString(val, limit = 255)
{
    if (typeof val !== 'string' || typeof limit !== 'number') return val;
    
    limit = (isFinite(limit) && limit > 0) ? limit: val.length;
    return val.trim().substring(0, limit);
}

export function sanitizeDateValue(val)
{
    if (val instanceof Date) 
    { return Number.isNaN(val.getTime()) ? undefined: val; }

    if (typeof val !== 'string' || !val.trim()) return undefined;
    const parsed = new Date(val.trim()); // To be used on data passed through JSON
    return Number.isNaN(parsed.getTime()) ? undefined: parsed; 
}

function sanitizeNumber(val) 
{
    if (typeof val !== 'number' && typeof val !== 'string') { return val; }

    if (typeof val === 'string') 
    {
        const trimmed = val.trim();     if (trimmed.length === 0) return undefined;
        const num = Number(trimmed);    return Number.isFinite(num) ? num : val;
    }

    return Number.isFinite(val) ? val: val;
}
export function sanitizeInteger(val, positiveRequired = false) 
{
    const sanitized = sanitizeNumber(val);
    if (typeof sanitized !== 'number' || !Number.isFinite(sanitized)) 
    { return sanitized; }

    const floored = Math.floor(sanitized);
    if (positiveRequired && floored <= 0) { return undefined; }

    return floored;
}
export function sanitizeDecimal(val, positiveRequired = false) 
{
    const sanitized = sanitizeNumber(val);
    if (typeof sanitized !== 'number' || !Number.isFinite(sanitized)) 
    { return sanitized; }

    if (positiveRequired === true && sanitized < 0) 
    { return undefined; }

    return sanitized;
}

/*
static _SRV_TN = CLIENT_TN;
static _SRV_TC = CLIENT_TC;
static ALLOWED__COLUMNS_SET = new Set(Object.values(this._SRV_TC));
static ALLOWED__UPDATE_SET = (() => {
    const updateSet = new Set(this.ALLOWED__COLUMNS_SET);
    updateSet.delete(this._SRV_TC.);
    return updateSet;
})();

// #region helper update funcs
// No need to transform Address ID
#transformersClientsMap = new Map([
    [Service.CLIENT_SRV_TC.addressID, (val) => val ],
    [Service.CLIENT_SRV_TC.firstname, (val) => this.#(val) ], 
    [Service.CLIENT_SRV_TC.lastname, (val) => this.#(val) ], 
    [Service.CLIENT_SRV_TC.passwordHash, (val) => this.#(val, true) ], 
    [Service.CLIENT_SRV_TC.phoneNumber, (val) => this.#(val) ], 
    [Service.CLIENT_SRV_TC.email, (val) => this.#(val) ], 
    [Service.CLIENT_SRV_TC.cardNumber, (val) => this.#(val) ],
    [Service.CLIENT_SRV_TC.cardCVV, (val) => this.#(val) ],
    [Service.CLIENT_SRV_TC.cardExpiration, (val) => this.#(val) ]
]);
*/

// #region CLIENTS, ADDRESS

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const nonAlphanumericRegex = /[^a-z0-9]/gi;
export const nonNumericRegex = /[^0-9]/gi;

// #region CLIENT TABLE
export const CLIENT_TN = "Client";
export const CLIENT_TC = Object.freeze({ 
    clientID: "clientID", addressID: "addressID",    
    firstname: "firstName", lastname: "lastName", passwordHash: "passwordHash", password: "passwordHash",
    phoneNumber: "phoneNumber", email: userID_alias, username: userID_alias,
    cardNumber: "cardNumber", cardCVV: "cardCVV", cardExpiration: "cardExpiration"
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

// #region FLOORING REQUEST TABLE
export const FLOORING_REQUEST_TN = "FlooringRequest";
export const FLOORING_REQUEST_TC = Object.freeze({
    requestID: "requestID", clientID: "clientID", /** FK */ serviceAddressID: "serviceAddressID", /** FK */ 
    preferredStartDate: "preferredStartDate", preferredEndDate: "preferredEndDate", proposedBudget: "proposedBudget",
    notes: "notes", status: "status", rejectionReason: "rejectionReason"
});
// #endregion

// #region PHOTO TABLE
export const PHOTO_TN = "Photo";
export const PHOTO_TC = Object.freeze({
    photoID: "photoID", requestID: "requestID", /** FK */
    filePath: "filePath"
});
// #endregion

// #region ROOM AREA TABLE
export const ROOMAREA_TN = "RoomArea";
export const ROOMAREA_TC = Object.freeze({
    requestID: "requestID", /** FK */ patternName: "patternName", /** FK */
    roomName: "roomName", squareFootage: "squareFootage", 
    currentFlooringType: "currentFlooringType", removalRequired: "removalRequired",
    
    desiredProductID: "desiredProductID", desiredCategoryName: "desiredCategoryName", 
});
// #endregion

// #endregion

// #region QUOTES and QUOTE ITEMS

// #region QUOTE TABLE
export const QUOTE_TN = "Quote";
export const QUOTE_TC = Object.freeze({ 
    quoteID: "quoteID", requestID: "requestID", /** FK */
    createdAt: "createdAt", acceptedAt: "acceptedAt",
    proposedStartDate: "proposedStartDate", proposedEndDate: "proposedEndDate",
    note: "note", status: "status"
});
// #endregion

// #region QUOTE ITEM TABLE
export const QUOTE_ITEM_TN = "QuoteItem";
export const QUOTE_ITEM_TC = Object.freeze({ 
    quoteID: "quoteID", /** FK */ productID: "productID", /** FK */
    lineNumber: "lineNumber", itemType: "itemType", description: "description",
    baseQuantity: "baseQuantity", quantity: "quantity", unitPrice: "unitPrice",
    wastePct: "wastePct", lineTotal: "lineTotal"
});
// #endregion

// #endregion

// #region ORDERS and MATERIAL USAGE

// #region Installation Order TABLE
export const INSTALLATION_ORDER_TN = "InstallationOrder";
export const INSTALLATION_ORDER_TC = Object.freeze({ 
    orderID: "orderID", quoteID: "quoteID", /** FK */
    actualInstallationDate: "actualInstallationDate", completionDate: "completionDate", completionNotes: "completionNotes",
    status: "status"
});
// #endregion

// #region Order Material Usage TABLE
export const ORDER_MATERIAL_USAGE_TN = "OrderMaterialUsage";
export const ORDER_MATERIAL_USAGE_TC = Object.freeze({ 
    orderID: "orderID", /** FK */ productID: "productID",
    installedSqFt: "installedSqFt", actualQuantityUsed: "actualQuantityUsed"
});
// #endregion

// #endregion

// #region BILLS, BILL ITEMS, PAYMENTS

// #region BILL TABLE
export const BILL_TN = "Bill";
export const BILL_TC = Object.freeze({ 
    billID: "billID", orderID: "orderID", /** FK */
    generatedAt: "generatedAt", status: "status"
});
// #endregion

// #region BILL ITEM TABLE
export const BILL_ITEM_TN = "BillItem";
export const BILL_ITEM_TC = Object.freeze({ 
    billID: "billID", /** FK */
    lineNumber: "lineNumber",
    itemType: "itemType", description: "description",
    quantity: "quantity", unitPrice: "unitPrice", lineTotal: "lineTotal"
});
// #endregion

// #region PAYMENT TABLE
export const PAYMENT_TN = "Payment";
export const PAYMENT_TC = Object.freeze({ 
    billID: "billID", /** FK */
    paidAt: "paidAt"
});
// #endregion

// #endregion

// #region NEGOTIATION
export const NEGOTIATION_TN = "Negotiation";
export const NEGOTIATION_TC = Object.freeze({ 
    negotiationID: "negotiationID", quoteID: "quoteID", /** FK */ billID: "billID", /** FK */
    sender: "sender", createdAt: "createdAt",
    messageText: "messageText",
});
// #endregion