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
    firstName: "firstName", lastName: "lastName", passwordHash: "passwordHash", password: "passwordHash",
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

export const US_States = new Map([
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
    ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
    ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
    ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
    ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
    ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
    ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
    ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
    ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
    ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
    ["VT", "Vermont"], ["VA", "Virginia"],
    ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],

    ["DC", "District of Columbia"],
    ["AS", "American Samoa"],
    ["GU", "Guam"],
    ["MP", "Northern Mariana Islands"],
    ["PR", "Puerto Rico"],
    ["UM", "United States Minor Outlying Islands"],
    ["VI", "Virgin Islands, U.S."]
]);

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
export const FLOORING_PRODUCT_TC_ALIAS = Object.freeze({ 
    [FLOORING_PRODUCT_TC.productID]: "Product ID", 
    [FLOORING_PRODUCT_TC.categoryName]: "Category Name",
    [FLOORING_PRODUCT_TC.productName]: "Product Name",
    [FLOORING_PRODUCT_TC.description]: "Description",
    [FLOORING_PRODUCT_TC.imagePath]: "Image Path",
    [FLOORING_PRODUCT_TC.manufacturer]: "Manufacturer",
    [FLOORING_PRODUCT_TC.materialStyle]: "Material Style",
    [FLOORING_PRODUCT_TC.color]: "Color",
    [FLOORING_PRODUCT_TC.unitPrice]: "Unit Price",
    [FLOORING_PRODUCT_TC.pricingUnit]: "Pricing Unit",
    [FLOORING_PRODUCT_TC.lengthIn]: "Length (Inches)",
    [FLOORING_PRODUCT_TC.widthIn]: "Width (Inches)",
    [FLOORING_PRODUCT_TC.sqFtPerBox]: "Square FT Per Box"
});
// #endregion

// #region FLOORING CATEGORY TABLE
export const FLOORING_CATEGORY_TN = "FlooringCategory";
export const FLOORING_CATEGORY_TC = Object.freeze({ 
    categoryName: "categoryName"
});

export const FLOORING_CATEGORY_TC_ALIAS = Object.freeze({
    [FLOORING_CATEGORY_TC.categoryName]: "Category Name"
});
// #endregion

// #region PATTERN TABLE
export const PATTERN_TN = "Pattern";
export const PATTERN_TC = Object.freeze({
    patternName: "patternName"
});

export const PATTERN_TC_ALIAS = Object.freeze({
    [PATTERN_TC.patternName]: "Pattern Name"
});
// #endregion

// #endregion

// #region FLOORING REQUESTS, ROOMS, PHOTOS

// #region FLOORING REQUEST TABLE
export const FLOORING_REQUEST_TN = "FlooringRequest";
export const FLOORING_REQUEST_TC = Object.freeze({
    requestID: "requestID", clientID: "clientID", /** FK */ serviceAddressID: "serviceAddressID", /** FK */ 
    submittedAt: "submittedAt", /** TO ADD */ 
    preferredStartDate: "preferredStartDate", preferredEndDate: "preferredEndDate", 
    proposedBudget: "proposedBudget", notes: "notes", status: "status", rejectionReason: "rejectionReason"
});

export const FLOORING_REQUEST_TC_ALIAS = Object.freeze({
    [FLOORING_REQUEST_TC.requestID]: "Request ID",
    [FLOORING_REQUEST_TC.clientID]: "Client ID",
    [FLOORING_REQUEST_TC.serviceAddressID]: "Service Address ID",
    [FLOORING_REQUEST_TC.submittedAt]: "Submitted At",
    [FLOORING_REQUEST_TC.preferredStartDate]: "Preferred Start Date",
    [FLOORING_REQUEST_TC.preferredEndDate]: "Preferred End Date",
    [FLOORING_REQUEST_TC.proposedBudget]: "Proposed Budget",
    [FLOORING_REQUEST_TC.notes]: "Notes",
    [FLOORING_REQUEST_TC.status]: "Status",
    [FLOORING_REQUEST_TC.rejectionReason]: "Rejection Reason"
});
// #endregion

// #region PHOTO TABLE
export const PHOTO_TN = "Photo";
export const PHOTO_TC = Object.freeze({
    photoID: "photoID", requestID: "requestID", /** FK */
    filePath: "filePath"
});

