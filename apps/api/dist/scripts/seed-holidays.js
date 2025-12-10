"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '../../.env' }); // Adjust path to root .env file
const holidays = [
    // France
    { date: '2025-01-01', country_code: 'FR', description: "New Year's Day" },
    { date: '2025-04-21', country_code: 'FR', description: 'Easter Monday' },
    { date: '2025-05-01', country_code: 'FR', description: 'Labour Day' },
    { date: '2025-05-08', country_code: 'FR', description: 'Victory in Europe Day' },
    { date: '2025-05-29', country_code: 'FR', description: 'Ascension Day' },
    { date: '2025-06-09', country_code: 'FR', description: 'Whit Monday' },
    { date: '2025-07-14', country_code: 'FR', description: 'Bastille Day' },
    { date: '2025-08-15', country_code: 'FR', description: 'Assumption Day' },
    { date: '2025-11-01', country_code: 'FR', description: "All Saints' Day" },
    { date: '2025-11-11', country_code: 'FR', description: 'Armistice Day' },
    { date: '2025-12-25', country_code: 'FR', description: 'Christmas Day' },
    // Germany
    { date: '2025-01-01', country_code: 'DE', description: "New Year's Day" },
    { date: '2025-04-18', country_code: 'DE', description: 'Good Friday' },
    { date: '2025-04-21', country_code: 'DE', description: 'Easter Monday' },
    { date: '2025-05-01', country_code: 'DE', description: 'Labour Day' },
    { date: '2025-05-29', country_code: 'DE', description: 'Ascension Day' },
    { date: '2025-06-09', country_code: 'DE', description: 'Whit Monday' },
    { date: '2025-10-03', country_code: 'DE', description: 'Day of German Unity' },
    { date: '2025-12-25', country_code: 'DE', description: 'Christmas Day' },
    { date: '2025-12-26', country_code: 'DE', description: 'Second Day of Christmas' },
    // Belgium
    { date: '2025-01-01', country_code: 'BE', description: "New Year's Day" },
    { date: '2025-04-21', country_code: 'BE', description: 'Easter Monday' },
    { date: '2025-05-01', country_code: 'BE', description: 'Labour Day' },
    { date: '2025-05-29', country_code: 'BE', description: 'Ascension Day' },
    { date: '2025-06-09', country_code: 'BE', description: 'Whit Monday' },
    { date: '2025-07-21', country_code: 'BE', description: 'Belgian National Day' },
    { date: '2025-08-15', country_code: 'BE', description: 'Assumption Day' },
    { date: '2025-11-01', country_code: 'BE', description: "All Saints' Day" },
    { date: '2025-11-11', country_code: 'BE', description: 'Armistice Day' },
    { date: '2025-12-25', country_code: 'BE', description: 'Christmas Day' },
];
async function seedHolidays() {
    const dbUser = process.env.DB_USER || 'admin';
    const dbPass = process.env.DB_PASS || 'password';
    const dbName = process.env.DB_NAME || 'tracker';
    const dbHost = 'localhost';
    const dbPort = 5432;
    const connectionString = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
    const pool = new pg_1.Pool({
        connectionString,
    });
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected.');
    try {
        console.log('Seeding holidays...');
        for (const holiday of holidays) {
            await client.query("INSERT INTO holidays (date, country_code, description) VALUES ($1, $2, $3) ON CONFLICT (date, country_code) DO NOTHING", [holiday.date, holiday.country_code, holiday.description]);
        }
        console.log('Finished seeding holidays.');
    }
    catch (err) {
        console.error('Error seeding holidays:', err);
    }
    finally {
        client.release();
        await pool.end();
        console.log('Database connection closed.');
    }
}
seedHolidays();
