import { FLOORING_CATEGORY_TC, FLOORING_CATEGORY_TN, FLOORING_PRODUCT_TC, FLOORING_PRODUCT_TN, limitString, PATTERN_TC, PATTERN_TN, sanitizeDecimal, sanitizeString } from "../../Public/constants.js";
import { DbService } from "../db.js";

/** */
export default class ProductService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }

    // #region Flooring Products table
    static FLOORING_PRODUCT_SRV_TN = FLOORING_PRODUCT_TN;
    static FLOORING_PRODUCT_SRV_TC = FLOORING_PRODUCT_TC;
    static ALLOWED_FLOORING_PRODUCT_COLUMNS_SET = new Set(Object.values(this.FLOORING_PRODUCT_SRV_TC));
    static ALLOWED_FLOORING_PRODUCT_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_FLOORING_PRODUCT_COLUMNS_SET);
        // Primary key productID should not be updated directly
        updateSet.delete(this.FLOORING_PRODUCT_SRV_TC.productID);
        return updateSet;
    })();
    
    static FLOORING_PRODUCT_SRV_STRING_LIMIT = Object.freeze({
        [this.FLOORING_PRODUCT_SRV_TC.productName]: 100, 
        [this.FLOORING_PRODUCT_SRV_TC.categoryName]: 50,
        [this.FLOORING_PRODUCT_SRV_TC.manufacturer]: 100,
        [this.FLOORING_PRODUCT_SRV_TC.materialStyle]: 100,
        [this.FLOORING_PRODUCT_SRV_TC.color]: 50
    });

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_FlooringProduct(page = 1, sortColumn = this.constructor.FLOORING_PRODUCT_SRV_TC.productID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersFlooringProductMap = new Map([
        [ProductService.FLOORING_PRODUCT_SRV_TC.categoryName, 
            (val) => this.#transformRequiredLabel(val, ProductService.FLOORING_PRODUCT_SRV_STRING_LIMIT.categoryName)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.productName, 
            (val) => this.#transformRequiredLabel(val, ProductService.FLOORING_PRODUCT_SRV_STRING_LIMIT.productName)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.manufacturer, 
            (val) => this.#transformRequiredLabel(val, ProductService.FLOORING_PRODUCT_SRV_STRING_LIMIT.manufacturer)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.materialStyle, 
            (val) => this.#transformNullableText(val, ProductService.FLOORING_PRODUCT_SRV_STRING_LIMIT.materialStyle)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.color, 
            (val) => this.#transformNullableText(val, ProductService.FLOORING_PRODUCT_SRV_STRING_LIMIT.color)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.description, (val) => this.#transformNullableText(val)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.imagePath, (val) => this.#transformNullableText(val)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.unitPrice, (val) => sanitizeDecimal(val, true)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.pricingUnit, (val) => this.#transformPricingUnit(val)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.lengthIn, (val) => this.#transformNullablePositiveDecimal(val)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.widthIn, (val) => this.#transformNullablePositiveDecimal(val)],
        [ProductService.FLOORING_PRODUCT_SRV_TC.sqFtPerBox, (val) => this.#transformNullablePositiveDecimal(val)]
    ]);

    #transformRequiredLabel(val, limit) {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;
        
        val = val.trim();
        return val.length > 0 ? val: undefined;
    }
    #transformNullableText(val, limit) {
        if (val === null) return null;        
        if (typeof val !== 'string') return undefined;

        val = limitString(val, limit);
        return val.length > 0 ? val : null;
    }

    #transformNullablePositiveDecimal(val) {
        if (val === null) return null;
        
        val = sanitizeDecimal(val, true);
        if (typeof val !== 'number' || !Number.isFinite(val)) 
        { return val; }
        return val > 0 ? val : undefined;
    }

    static pricingUnits = new Set([ 'sq_ft', 'box', 'piece' ]);
    #transformPricingUnit(val) {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;

        const normalized = val.trim().toLowerCase();
        return ProductService.pricingUnits.has(normalized) ? normalized: undefined;
    }

    // #endregion

    // #endregion

    // #region PATTERN & FLOORING CATEGORY TABLES
    static FLOORING_CATEGORY_SRV_TN = FLOORING_CATEGORY_TN;
    static FLOORING_CATEGORY_SRV_TC = FLOORING_CATEGORY_TC;
    static ALLOWED_FLOORING_CATEGORY_COLUMNS_SET = new Set(Object.values(this.FLOORING_CATEGORY_SRV_TC));
    static ALLOWED_FLOORING_CATEGORY_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_FLOORING_CATEGORY_COLUMNS_SET);
        // Primary key categoryName is the only column; no standalone non-key columns to update
        // updateSet.delete(this.FLOORING_CATEGORY_SRV_TC.categoryName);
        return updateSet;
    })();

    static FLOORING_CATEGORY_SRV_STRING_LIMIT = Object.freeze({
        [this.FLOORING_CATEGORY_SRV_TC.categoryName]: 50
    });

    static PATTERN_SRV_TN = PATTERN_TN;
    static PATTERN_SRV_TC = PATTERN_TC;
    static ALLOWED_PATTERN_COLUMNS_SET = new Set(Object.values(this.PATTERN_SRV_TC));
    static ALLOWED_PATTERN_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_PATTERN_COLUMNS_SET);
        // Primary key patternName is the only column; no standalone non-key columns to update
        // updateSet.delete(this.PATTERN_SRV_TC.patternName);
        return updateSet;
    })();

    static PATTERN_SRV_STRING_LIMIT = Object.freeze({
        [this.PATTERN_SRV_TC.patternName]: 50
    });

    returnOffsetSTMT_FlooringCategory(page = 1, sortColumn = ProductService.FLOORING_CATEGORY_SRV_TC.categoryName, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
    returnOffsetSTMT_Pattern(page = 1, sortColumn = ProductService.PATTERN_SRV_TC.patternName, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }
        
    // #region HELPER UPDATE FUNCS
    #transformersFlooringCategoryMap = new Map([
        [ProductService.FLOORING_CATEGORY_SRV_TC.categoryName, 
            (val) => this.#transformLookupName(val, ProductService.FLOORING_CATEGORY_SRV_STRING_LIMIT.categoryName)]
    ]);
    #transformersPatternMap = new Map([
        [ProductService.PATTERN_SRV_TC.patternName, 
            (val) => this.#transformLookupName(val, ProductService.PATTERN_SRV_STRING_LIMIT.patternName)]
    ]);

    #transformLookupName(val, limit) {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;
        
        return val.length > 0 ? val: undefined;
    }
    // #endregion

    // #endregion
}