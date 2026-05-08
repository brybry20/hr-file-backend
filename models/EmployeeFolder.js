import mongoose from 'mongoose';

const employeeFolderSchema = new mongoose.Schema({
  employee_id: { type: String, required: true },
  folder_name: { type: String, required: true },
  parent_folder_id: { type: String, default: null }
}, { timestamps: true });

employeeFolderSchema.set('toJSON', { virtuals: true });
employeeFolderSchema.set('toObject', { virtuals: true });

export default mongoose.model('EmployeeFolder', employeeFolderSchema);