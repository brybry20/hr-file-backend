import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  assigned_to: { type: String, required: true },
  type_of_car: { type: String, required: true },
  plate_number: { type: String, required: false, default: 'Not Assigned' },  // Hindi na required
  autosweep_acct: { type: String, default: null },
  card_no: { type: String, default: null },
  easytrip_acct: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Car', carSchema);