import dotenv from 'dotenv';
dotenv.config();

import sqlite3 from 'sqlite3';
import mongoose from 'mongoose';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import models
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import ResignedEmployee from '../models/ResignedEmployee.js';
import BankAccount from '../models/BankAccount.js';
import Hardware from '../models/Hardware.js';
import Phone from '../models/Phone.js';
import Car from '../models/Car.js';
import Birthday from '../models/Birthday.js';
import EmployeeFile from '../models/EmployeeFile.js';
import EmployeeFolder from '../models/EmployeeFolder.js';

const dbPath = join(__dirname, '..', 'hr_database.sqlite');
const db = new sqlite3.Database(dbPath);

async function migrate() {
  console.log('🚀 Starting migration from SQLite to MongoDB...');
  console.log(`📁 SQLite DB path: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ SQLite database file not found!');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');
    
    console.log('🗑️ Clearing existing MongoDB collections...');
    await Promise.all([
      User.deleteMany({}),
      Employee.deleteMany({}),
      ResignedEmployee.deleteMany({}),
      BankAccount.deleteMany({}),
      Hardware.deleteMany({}),
      Phone.deleteMany({}),
      Car.deleteMany({}),
      Birthday.deleteMany({}),
      EmployeeFile.deleteMany({}),
      EmployeeFolder.deleteMany({})
    ]);
    console.log('✅ Cleared existing collections');
    
    const getData = (table) => {
      return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) {
            if (err.message.includes('no such table')) {
              resolve([]);
            } else {
              reject(err);
            }
          } else {
            resolve(rows || []);
          }
        });
      });
    };
    
    // 1. Users
    const users = await getData('users');
    if (users.length) {
      await User.insertMany(users);
      console.log(`✅ Migrated ${users.length} users`);
    }
    
    // 2. Employees
    const employees = await getData('employees');
    if (employees.length) {
      await Employee.insertMany(employees);
      console.log(`✅ Migrated ${employees.length} employees`);
    }
    
    // 3. Resigned Employees
    const resigned = await getData('resigned_employees');
    if (resigned.length) {
      await ResignedEmployee.insertMany(resigned);
      console.log(`✅ Migrated ${resigned.length} resigned employees`);
    }
    
    // 4. Bank Accounts
    const bankAccounts = await getData('bank_accounts');
    if (bankAccounts.length) {
      const cleaned = bankAccounts.map(acc => ({
        ...acc,
        account_number: acc.account_number || ''
      }));
      await BankAccount.insertMany(cleaned);
      console.log(`✅ Migrated ${bankAccounts.length} bank accounts`);
    }
    
    // 5. Hardware
    const hardware = await getData('hardware_inventory');
    if (hardware.length) {
      await Hardware.insertMany(hardware);
      console.log(`✅ Migrated ${hardware.length} hardware items`);
    }
    
    // 6. Phones
    const phones = await getData('phone_inventory');
    if (phones.length) {
      const cleaned = phones.map(phone => ({
        name: phone.name || 'Unknown',
        unit: phone.unit || 'Not Specified',
        serial_number: phone.serial_number || null,
        cellphone_number: phone.cellphone_number || 'Not Provided'
      }));
      await Phone.insertMany(cleaned);
      console.log(`✅ Migrated ${phones.length} phones`);
    }
    
    // 7. Cars
    const cars = await getData('cars_inventory');
    if (cars.length) {
      const cleaned = cars.map(car => ({
        assigned_to: car.assigned_to || 'Unknown',
        type_of_car: car.type_of_car || 'Not Specified',
        plate_number: car.plate_number || 'Not Assigned',
        autosweep_acct: car.autosweep_acct || null,
        card_no: car.card_no || null,
        easytrip_acct: car.easytrip_acct || null
      }));
      await Car.insertMany(cleaned);
      console.log(`✅ Migrated ${cars.length} cars`);
    }
    
// 8. Birthdays - HANDLE BLANK FIELDS
const birthdays = await getData('birthdays');
if (birthdays.length) {
  const cleanedBirthdays = birthdays.map(bday => ({
    name: bday.name && bday.name.trim() !== '' ? bday.name : 'Unknown',
    position: bday.position || null,
    date_started: bday.date_started && bday.date_started.trim() !== '' ? bday.date_started : null,
    regularized: bday.regularized || null,
    date_of_birth: bday.date_of_birth && bday.date_of_birth.trim() !== '' ? bday.date_of_birth : null
  }));
  await Birthday.insertMany(cleanedBirthdays);
  console.log(`✅ Migrated ${birthdays.length} birthdays`);
} else {
  console.log(`⚠️ No birthdays found`);
}
    
    // 9. Employee Files
    const files = await getData('employee_files');
    if (files.length) {
      await EmployeeFile.insertMany(files);
      console.log(`✅ Migrated ${files.length} files`);
    }
    
    // 10. Employee Folders
    const folders = await getData('employee_folders');
    if (folders.length) {
      await EmployeeFolder.insertMany(folders);
      console.log(`✅ Migrated ${folders.length} folders`);
    }
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('📊 SUMMARY:');
    console.log(`   ├── Users: ${users.length}`);
    console.log(`   ├── Employees: ${employees.length}`);
    console.log(`   ├── Resigned: ${resigned.length}`);
    console.log(`   ├── Bank Accounts: ${bankAccounts.length}`);
    console.log(`   ├── Hardware: ${hardware.length}`);
    console.log(`   ├── Phones: ${phones.length}`);
    console.log(`   ├── Cars: ${cars.length}`);
    console.log(`   ├── Birthdays: ${birthdays.length}`);
    console.log(`   ├── Files: ${files.length}`);
    console.log(`   └── Folders: ${folders.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    db.close();
    await mongoose.disconnect();
    console.log('🔌 Database connections closed');
  }
}

migrate();