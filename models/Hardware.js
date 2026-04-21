import mongoose from 'mongoose';

const hardwareSchema = new mongoose.Schema({
  hardware_type: String,
  windows_hostname: String,
  brand: String,
  serial_number: String,
  windows_version: String,
  windows_language: String,
  keyboard_type: String,
  year_of_purchase: String,
  clarilog_installed: { type: String, default: 'FALSE' },
  comment: String,
  computer_at_office: { type: String, default: 'FALSE' },
  location_at_office: String,
  never_at_office: { type: String, default: 'FALSE' },
  home_office_plus: { type: String, default: 'FALSE' },
  multiple_users: { type: String, default: 'FALSE' },
  single_user: { type: String, default: 'FALSE' },
  user_fullname: String
}, { timestamps: true });

export default mongoose.model('Hardware', hardwareSchema);