import mongoose from 'mongoose';

const employeeFolderSchema = new mongoose.Schema({
  employee_id: { type: Number, required: true },
  folder_name: { type: String, required: true },
  parent_folder_id: { type: Number, default: null }
}, { timestamps: true });

export default mongoose.model('EmployeeFolder', employeeFolderSchema);