import { FLOORING_REQUEST_TC, FLOORING_REQUEST_TN, PHOTO_TC, PHOTO_TN, ROOMAREA_TC, ROOMAREA_TN, sanitizeDateValue, sanitizeInteger, sanitizeString } from "../../Public/constants.js";
import { DbService } from "../db.js";

/** */
export default class ProjectRequestService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }

    // #region FlooringProjectRequest TABLE
    static FLOORING_REQUEST_SRV_TN = FLOORING_REQUEST_TN;
    static FLOORING_REQUEST_SRV_TC = FLOORING_REQUEST_TC;
    static ALLOWED_FLOORING_REQUEST_COLUMNS_SET = new Set(Object.values(this.FLOORING_REQUEST_SRV_TC));
    static ALLOWED_FLOORING_REQUEST_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_FLOORING_REQUEST_COLUMNS_SET);
        updateSet.delete(this.FLOORING_REQUEST_SRV_TC.requestID);
        return updateSet;
    })();

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_FlooringRequest(page = 1, sortColumn = this.constructor.FLOORING_REQUEST_SRV_TC.requestID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersFlooringRequestMap = new Map([
        // FKs: validate positive IDs; guard separately if immutable after creation
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.clientID, (val) => sanitizeInteger(val, true)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.serviceAddressID, (val) => sanitizeInteger(val, true)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.preferredStartDate, (val) => sanitizeDateValue(val)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.preferredEndDate, (val) => this.#transformNullableRequestDate(val)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.proposedBudget, (val) => this.#transformProposedBudget(val)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.notes, (val) => this.#transformNullableRequestText(val)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.status, (val) => this.#transformFlooringRequestStatus(val)],
        [ProjectRequestService.FLOORING_REQUEST_SRV_TC.rejectionReason, (val) => this.#transformNullableRequestText(val)]
    ]);
    /**  Special updates to consider
     * MySQL enforces chk_request_dates (preferredEndDate >= preferredStartDate when preferredEndDate is non-null) and chk_request_rejection (status <> 'rejected' or rejectionReason IS NOT NULL). 
     * When updating status and rejectionReason together, validate or handle constraint errors cleanly if they are updated in separate steps.
    */

    #transformNullableRequestDate(val) {
        if (val === null) return null;
        return sanitizeDateValue(val);
    }

    #transformProposedBudget(val) {
        val = sanitizeDecimal(val, true);
        if (typeof val !== 'number' || !Number.isFinite(val)) 
        { return undefined; }

        return val > 0 ? val: undefined;
    }

    #transformNullableRequestText(val) {
        if (val === null) return null;        
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed: null;
    }

    static flooringRequestStatuses = new Set([ 'submitted', 'rejected', 'negotiating', 'accepted', 'cancelled', 'completed' ]);
    #transformFlooringRequestStatus(val) {
        val = sanitizeString(val);
        if (typeof val !== 'string') return undefined;

        const status = val.trim().toLowerCase();
        return ProjectRequestService.flooringRequestStatuses.has(status) ? status: undefined;
    }

    // #endregion

    // #endregion

    // #region ROOM/AREA TABLE
    static ROOMAREA_SRV_TN = ROOMAREA_TN;
    static ROOMAREA_SRV_TC = ROOMAREA_TC;
    static ALLOWED_ROOMAREA_COLUMNS_SET = new Set(Object.values(this.ROOMAREA_SRV_TC));
    static ALLOWED_ROOMAREA_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_ROOMAREA_COLUMNS_SET);
        // Composite primary key (requestID, roomName) should not be updated directly in place
        updateSet.delete(this.ROOMAREA_SRV_TC.requestID);
        // updateSet.delete(this.ROOMAREA_SRV_TC.roomName);
        return updateSet;
    })();

    static ROOMAREA_SRV_STR_LIMITS = Object.freeze({
        [this.ROOMAREA_SRV_TC.roomName]: 50,
        [this.ROOMAREA_SRV_TC.currentFlooringType]: 50,
        [this.ROOMAREA_SRV_TC.desiredCategoryName]: 50,
        [this.ROOMAREA_SRV_TC.patternName]: 50
    });

    // #region HELPER UPDATE FUNCS
    #transformersRoomAreaMap = new Map([
        [ProjectRequestService.ROOMAREA_SRV_TC.squareFootage, (val) => this.#transformPositiveSquareFootage(val)],
        [ProjectRequestService.ROOMAREA_SRV_TC.currentFlooringType, (val) => this.#transformNullableRoomText(val, ProjectRequestService.ROOMAREA_SRV_STR_LIMITS.currentFlooringType)],
        [ProjectRequestService.ROOMAREA_SRV_TC.removalRequired, (val) => this.#transformRemovalRequired(val)],
        [ProjectRequestService.ROOMAREA_SRV_TC.desiredProductID, (val) => this.#transformNullableRoomID(val)],
        [ProjectRequestService.ROOMAREA_SRV_TC.desiredCategoryName, (val) => this.#transformNullableRoomText(val, ProjectRequestService.ROOMAREA_SRV_STR_LIMITS.desiredCategoryName)],
        [ProjectRequestService.ROOMAREA_SRV_TC.patternName, (val) => this.#transformNullableRoomText(val, ProjectRequestService.ROOMAREA_SRV_STR_LIMITS.patternName)]
    ]);
    /** Special update considerations:
     * MySQL enforces (desiredProductID IS NULL) <> (desiredCategoryName IS NULL). 
     * Allowing null on both desiredProductID and desiredCategoryName lets you switch from a product to a category (or vice versa) in an update payload while letting MySQL validate the resulting row state.
     */

    #transformPositiveSquareFootage(val) {
        const sanitized = sanitizeDecimal(val, true);
        if (typeof sanitized !== 'number' || !Number.isFinite(sanitized)) 
        { return undefined; }

        return sanitized > 0 ? sanitized: undefined;
    }

    #transformNullableRoomText(val, limit) {
        if (val === null) return null;
        val = sanitizeString(val, limit);

        if (typeof val !== 'string') return undefined;
        return val.length > 0 ? val: null;
    }

    #transformNullableRoomID(val) {
        if (val === null) return null;
        return sanitizeInteger(val, true);
    }

    #transformRemovalRequired(val) {
        if (typeof val === 'boolean') return val;
        
        if (typeof val === 'number') 
        {
            if (val === 1) return true;
            if (val === 0) return false;
            return undefined;
        }

        if (typeof val === 'string') {
            const cleaned = sanitizeString(val, 10);
            if (typeof cleaned !== 'string') return undefined;

            const normalized = cleaned.trim().toLowerCase();
            if (normalized === 'true' || normalized === '1') return true;
            if (normalized === 'false' || normalized === '0') return false;
        }

        return undefined;
    }

    // #endregion HELPER UPDATE FUNCS

    // #endregion

    // #region PHOTO TABLE
    static PHOTO_SRV_TN = PHOTO_TN;
    static PHOTO_SRV_TC = PHOTO_TC;
    static ALLOWED_PHOTO_COLUMNS_SET = new Set(Object.values(this.PHOTO_SRV_TC));
    static ALLOWED_PHOTO_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_PHOTO_COLUMNS_SET);
        updateSet.delete(this.PHOTO_SRV_TC.photoID);
        return updateSet;
    })();

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Photo(page = 1, sortColumn = ProjectRequestService.PHOTO_SRV_TC.photoID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region HELPER UPDATE FUNCS
    #transformersPhotoMap = new Map([
        // FK: validate positive integer ID; guard separately if immutable after creation
        [this.constructor.PHOTO_SRV_TC.requestID, (val) => sanitizeInteger(val, true)],
        [this.constructor.PHOTO_SRV_TC.filePath, (val) => this.#transformPhotoFilePath(val)]
    ]);
    
    #transformPhotoFilePath(val) {
        if (typeof val !== 'string') return undefined;
        
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    // #endregion HELPER UPDATE FUNCS

    // #endregion
}