export const PHOTO_TC_ALIAS = Object.freeze({
    [PHOTO_TC.photoID]: "Photo ID",
    [PHOTO_TC.requestID]: "Request ID",
    [PHOTO_TC.filePath]: "File Path"
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

export const ROOMAREA_TC_ALIAS = Object.freeze({
    [ROOMAREA_TC.requestID]: "Request ID",
    [ROOMAREA_TC.patternName]: "Pattern Name",
    [ROOMAREA_TC.roomName]: "Room Name",
    [ROOMAREA_TC.squareFootage]: "Square Footage",
    [ROOMAREA_TC.currentFlooringType]: "Current Flooring Type",
    [ROOMAREA_TC.removalRequired]: "Removal Required",
    [ROOMAREA_TC.desiredProductID]: "Desired Product ID",
    [ROOMAREA_TC.desiredCategoryName]: "Desired Category Name"
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

export const QUOTE_TC_ALIAS = Object.freeze({
    [QUOTE_TC.quoteID]: "Quote ID",
    [QUOTE_TC.requestID]: "Request ID",
    [QUOTE_TC.createdAt]: "Created At",
    [QUOTE_TC.acceptedAt]: "Accepted At",
    [QUOTE_TC.proposedStartDate]: "Proposed Start Date",
    [QUOTE_TC.proposedEndDate]: "Proposed End Date",
    [QUOTE_TC.note]: "Note",
    [QUOTE_TC.status]: "Status"
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

export const QUOTE_ITEM_TC_ALIAS = Object.freeze({
    [QUOTE_ITEM_TC.quoteID]: "Quote ID",
    [QUOTE_ITEM_TC.productID]: "Product ID",
    [QUOTE_ITEM_TC.lineNumber]: "Line Number",
    [QUOTE_ITEM_TC.itemType]: "Item Type",
    [QUOTE_ITEM_TC.description]: "Description",
    [QUOTE_ITEM_TC.baseQuantity]: "Base Quantity",
    [QUOTE_ITEM_TC.quantity]: "Quantity",
    [QUOTE_ITEM_TC.unitPrice]: "Unit Price",
    [QUOTE_ITEM_TC.wastePct]: "Waste Percentage",
    [QUOTE_ITEM_TC.lineTotal]: "Line Total"
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

export const INSTALLATION_ORDER_TC_ALIAS = Object.freeze({
    [INSTALLATION_ORDER_TC.orderID]: "Order ID",
    [INSTALLATION_ORDER_TC.quoteID]: "Quote ID",
    [INSTALLATION_ORDER_TC.actualInstallationDate]: "Actual Installation Date",
    [INSTALLATION_ORDER_TC.completionDate]: "Completion Date",
    [INSTALLATION_ORDER_TC.completionNotes]: "Completion Notes",
    [INSTALLATION_ORDER_TC.status]: "Status"
});
// #endregion

// #region Order Material Usage TABLE
export const ORDER_MATERIAL_USAGE_TN = "OrderMaterialUsage";
export const ORDER_MATERIAL_USAGE_TC = Object.freeze({ 
    orderID: "orderID", /** FK */ productID: "productID",
    installedSqFt: "installedSqFt", actualQuantityUsed: "actualQuantityUsed"
});

export const ORDER_MATERIAL_USAGE_TC_ALIAS = Object.freeze({
    [ORDER_MATERIAL_USAGE_TC.orderID]: "Order ID",
    [ORDER_MATERIAL_USAGE_TC.productID]: "Product ID",
    [ORDER_MATERIAL_USAGE_TC.installedSqFt]: "Installed Square Feet",
    [ORDER_MATERIAL_USAGE_TC.actualQuantityUsed]: "Actual Quantity Used"
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

export const BILL_TC_ALIAS = Object.freeze({
    [BILL_TC.billID]: "Bill ID",
    [BILL_TC.orderID]: "Order ID",
    [BILL_TC.generatedAt]: "Generated At",
    [BILL_TC.status]: "Status"
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

export const BILL_ITEM_TC_ALIAS = Object.freeze({
    [BILL_ITEM_TC.billID]: "Bill ID",
    [BILL_ITEM_TC.lineNumber]: "Line Number",
    [BILL_ITEM_TC.itemType]: "Item Type",
    [BILL_ITEM_TC.description]: "Description",
    [BILL_ITEM_TC.quantity]: "Quantity",
    [BILL_ITEM_TC.unitPrice]: "Unit Price",
    [BILL_ITEM_TC.lineTotal]: "Line Total"
});
// #endregion

// #region PAYMENT TABLE
export const PAYMENT_TN = "Payment";
export const PAYMENT_TC = Object.freeze({ 
    billID: "billID", /** FK */
    paidAt: "paidAt"
});

export const PAYMENT_TC_ALIAS = Object.freeze({
    [PAYMENT_TC.billID]: "Bill ID",
    [PAYMENT_TC.paidAt]: "Paid At"
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

export const NEGOTIATION_TC_ALIAS = Object.freeze({
    [NEGOTIATION_TC.negotiationID]: "Negotiation ID",
    [NEGOTIATION_TC.quoteID]: "Quote ID",
    [NEGOTIATION_TC.billID]: "Bill ID",
    [NEGOTIATION_TC.sender]: "Sender",
    [NEGOTIATION_TC.createdAt]: "Created At",
    [NEGOTIATION_TC.messageText]: "Message Text"
});
// #endregion