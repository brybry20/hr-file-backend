import mongoose from 'mongoose';

const resignedEmployeeSchema = new mongoose.Schema({
  original_id: Number,
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
  resignation_date: String,
  reason: String
}, { timestamps: true });

export default mongoose.model('ResignedEmployee', resignedEmployeeSchema);