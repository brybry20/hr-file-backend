import xlsx from 'xlsx';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import readline from 'readline'; // <- Fixed: import at the top
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE_PATH = path.join(__dirname, 'Deltaplus Ph_Masterlist.xlsx');
const DB_PATH = path.join(__dirname, 'hr_database.sqlite');

// Colors for console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

console.log(`${colors.magenta}╔════════════════════════════════════════╗`);
console.log(`║    BANK ACCOUNTS ONLY IMPORT         ║`);
console.log(`╚════════════════════════════════════════╝${colors.reset}\n`);

// Check if Excel file exists
if (!fs.existsSync(EXCEL_FILE_PATH)) {
    console.error(`${colors.red}❌ Excel file not found at:${colors.reset}`);
    console.error(`   ${EXCEL_FILE_PATH}`);
    process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(DB_PATH);

// Read Excel file
console.log(`${colors.blue}📂 Reading Excel file...${colors.reset}`);
const workbook = xlsx.readFile(EXCEL_FILE_PATH);

// Helper function to clean strings
function cleanString(val) {
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') return String(val);
    return String(val).trim();
}

// ============================================
// CHECK BANK ACCOUNT SHEET STRUCTURE
// ============================================
function checkBankAccountSheet() {
    return new Promise((resolve) => {
        const sheetName = 'Bank Account';
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
            console.error(`${colors.red}❌ Sheet "${sheetName}" not found!${colors.reset}`);
            console.log(`\n${colors.yellow}Available sheets:${colors.reset}`);
            workbook.SheetNames.forEach(name => console.log(`   - ${name}`));
            process.exit(1);
        }
        
        console.log(`${colors.green}✅ Found sheet: ${sheetName}${colors.reset}\n`);
        
        // Convert sheet to array of arrays
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        console.log(`${colors.cyan}📋 BANK ACCOUNT SHEET STRUCTURE:${colors.reset}`);
        console.log('='.repeat(60));
        
        // Display first 15 rows para makita ang structure
        for (let i = 0; i < Math.min(15, data.length); i++) {
            const row = data[i];
            if (row && row.length > 0) {
                // Show non-empty cells
                const cells = [];
                for (let j = 0; j < row.length; j++) {
                    if (row[j]) {
                        cells.push(`[${j}] "${String(row[j]).trim()}"`);
                    }
                }
                if (cells.length > 0) {
                    console.log(`Row ${i}: ${cells.join('  ')}`);
                } else {
                    console.log(`Row ${i}: [empty]`);
                }
            } else {
                console.log(`Row ${i}: [empty]`);
            }
        }
        
        console.log('='.repeat(60));
        
        // Find where the data actually starts
        let headerRow = -1;
        let nameCol = 0;
        let acctCol = 1;
        
        // Try to find header row
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            if (!row) continue;
            
            for (let j = 0; j < row.length; j++) {
                const cell = row[j] ? String(row[j]).trim().toUpperCase() : '';
                if (cell === 'NAME' || cell === 'NAME ') {
                    headerRow = i;
                    nameCol = j;
                    // Check if next column might be account number
                    if (row[j+1] && String(row[j+1]).trim().toUpperCase().includes('ACCOUNT')) {
                        acctCol = j+1;
                    }
                    console.log(`${colors.green}✅ Found header at row ${i}, NAME col ${j}, ACCOUNT col ${acctCol}${colors.reset}`);
                    break;
                }
            }
            if (headerRow !== -1) break;
        }
        
        // If still not found, assume based on common structure
        if (headerRow === -1) {
            console.log(`${colors.yellow}⚠️ Could not auto-detect header row. Using default: row 3, col 0 for NAME, col 1 for ACCOUNT${colors.reset}`);
            headerRow = 3; // Based on your data: row 3 has headers
            nameCol = 0;
            acctCol = 1;
        }
        
        resolve({ headerRow, nameCol, acctCol, data });
    });
}

