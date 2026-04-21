import mongoose from 'mongoose';

const employeeFileSchema = new mongoose.Schema({
  employee_id: { type: Number, required: true },
  folder_id: { type: Number, default: null },
  file_name: { type: String, required: true },
  file_type: String,
  file_size: Number,
  cloudinary_url: { type: String, required: true },
  public_id: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('EmployeeFile', employeeFileSchema);