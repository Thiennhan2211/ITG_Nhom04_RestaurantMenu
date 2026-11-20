const mongoose = require('mongoose');

// Admin Schema
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true, select: false },
  role: { type: String, default: 'admin' },
  name: String
}, { versionKey: false });

// Category Schema
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { versionKey: false });

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0, min: 0 },
  image: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, default: 'Active' },
  description: String
}, { versionKey: false });

// Order Item Schema
const ItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  price: Number,
  costPrice: { type: Number, min: 0 },
  note: { type: String, default: '' },
  selectedToppings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Order Schema
const OrderSchema = new mongoose.Schema({
  tableNo: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  guestSessionId: String,
  customerName: String,
  customerPhone: String,
  items: [ItemSchema],
  subtotal: Number,
  discount: { type: Number, default: 0 },
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  voucherCode: String,
  total: Number,
  status: { type: String, default: 'PENDING' }, // PENDING, APPROVED, COMPLETED, CANCELED
  completedAt: Date,
  paymentStatus: { type: String, default: 'UNPAID' },
  paymentMethod: { type: String, default: '' },
  paidAt: Date,
  cdate: { type: Date, default: Date.now }
}, { versionKey: false });

// Customer Schema
const CustomerSchema = new mongoose.Schema({
  username: String,
  password: { type: String, select: false },
  name: String,
  phone: String,
  email: String,
  totalSpent: { type: Number, default: 0, min: 0 },
  points: { type: Number, default: 0, min: 0 },
  cdate: Date,
  active: { type: Number, default: 1 }
}, { versionKey: false });

// Voucher Schema
const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: { type: String, default: '' },
  discount: { type: Number, required: true },
  discountType: { type: String, default: 'amount' }, // 'amount' (VNĐ) hoặc 'percent' (%)
  minOrder: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  minimumTier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'], default: 'BRONZE' },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  usedBy: { type: [String], default: [] }
}, { versionKey: false });

const TableRequestSchema = new mongoose.Schema({
  tableNo: { type: String, required: true },
  customerName: { type: String, default: '' },
  content: { type: String, required: true },
  status: { type: String, default: 'PENDING' }, // PENDING, RESOLVED
  cdate: { type: Date, default: Date.now }
}, { versionKey: false });

const ReservationSchema = new mongoose.Schema({
  tableNo: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  guests: { type: Number, default: 2 },
  reservedAt: { type: Date, required: true },
  serviceDate: { type: String, required: true },
  completed: { type: Boolean, default: false },
  cdate: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = {
  Admin: mongoose.model('Admin', AdminSchema),
  Category: mongoose.model('Category', CategorySchema),
  Product: mongoose.model('Product', ProductSchema),
  Order: mongoose.model('Order', OrderSchema),
  Customer: mongoose.model('Customer', CustomerSchema),
  Voucher: mongoose.model('Voucher', VoucherSchema),
  TableRequest: mongoose.model('TableRequest', TableRequestSchema),
  Reservation: mongoose.model('Reservation', ReservationSchema)
};
