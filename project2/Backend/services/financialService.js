import { INSTALLATION_ORDER_TC, INSTALLATION_ORDER_TN, QUOTE_ITEM_TC, QUOTE_ITEM_TN, QUOTE_TC, QUOTE_TN, sanitizeDateValue, sanitizeDecimal, sanitizeInteger, sanitizeString } from "../../Public/constants.js";
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
        [QuoteService.QUOTE_SRV_TC.proposedEndDate, (val) => sanitizeDateValue(val)],
        [QuoteService.QUOTE_SRV_TC.note, (val) => this.#transformNote(val)],
        [QuoteService.QUOTE_SRV_TC.status, (val) => this.#transformQuoteStatus(val)]
    ]);

    #transformDate(val) {
        // Normalize date input (YYYY-MM-DD or Date) into valid date string/Date, or return undefined
        val = sanitizeDateValue(val);
        return val;
    }

    #transformDateTime(val) {
        // Normalize timestamp/datetime input (ISO string or Date) into valid MySQL DATETIME/Date, or return undefined
        val = sanitizeDateValue(val);
        return val;
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

    // #region INSTALLATION ORDER TABLE
    static INSTALLATION_ORDER_SRV_TN = INSTALLATION_ORDER_TN;
    static INSTALLATION_ORDER_SRV_TC = INSTALLATION_ORDER_TC;
    static ALLOWED_INSTALLATION_ORDER_COLUMNS_SET = new Set(Object.values(this.INSTALLATION_ORDER_SRV_TC));
    static ALLOWED_INSTALLATION_ORDER_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_INSTALLATION_ORDER_COLUMNS_SET);
        updateSet.delete(this.INSTALLATION_ORDER_SRV_TC.orderID);
        return updateSet;
    })();
    
    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_InstallationOrder(page = 1, sortColumn = FinancialService.INSTALLATION_ORDER_SRV_TC.orderID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    
    // #region HELPER UPDATE FUNCS
    #transformersInstallationOrderMap = new Map([
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.quoteID, (val) => val],  // FK (UNIQUE): pass through or guard separately if immutable after creation
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.actualInstallationDate, (val) => this.#transformInstallationDate(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.completionDate, (val) => this.#transformInstallationDate(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.completionNotes, (val) => this.#transformCompletionNotes(val)],
        [InstallationOrderService.INSTALLATION_ORDER_SRV_TC.status, (val) => this.#transformInstallationOrderStatus(val)]
    ]);

    static installationOrderStatuses = new Set([ 'scheduled', 'in_progress', 'completed', 'canceled']);
    #transformInstallationOrderStatus(val) 
    {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;
        const status = val.trim().toLowerCase();
        return FinancialService.installationOrderStatuses.has(status) ? status: undefined;
    }

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS


    // #endregion

    // #region BILL TABLE

    // #region HELPER UPDATE FUNCS

    

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS
    
    // #endregion

    // #region NEGOTIATION TABLE

    // #region HELPER UPDATE FUNCS

    

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS
    
    // #endregion

    // #region PAYMENT TABLE

    // #region HELPER UPDATE FUNCS

    

    // #endregion HELPER UPDATE FUNCS

    // #region OPERATIONAL FUNCTIONS



    // #endregion OPERATIONAL FUNCTIONS

    // #endregion
}