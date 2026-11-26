import { BILL_ITEM_TC, BILL_ITEM_TN, BILL_TC, BILL_TN, INSTALLATION_ORDER_TC, INSTALLATION_ORDER_TN, NEGOTIATION_TC, NEGOTIATION_TN, QUOTE_ITEM_TC, QUOTE_ITEM_TN, QUOTE_TC, QUOTE_TN, sanitizeDateValue, sanitizeDecimal, sanitizeInteger, sanitizeString } from "../../Public/constants.js";
import { ROLES } from "../../Public/sessionMGMT.js";
import { DbService } from "../db.js";

/** Handles billing, order, quote, and negotiation services as they are interconnected. */
export default class FinancialService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }

    // #region QUOTE & QUOTE ITEM TABLES
    static QUOTE_SRV_TN = QUOTE_TN; 
    static QUOTE_SRV_TC = QUOTE_TC; 
    static ALLOWED_QUOTES_COLUMNS_SET = new Set(Object.values(this.QUOTE_SRV_TC));
    static ALLOWED_QUOTES_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_QUOTES_COLUMNS_SET);
        updateSet.delete(this.QUOTE_SRV_TC.quoteID);
        return updateSet;
    })();

    static QUOTE_ITEM_SRV_TN = QUOTE_ITEM_TN;
    static QUOTE_ITEM_SRV_TC = QUOTE_ITEM_TC;
    static ALLOWED_QUOTE_ITEMS_COLUMNS_SET = new Set(Object.values(this.QUOTE_ITEM_SRV_TC));
    static ALLOWED_QUOTE_ITEMS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_QUOTE_ITEMS_COLUMNS_SET);
        updateSet.delete(this.QUOTE_ITEM_SRV_TC.quoteID);
        return updateSet;
    })();

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Quote(page = 1, sortColumn = FinancialService.QUOTE_SRV_TC.quoteID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    returnOffsetSTMT_QuoteItem(page = 1, sortColumn = FinancialService.QUOTE_ITEM_SRV_TC.quoteID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersQuotesMap = new Map([
        // FK: typically validated/passed through or guarded separately if immutable
        [QuoteService.QUOTE_SRV_TC.requestID, (val) => val],
        [QuoteService.QUOTE_SRV_TC.createdAt, (val) => sanitizeDateValue(val)],
        [QuoteService.QUOTE_SRV_TC.acceptedAt, (val) => sanitizeDateValue(val)],
        [QuoteService.QUOTE_SRV_TC.proposedStartDate, (val) => sanitizeDateValue(val)],
        [QuoteService.QUOTE_SRV_TC.proposedEndDate, (val) => this.#transformProposedEndDate(val)],
        [QuoteService.QUOTE_SRV_TC.note, (val) => this.#transformNote(val)],
        [QuoteService.QUOTE_SRV_TC.status, (val) => this.#transformQuoteStatus(val)]
    ]);

    #transformProposedEndDate(val) {
        // Normalize date input (YYYY-MM-DD or Date) into valid date string/Date, or return undefined
        if (val === null) return null;
        return sanitizeDateValue(val); // Proposed end date is nullable
    }

    #transformNote(val) {
        // Sanitize/trim quote note text; return undefined if invalid type
        val = sanitizeString(val);
        return typeof val === 'string' ? val.trim(): undefined;
    }

    static quoteStatuses = new Set([ 'pending', 'countered', 'accepted', 'rejected', 'cancelled', 'superseded']);
    #transformQuoteStatus(val) {
        // Normalize and validate against allowed quote statuses (e.g., pending, accepted, rejected, expired)
        val = sanitizeString(val);
        if (typeof val !== 'string') { return undefined; }

        const status = normalized.trim().toLowerCase();
        return FinancialService.quoteStatuses.has(status) ? status: undefined;
    }

    #transformersQuoteItemsMap = new Map([       
        [FinancialService.QUOTE_ITEM_SRV_TC.productID, (val) => val],  // FKs: pass through or guard separately if immutable
        [FinancialService.QUOTE_ITEM_SRV_TC.lineNumber, (val) => sanitizeInteger(val, true)],
        [FinancialService.QUOTE_ITEM_SRV_TC.itemType, (val) => this.#transformItemType(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.description, (val) => this.#transformQuoteItemDescription(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.baseQuantity, (val) => sanitizeDecimal(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.quantity, (val) => sanitizeDecimal(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.unitPrice, (val) => sanitizeDecimal(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.wastePct, (val) => sanitizeDecimal(val)],
        [FinancialService.QUOTE_ITEM_SRV_TC.lineTotal, (val) => sanitizeDecimal(val)]
    ]);

    static quoteItemTypes = new Set(['material','removal','labor','underlayment','trim','stairs','delivery','charge','discount']);
    #transformItemType(val) 
    {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;
        const itemType = val.trim().toLowerCase();
        return FinancialService.quoteItemTypes.has(itemType) ? itemType: undefined;
    }
    #transformQuoteItemDescription(val)
    {
        if (typeof val !== 'string') return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed: undefined;
    }

    // #endregion

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS

    // #endregion QUOTE & QUOTE ITEMS TABLE

    // #region INSTALLATION ORDER & ORDER MATERIAL USAGE TABLE
    static INSTALLATION_ORDER_SRV_TN = INSTALLATION_ORDER_TN;
    static INSTALLATION_ORDER_SRV_TC = INSTALLATION_ORDER_TC;
    static ALLOWED_INSTALLATION_ORDER_COLUMNS_SET = new Set(Object.values(this.INSTALLATION_ORDER_SRV_TC));
    static ALLOWED_INSTALLATION_ORDER_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_INSTALLATION_ORDER_COLUMNS_SET);
        updateSet.delete(this.INSTALLATION_ORDER_SRV_TC.orderID);
        return updateSet;
    })();

    static ORDER_MATERIAL_USAGE_SRV_TN = ORDER_MATERIAL_USAGE_TN;
    static ORDER_MATERIAL_USAGE_SRV_TC = ORDER_MATERIAL_USAGE_TC;
    static ALLOWED_ORDER_MATERIAL_USAGE_COLUMNS_SET = new Set(Object.values(this.ORDER_MATERIAL_USAGE_SRV_TC));
    static ALLOWED_ORDER_MATERIAL_USAGE_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_ORDER_MATERIAL_USAGE_COLUMNS_SET);
        // Composite primary key (orderID, productID) should not be directly updated in place
        updateSet.delete(this.ORDER_MATERIAL_USAGE_SRV_TC.orderID);
        updateSet.delete(this.ORDER_MATERIAL_USAGE_SRV_TC.productID);
        return updateSet;
    })();
    
    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_InstallationOrder(page = 1, sortColumn = FinancialService.INSTALLATION_ORDER_SRV_TC.orderID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    returnOffsetSTMT_OrderMaterialUsage(page = 1, sortColumn = this.constructor.ORDER_MATERIAL_USAGE_SRV_TC.orderID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    
    // #region HELPER UPDATE FUNCS
    #transformersInstallationOrderMap = new Map([
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.quoteID, (val) => sanitizeInteger(val, true)],  // FK (UNIQUE): pass through or guard separately if immutable after creation
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.actualInstallationDate, (val) => this.#transformInstallationDate(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.completionDate, (val) => this.#transformInstallationDate(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.completionNotes, (val) => this.#transformCompletionNotes(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.status, (val) => this.#transformInstallationOrderStatus(val)]
    ]);

    #transformInstallationDate(val) 
    {
        // Allow clearing optional nullable dates when null is explicitly passed
        if (val === null) return null;
        return sanitizeDateValue(val);
    }

    #transformCompletionNotes(val) 
    {
        if (val === null) return null;

        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed: null;
    }

    static installationOrderStatuses = new Set([ 'scheduled', 'in_progress', 'completed', 'canceled']);
    #transformInstallationOrderStatus(val) 
    {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;
        const status = val.trim().toLowerCase();
        return FinancialService.installationOrderStatuses.has(status) ? status: undefined;
    }

    #transformersOrderMaterialUsageMap = new Map([
        [ORDER_MATERIAL_USAGE_TC.installedSqFt, (val) => sanitizeDecimal(val, true)],
        [ORDER_MATERIAL_USAGE_TC.actualQuantityUsed, (val) => sanitizeDecimal(val, true)]
    ]);

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS


    // #endregion

    // #region BILL & BILL ITEM TABLE
    static BILL_SRV_TN = BILL_TN;
    static BILL_SRV_TC = BILL_TC;
    static ALLOWED_BILLS_COLUMNS_SET = new Set(Object.values(this.BILL_SRV_TC));
    static ALLOWED_BILLS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_BILLS_COLUMNS_SET);
        updateSet.delete(this.BILL_SRV_TC.billID);
        return updateSet;
    })();

    static BILL_ITEM_SRV_TN = BILL_ITEM_TN;
    static BILL_ITEM_SRV_TC = BILL_ITEM_TC;
    static ALLOWED_BILL_ITEMS_COLUMNS_SET = new Set(Object.values(this.BILL_ITEM_SRV_TC));
    static ALLOWED_BILL_ITEMS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_BILL_ITEMS_COLUMNS_SET);
        // Composite key (billID, lineNumber) and generated STORED column lineTotal are not directly updatable
        updateSet.delete(this.BILL_ITEM_SRV_TC.billID);
        updateSet.delete(this.BILL_ITEM_SRV_TC.lineNumber);
        updateSet.delete(this.BILL_ITEM_SRV_TC.lineTotal);
        return updateSet;
    })();

    // Helpers strictly for pagination on SELECT queries
    returnOffsetSTMT_Bill(page = 1, sortColumn = FinancialService.BILL_SRV_TC.billID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    returnOffsetSTMT_BillItem(page = 1, sortColumn = FinancialService.BILL_ITEM_SRV_TC.lineNumber, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersBillsMap = new Map([    
        [FinancialService.BILL_SRV_TC.orderID, (val) => val], // FK: pass through or guard separately if immutable after creation
        [FinancialService.BILL_SRV_TC.generatedAt, (val) => transformDateValue(val)],
        [FinancialService.BILL_SRV_TC.status, (val) => this.#transformBillStatus(val)]
    ]);
    
    static billStatuses = new Set([ 'unpaid', 'disputed', 'paid', 'superseded' ]);
    #transformBillStatus(val) 
    {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;
        const status = val.trim().toLowerCase();
        return FinancialService.billStatuses.has(status) ? status : undefined;
    }

    #transformersBillItemsMap = new Map([
        [FinancialService.BILL_ITEM_SRV_TC.itemType, (val) => this.#transformBillItemType(val)],
        [FinancialService.BILL_ITEM_SRV_TC.description, (val) => this.#transformBillItemDescription(val)],
        [FinancialService.BILL_ITEM_SRV_TC.quantity, (val) => sanitizeDecimal(val, true)],
        [FinancialService.BILL_ITEM_SRV_TC.unitPrice, (val) => sanitizeDecimal(val, false)]
    ]);

    static billItemTypes = new Set([ 'material', 'removal', 'labor', 'underlayment', 'trim', 'stairs', 'delivery', 'additional_material', 'subfloor_repair', 'additional_labor', 'upgrade', 'charge', 'discount', 'credit' ]);
    #transformBillItemType(val) 
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const itemType = val.trim().toLowerCase();
        return FinancialService.billItemTypes.has(itemType) ? itemType: undefined;
    }

    #transformBillItemDescription(val) 
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed: undefined;
    }

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS
    
    // #endregion

    // #region NEGOTIATION TABLE
    static NEGOTIATION_SRV_TN = NEGOTIATION_TN;
    static NEGOTIATION_SRV_TC = NEGOTIATION_TC;
    static ALLOWED_NEGOTIATION_COLUMNS_SET = new Set(Object.values(this.NEGOTIATION_SRV_TC));
    static ALLOWED_NEGOTIATION_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_NEGOTIATION_COLUMNS_SET);
        updateSet.delete(this.NEGOTIATION_SRV_TC.negotiationID);
        return updateSet;
    })();    

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Negotiation( page = 1, sortColumn = FinancialService.NEGOTIATION_SRV_TC.negotiationID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersNegotiationMap = new Map([
        // Nullable FKs: allow null when clearing one owner, or sanitize IDs when provided
        [FinancialService.NEGOTIATION_SRV_TC.quoteID, (val) => this.#transformNullableID(val)],
        [FinancialService.NEGOTIATION_SRV_TC.billID, (val) => this.#transformNullableID(val)],
        [FinancialService.NEGOTIATION_SRV_TC.sender, (val) => this.#transformNegotiationSender(val)],
        [FinancialService.NEGOTIATION_SRV_TC.createdAt, (val) => transformDateValue(val)],
        [FinancialService.NEGOTIATION_SRV_TC.messageText, (val) => this.#transformNegotiationMessage(val)]
    ]);

    #transformNullableID(val) 
    {
        if (val === null) return null;
        if (val === undefined) return undefined;
        return sanitizeInteger(val, true);
    }

    #transformNegotiationSender(val) 
    {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;

        const sender = val.trim().toLowerCase();
        return Object.values(ROLES).includes(sender) ? sender: undefined;
    }

    #transformNegotiationMessage(val) 
    {
        if (typeof val !== 'string') return undefined;
        const val = val.trim();
        return val.length > 0 ? val: undefined;
    }
    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS
    
    // #endregion

    // #region PAYMENT TABLE
    static PAYMENT_SRV_TN = PAYMENT_TN;
    static PAYMENT_SRV_TC = PAYMENT_TC;
    static ALLOWED_PAYMENT_COLUMNS_SET = new Set(Object.values(this.PAYMENT_SRV_TC));
    static ALLOWED_PAYMENT_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_PAYMENT_COLUMNS_SET);
        // Primary key / FK billID identifies the payment record and should not be directly updated
        updateSet.delete(this.PAYMENT_SRV_TC.billID);
        return updateSet;
    })();

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Payment(page = 1, sortColumn = FinancialService.PAYMENT_SRV_TC.billID, isAscending = true ) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersPaymentMap = new Map([
        [FinancialService.PAYMENT_SRV_TC.paidAt, (val) => sanitizeDateValue(val)]
    ]);

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS

    // #endregion
}