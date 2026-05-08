import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: String,
  diploma: String,
  date_started: String,
  date_regularized: String,
  employment_status: String,
  salary: Number,
  sss: String,
  philhealth: String,
  pagibig: String,
  tin: String,
  cp_viber: String,
  official_email: String,
  home_address: String,
  resignation_date: String
}, { timestamps: true });

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);