// ============================================
// IMPORT BANK ACCOUNTS
// ============================================
async function importBankAccounts() {
    try {
        const { headerRow, nameCol, acctCol, data } = await checkBankAccountSheet();
        
        console.log(`\n${colors.cyan}📊 IMPORTING BANK ACCOUNTS...${colors.reset}`);
        
        let accounts = [];
        let skipped = 0;
        
        // Start from the row after header
        for (let i = headerRow + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) {
                skipped++;
                continue;
            }
            
            const name = row[nameCol] ? cleanString(row[nameCol]) : '';
            const accountNumber = row[acctCol] ? cleanString(row[acctCol]) : '';
            
            // Skip if name is empty or is a header
            if (!name || name === 'NAME' || name === 'NAME ' || name.includes('DELTAPLUS')) {
                skipped++;
                continue;
            }
            
            // Skip if it's a section header
            if (name === 'ADMIN' || name.includes('FINANCE') || name.includes('SALES') || name.includes('WAREHOUSE')) {
                skipped++;
                continue;
            }
            
            accounts.push({
                name: name,
                account_number: accountNumber || ''
            });
            
            console.log(`   ${accounts.length}. ${name} -> ${accountNumber || 'NO ACCOUNT'}`);
        }
        
        console.log(`\n${colors.cyan}📊 SUMMARY:${colors.reset}`);
        console.log(`   Total rows processed: ${data.length - (headerRow + 1)}`);
        console.log(`   Valid accounts found: ${accounts.length}`);
        console.log(`   Skipped rows: ${skipped}`);
        
        if (accounts.length === 0) {
            console.log(`\n${colors.yellow}⚠️ No bank accounts to import${colors.reset}`);
            db.close();
            return;
        }
        
        // Preview first 10 accounts
        console.log(`\n${colors.blue}📋 First 10 accounts to import:${colors.reset}`);
        for (let i = 0; i < Math.min(10, accounts.length); i++) {
            console.log(`   ${i+1}. ${accounts[i].name} - ${accounts[i].account_number}`);
        }
        if (accounts.length > 10) {
            console.log(`   ... and ${accounts.length - 10} more`);
        }
        
        // Ask for confirmation
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log(`\n${colors.yellow}❓ Do you want to import these ${accounts.length} bank accounts? (y/n)${colors.reset}`);
        
        rl.question('> ', (answer) => {
            rl.close();
            
            if (answer.toLowerCase() !== 'y') {
                console.log(`${colors.yellow}⏸️  Import cancelled by user${colors.reset}`);
                db.close();
                return;
            }
            
            // Clear existing bank accounts first
            console.log(`\n${colors.blue}🧹 Clearing existing bank accounts...${colors.reset}`);
            db.run('DELETE FROM bank_accounts', [], (err) => {
                if (err) {
                    console.error(`${colors.red}❌ Error clearing table:${colors.reset}`, err.message);
                } else {
                    console.log(`${colors.green}✅ Existing accounts cleared${colors.reset}`);
                }
                
                // Insert new accounts
                console.log(`\n${colors.blue}💾 Inserting ${accounts.length} bank accounts...${colors.reset}`);
                
                let inserted = 0;
                let errors = 0;
                
                const stmt = db.prepare(`INSERT INTO bank_accounts (name, account_number) VALUES (?, ?)`);
                
                accounts.forEach((acc, index) => {
                    stmt.run([acc.name, acc.account_number], function(err) {
                        if (err) {
                            errors++;
                            console.error(`${colors.red}   ❌ Error:${colors.reset} ${acc.name} - ${err.message}`);
                        } else {
                            inserted++;
                            if (inserted % 10 === 0 || inserted === accounts.length) {
                                console.log(`   ✅ ${inserted}/${accounts.length} imported...`);
                            }
                        }
                        
                        if (index === accounts.length - 1) {
                            stmt.finalize();
                            
                            console.log(`\n${colors.cyan}📈 IMPORT RESULTS:${colors.reset}`);
                            console.log(`   ✅ Successfully imported: ${inserted}`);
                            console.log(`   ❌ Errors: ${errors}`);
                            
                            // Verify by counting
                            db.get('SELECT COUNT(*) as count FROM bank_accounts', [], (err, row) => {
                                if (err) {
                                    console.error(`${colors.red}❌ Error verifying:${colors.reset}`, err.message);
                                } else {
                                    console.log(`\n${colors.green}📊 Database now has ${row.count} bank accounts${colors.reset}`);
                                }
                                
                                // Show sample of imported data
                                db.all('SELECT * FROM bank_accounts LIMIT 5', [], (err, rows) => {
                                    if (!err && rows.length > 0) {
                                        console.log(`\n${colors.blue}📋 Sample of imported data:${colors.reset}`);
                                        rows.forEach(r => {
                                            console.log(`   ${r.id}. ${r.name} - ${r.account_number}`);
                                        });
                                    }
                                    db.close();
                                });
                            });
                        }
                    });
                });
            });
        });
        
    } catch (error) {
        console.error(`${colors.red}❌ Import failed:${colors.reset}`, error);
        db.close();
    }
}

// ============================================
// CREATE TABLE IF NOT EXISTS
// ============================================
db.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error(`${colors.red}❌ Error creating table:${colors.reset}`, err.message);
        process.exit(1);
    }
    
    console.log(`${colors.green}✅ Bank accounts table ready${colors.reset}\n`);
    
    // Run the import
    importBankAccounts();
});