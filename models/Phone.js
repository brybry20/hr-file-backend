import mongoose from 'mongoose';

const phoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, required: true },
  serial_number: { type: String, required: false, default: null },  // Hindi na required
  cellphone_number: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Phone', phoneSchema);