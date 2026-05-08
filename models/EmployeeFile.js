import mongoose from 'mongoose';

const employeeFileSchema = new mongoose.Schema({
  employee_id: { type: String, required: true },
  folder_id: { type: String, default: null },
  file_name: { type: String, required: true },
  file_type: String,
  file_size: Number,
  cloudinary_url: { type: String, required: true },
  public_id: { type: String, required: true }
}, { timestamps: true });

employeeFileSchema.set('toJSON', { virtuals: true });
employeeFileSchema.set('toObject', { virtuals: true });

export default mongoose.model('EmployeeFile', employeeFileSchema);