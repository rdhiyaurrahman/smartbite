const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  toko_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Toko', required: true },
  nama: { type: String, required: true },
  deskripsi: { type: String },
  harga: { type: Number, required: true },
  stok: { type: Number, required: true, default: 0 },
  emoji: { type: String, default: '🍽️' },
  foto_url: { type: String, default: null },
  tersedia: { type: Boolean, default: true },
  terjual: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);