import { CLIENT_TC, CLIENT_TN, nonAlphanumericRegex, nonNumericRegex, transformToValidInput } from "../../Public/constants.js";
import crypto from 'crypto';

function hashPasswordPBKDF2(password) 
{
    // Unique 16-byte salt, 64 bytes = 512 bits
    const salt = crypto.randomBytes(16).toString('hex'); 
    const iterations = 10000; const keylen = 64;
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512');
    
    // Store salt + iterations + hash together to be in the DB
    return `${salt}:${iterations}:${derivedKey.toString('hex')}`;
}

function verifyPasswordPBKDF2(plainPWD, storedCombinedHash) 
{
    const [salt, iterations, originalHash] = storedCombinedHash.split(':');    
    const derivedKey = crypto.pbkdf2Sync(plainPWD, salt, parseInt(iterations, 10), 64, 'sha512');
    return derivedKey.toString('hex') === originalHash; // Rehash to compare
}

/** Handles clients, sign ins, registers as well as address services */
export default class ClientService 
{
    #connection; 
    constructor(connection) { this.#connection = connection; }
    updateConnection(connection) { this.#connection = connection; }

    // #region CLIENT TABLE
    static CLIENTS_TABLE_NAME = CLIENT_TN;
    static CLIENTS_TABLE_COLUMNS = CLIENT_TC;
    static ALLOWED_CLIENTS_COLUMNS_SET = new Set(Object.values(this.CLIENTS_TABLE_COLUMNS));
    static ALLOWED_CLIENTS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_CLIENTS_COLUMNS_SET);
        updateSet.delete(this.CLIENTS_TABLE_COLUMNS.clientID);
        return updateSet;
    })();

    // #region helper update funcs
    // No need to transform Address ID
    #transformersClientsMap = new Map([
        [ClientService.CLIENTS_TABLE_COLUMNS.addressID, (val) => val ],
        [ClientService.CLIENTS_TABLE_COLUMNS.firstname, ], 
        [ClientService.CLIENTS_TABLE_COLUMNS.lastname, ], 
        [ClientService.CLIENTS_TABLE_COLUMNS.passwordHash, ], 
        [ClientService.CLIENTS_TABLE_COLUMNS.phoneNumber, ], 
        [ClientService.CLIENTS_TABLE_COLUMNS.email, ], 
        [ClientService.CLIENTS_TABLE_COLUMNS.cardNumber, ],
        [ClientService.CLIENTS_TABLE_COLUMNS.cardCVV, ],
        [ClientService.CLIENTS_TABLE_COLUMNS.cardExpiration, ]
    ]);

    
    #transformFirstname(val) 
    {
        val = transformToValidInput(val);
        return typeof val === 'string' ? val.trim().substring(0, 256) : undefined;
    }
    #transformLastname(val) 
    {
        val = transformToValidInput(val);
        return typeof val === 'string' ? val.trim().substring(0, 256) : undefined;
    }

    #transformPassword(val, cryptoRun = false) {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim(); 
        if (trimmed.length < 8) return undefined;
        
        return cryptoRun === true ? hashPasswordPBKDF2(trimmed): trimmed;
    }

    #transformPhoneNumber(val)
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.replace(nonNumericRegex, "").substring(0, 15); // +1 111-222-3333 is 15 characters
        return trimmed.length >= 10 ? trimmed: undefined;
    }
    
    // We can check using the regex in a later step
    #transformEmail(val) 
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;
        
        const trimmed = val.trim().substring(0, 100);
        return trimmed.length >= 2 ? trimmed: undefined;
    }

    #transformCardNumber(val)
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.replace(nonAlphanumericRegex, "").substring(0, 20);
        return trimmed.length >= 3 ? trimmed: undefined;
    }
    #transformCVV(val)
    {
        val = transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.replace(nonAlphanumericRegex, "").substring(0, 20);
        return trimmed.length >= 3 ? trimmed: undefined;
    }
    #transformCardExpiry(val)
    {
        if (val instanceof Date) 
        { return Number.isNaN(val.getTime()) ? undefined : val; }

        if (typeof val !== 'string') 
        { return undefined; }

        // Split on '/' or '-' (handles MM/YY, MM/YYYY, MM-YY, MM-YYYY)
        const parts = trimmed.split(/[/-]/);
        if (parts.length !== 2) { return undefined; }
        const [rawMonth, rawYear] = parts.map((p) => p.trim());

        // Ensure strictly numeric parts
        if (!/^\d{1,2}$/.test(rawMonth) || !/^\d{2,4}$/.test(rawYear)) { return undefined; }

        const month = Number.parseInt(rawMonth, 10);
        let year = Number.parseInt(rawYear, 10);
        if (month < 1 || month > 12) { return undefined; }

        // Normalize 2-digit year (e.g., "28" -> 2028)
        if (rawYear.length === 2) { year += 2000; } 
        else if (rawYear.length !== 4) { return undefined; }
        
        // Construct a Date (end of month)
        const date = new Date(Date.UTC(year, month - 1, 0));
        return Number.isNaN(date.getTime()) ? undefined: date;
    }

    // #endregion HELPER UPDATE FUNCS

    // #endregion

    // #region ADDRESS TABLE


    // #endregion
}