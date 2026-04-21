import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  account_number: { type: String, required: false, default: null }  // required: false
}, { timestamps: true });

export default mongoose.model('BankAccount', bankAccountSchema);