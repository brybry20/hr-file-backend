import mongoose from 'mongoose';

const birthdaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, default: null },
  date_started: { type: String, required: false, default: null },  // Hindi na required
  regularized: { type: String, default: null },
  date_of_birth: { type: String, required: false, default: null }
}, { timestamps: true });

export default mongoose.model('Birthday', birthdaySchema);