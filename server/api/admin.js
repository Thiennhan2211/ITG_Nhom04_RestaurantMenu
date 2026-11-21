const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const JwtUtil = require('../utils/JwtUtil');
const { Admin, Category, Product, Order, Customer, Voucher, TableRequest, Reservation } = require('../models/Models');
const { createProductUploadSignature } = require('../utils/CloudinaryUtil');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isDrinkProduct = (product) => {
  const categoryName = String(product.category?.name || '').toLowerCase();
  return ['uống', 'nước', 'drink', 'beverage'].some(keyword => categoryName.includes(keyword));
};
const getVietnamMonthRange = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric'
  }).formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const vietnamOffset = 7 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - vietnamOffset),
    end: new Date(Date.UTC(year, month, 1) - vietnamOffset)
  };
};
const calculateVoucherDiscount = (voucher, subtotal) => {
  const rawDiscount = voucher.discountType === 'percent'
    ? subtotal * Number(voucher.discount || 0) / 100
    : Number(voucher.discount || 0);
  return Math.min(subtotal, Math.max(0, Math.round(rawDiscount)));
};

const MEMBER_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
const getTierFromSpend = (totalSpent = 0) => {
  if (totalSpent >= 15000000) return 'DIAMOND';
  if (totalSpent >= 5000000) return 'GOLD';
  if (totalSpent >= 2000000) return 'SILVER';
  return 'BRONZE';
};
const normalizeTier = (tier) => MEMBER_TIERS.includes(String(tier || '').toUpperCase())
  ? String(tier).toUpperCase()
  : 'BRONZE';
const tierCanUseVoucher = (customerTier, minimumTier) =>
  MEMBER_TIERS.indexOf(normalizeTier(customerTier)) >= MEMBER_TIERS.indexOf(normalizeTier(minimumTier));
const getMembershipSummary = async (customerId) => {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    return { totalSpent: 0, tier: 'BRONZE' };
  }
  const [customer, spendRows] = await Promise.all([
    Customer.findById(customerId).select('totalSpent'),
    Order.aggregate([
      { $match: {
        customer: new mongoose.Types.ObjectId(customerId),
        status: { $nin: ['CANCELED', 'CANCELLED'] },
        $or: [
          { paymentStatus: 'PAID' },
          { paymentStatus: { $exists: false }, status: { $in: ['APPROVED', 'COMPLETED'] } }
        ]
      } },
      { $group: { _id: null, totalSpent: { $sum: { $ifNull: ['$total', 0] } } } }
    ])
  ]);
  const totalSpent = Math.max(Number(customer?.totalSpent || 0), Number(spendRows[0]?.totalSpent || 0));
  return { totalSpent, tier: getTierFromSpend(totalSpent) };
};
const parseVoucherExpiryDate = (value) => {
  let day = String(value || '').trim();
  const dmy = day.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) day = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const isoDay = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    const [, year, month, date] = isoDay;
    const check = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== day) return null;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(date), 16, 59, 59, 999));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const getEffectiveVoucherExpiry = (voucher) => {
  const expiry = new Date(voucher.expiryDate);
  if (Number.isNaN(expiry.getTime())) return new Date(0);
  if (expiry.getUTCHours() === 0 && expiry.getUTCMinutes() === 0 && expiry.getUTCSeconds() === 0 && expiry.getUTCMilliseconds() === 0) {
    expiry.setUTCHours(16, 59, 59, 999);
  }
  return expiry;
};
const buildVoucherPayload = (body) => {
  const code = String(body.code || '').trim().toUpperCase();
  const discount = Number(body.discount);
  const discountType = body.discountType === 'percent' ? 'percent' : 'amount';
  const minOrder = Number(body.minOrder || 0);
  const expiryDate = parseVoucherExpiryDate(body.expiryDate);
  const minimumTier = normalizeTier(body.minimumTier);
  if (!code || !Number.isFinite(discount) || discount <= 0 ||
      (discountType === 'percent' && discount > 100) ||
      !Number.isFinite(minOrder) || minOrder < 0 || !expiryDate) {
    return { error: 'Vui lòng kiểm tra mã, mức giảm, đơn tối thiểu và ngày hết hạn.' };
  }
  return {
    code,
    title: String(body.title || '').trim(),
    discount,
    discountType,
    minOrder,
    expiryDate,
    minimumTier,
    description: String(body.description || '').trim(),
    status: body.status === 'Inactive' ? 'Inactive' : 'Active'
  };
};

const normalizeStaffRole = (value) => {
  const role = String(value || 'admin').trim().toLowerCase();
  const aliases = {
    reception: 'receptionist',
    frontdesk: 'receptionist',
    'front-desk': 'receptionist',
    chef: 'kitchen',
    cook: 'kitchen'
  };
  const normalizedRole = aliases[role] || role;
  return ['admin', 'receptionist', 'kitchen'].includes(normalizedRole) ? normalizedRole : null;
};
// API ĐĂNG KÝ KHÁCH HÀNG
router.post('/customer-register', async (req, res) => {
  try {
    const { phone, username, password, email } = req.body;

    if (!phone || !username || !password) {
      return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
    }

    // Kiểm tra xem số điện thoại hoặc username đã tồn tại chưa
    const existingCustomer = await Customer.findOne({ $or: [{ phone }, { username }] });
    if (existingCustomer) {
      return res.json({ success: false, message: 'Số điện thoại hoặc tên đăng nhập đã được sử dụng!' });
    }

    const newCustomer = new Customer({
      phone,
      username,
      password,
      email,
      cdate: new Date(),
      active: 1 
    });

    await newCustomer.save();
    res.json({ success: true, message: 'Đăng ký thành công!' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});
// ==================== API ĐĂNG NHẬP CHUNG (UNIFIED LOGIN) ====================
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const usernamePattern = new RegExp(`^${escapeRegex(username)}$`, 'i');
    const adminUser = await Admin.findOne({ username: usernamePattern, password });
    let foundUser = adminUser;
    let assignedRole = adminUser ? normalizeStaffRole(adminUser.role) : null;

    if (!adminUser) {
      foundUser = await Customer.findOne({
        $or: [
          { username: usernamePattern },
          { phone: username }
        ],
        password,
        active: { $ne: 0 }
      });
      if (foundUser) assignedRole = 'customer';
    }

    if (!foundUser || !assignedRole) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    const token = JwtUtil.genToken(foundUser, assignedRole);
    return res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      role: assignedRole,
      username: foundUser.name || foundUser.username || foundUser.phone || username
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Đăng nhập tạm thời không khả dụng.' });
  }
});

router.post('/guest-session', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 100);
  if (!name) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên để tiếp tục.' });
  }

  const guestUser = {
    id: `guest-${require('crypto').randomBytes(12).toString('hex')}`,
    name,
    username: name,
    guest: true
  };
  return res.json({
    success: true,
    token: JwtUtil.genToken(guestUser, 'customer'),
    role: 'customer',
    username: name
  });
});

router.use(JwtUtil.checkToken);

// API Kiểm tra Token hợp lệ
router.get('/token', function (req, res) {
  const token = req.headers['x-access-token'] || req.headers['authorization'];
  res.json({ success: true, message: 'Token hợp lệ', token: token });
});

// 1. DANH MỤC (CATEGORY)
router.get('/categories', JwtUtil.requireRole('admin', 'customer'), async (req, res) => {
  try {
    const categories = await Category.find().sort({ _id: 1 });
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat, index) => {
        const count = await Product.countDocuments({
          $or: [
            { category: cat._id },
            { category: cat._id.toString() }
          ]
        });
        return {
          ...cat.toObject(),
          autoIndex: index + 1,
          productCount: count
        };
      })
    );
    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', JwtUtil.requireRole('admin'), async (req, res) => {
  const category = await Category.create(req.body);
  res.json(category);
});

router.put('/categories/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(category);
});

router.delete('/categories/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// 2. THỰC ĐƠN (PRODUCT)
router.get('/products', JwtUtil.requireRole('admin', 'customer', 'kitchen'), async (req, res) => {
  const query = req.decoded.role === 'customer'
    ? { $or: [{ status: 'Active' }, { status: { $exists: false } }] }
    : {};
  const products = await Product.find(query).populate('category');
  res.json(products);
});

router.post('/products/upload-signature', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    return res.json(createProductUploadSignature(timestamp));
  } catch (err) {
    console.error('Cloudinary signature error:', err.message);
    return res.status(503).json({ success: false, message: err.message });
  }
});

router.post('/products', JwtUtil.requireRole('admin'), async (req, res) => {
  const product = await Product.create(req.body);
  res.json(product);
});

router.put('/products/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

router.put('/products/:id/availability', JwtUtil.requireRole('admin', 'kitchen'), async (req, res) => {
  const status = req.body.status;
  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái món ăn không hợp lệ.' });
  }
  const product = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('category');
  if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn.' });
  return res.json(product);
});

router.delete('/products/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// 3. ĐƠN HÀNG (ORDER)
router.post('/orders', JwtUtil.requireRole('customer'), async (req, res) => {
  try {
    const tableNo = String(req.body.tableNo || '').trim();
    const requestedItems = req.body.items;

    if (!tableNo || !Array.isArray(requestedItems) || requestedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bàn và ít nhất một món.' });
    }

    const productIds = [];
    for (const item of requestedItems) {
      const quantity = Number(item.quantity);
      if (!mongoose.Types.ObjectId.isValid(item.product) || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Thông tin món ăn hoặc số lượng không hợp lệ.' });
      }
      productIds.push(item.product);
    }

    const products = await Product.find({ _id: { $in: productIds } }).populate('category', 'name');
    const productsById = new Map(products.map(product => [product._id.toString(), product]));
    if (productsById.size !== new Set(productIds.map(id => id.toString())).size) {
      return res.status(400).json({ success: false, message: 'Một hoặc nhiều món không còn tồn tại.' });
    }
    if (products.some(product => product.status && product.status !== 'Active')) {
      return res.status(409).json({ success: false, message: 'Một hoặc nhiều món vừa được báo hết hàng. Vui lòng cập nhật giỏ hàng.' });
    }

    const orderItems = [];
    let subtotal = 0;
    for (const item of requestedItems) {
      const product = productsById.get(item.product.toString());
      const quantity = Number(item.quantity);
      const selectedToppings = item.selectedToppings && typeof item.selectedToppings === 'object' && !Array.isArray(item.selectedToppings)
        ? item.selectedToppings
        : {};
      const isDrink = isDrinkProduct(product);
      if (isDrink && Object.keys(selectedToppings).length > 0) {
        return res.status(400).json({ success: false, message: 'Đồ uống không nhận topping.' });
      }
      if (!isDrink && item.drinkOptions) {
        return res.status(400).json({ success: false, message: 'Tuỳ chọn đá và đường chỉ dành cho đồ uống.' });
      }

      let toppingsTotal = 0;
      const normalizedToppings = {};
      const configuredToppings = new Map((product.toppings || []).map(topping => [topping.name, Number(topping.price)]));

      for (const [name, rawQuantity] of Object.entries(selectedToppings)) {
        const toppingQuantity = Number(rawQuantity);
        if (!configuredToppings.has(name) || !Number.isInteger(toppingQuantity) || toppingQuantity < 1) {
          return res.status(400).json({ success: false, message: 'Thông tin món thêm không hợp lệ.' });
        }
        normalizedToppings[name] = toppingQuantity;
        toppingsTotal += configuredToppings.get(name) * toppingQuantity;
      }

      let drinkOptions = null;
      if (isDrink) {
        const ice = String(item.drinkOptions?.ice || 'normal').toLowerCase();
        const sugar = Number(item.drinkOptions?.sugar ?? 100);
        if (!['normal', 'less', 'none'].includes(ice) || ![30, 50, 70, 100].includes(sugar)) {
          return res.status(400).json({ success: false, message: 'Tuỳ chọn đá hoặc đường không hợp lệ.' });
        }
        drinkOptions = { ice, sugar };
      }

      const lineTotal = (Number(product.price) + toppingsTotal) * quantity;
      subtotal += lineTotal;
      orderItems.push({
        product: product._id,
        quantity,
        price: product.price,
        costPrice: Number(product.costPrice || 0),
        note: String(item.note || '').trim(),
        selectedToppings: normalizedToppings,
        toppingTotal: toppingsTotal,
        drinkOptions
      });
    }

    const customer = req.decoded.guest ? null : await Customer.findById(req.decoded.id);
    if (!req.decoded.guest && !customer) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng.' });
    }

    const customerKey = String(req.decoded.id);
    const voucherCode = String(req.body.voucherCode || '').trim().toUpperCase();
    let redeemedVoucher = null;
    let discount = 0;
    if (voucherCode) {
      const customerTier = customer ? (await getMembershipSummary(customer._id)).tier : 'BRONZE';
      const voucher = await Voucher.findOne({
        code: new RegExp(`^${escapeRegex(voucherCode)}$`, 'i'),
        status: 'Active',
        usedBy: { $ne: customerKey }
      });
      if (!voucher || getEffectiveVoucherExpiry(voucher) < new Date()) {
        return res.status(409).json({ success: false, message: 'Mã ưu đãi đã hết hạn, không hợp lệ hoặc bạn đã sử dụng.' });
      }
      if (!tierCanUseVoucher(customerTier, voucher.minimumTier)) {
        const tierNames = { BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', DIAMOND: 'Kim Cương' };
        return res.status(403).json({ success: false, message: `Mã này chỉ dành cho khách hàng hạng ${tierNames[normalizeTier(voucher.minimumTier)]} trở lên.` });
      }
      if (subtotal < Number(voucher.minOrder || 0)) {
        return res.status(400).json({ success: false, message: `Đơn hàng cần đạt tối thiểu ${Number(voucher.minOrder || 0).toLocaleString('vi-VN')} đ để dùng mã này.` });
      }
      const reserved = await Voucher.updateOne({
        _id: voucher._id,
        status: 'Active',
        minOrder: { $lte: subtotal },
        usedBy: { $ne: customerKey }
      }, { $addToSet: { usedBy: customerKey } });
      const changedCount = reserved.modifiedCount ?? reserved.nModified ?? reserved.matchedCount ?? reserved.n ?? 0;
      if (changedCount !== 1) {
        return res.status(409).json({ success: false, message: 'Mã ưu đãi vừa được sử dụng hoặc không còn hợp lệ.' });
      }
      redeemedVoucher = voucher;
      discount = calculateVoucherDiscount(voucher, subtotal);
    }

    const total = Math.max(0, subtotal - discount);
    let order;
    try {
      order = await Order.create({
        tableNo,
        ...(customer ? { customer: customer._id } : { guestSessionId: customerKey }),
        customerName: customer?.name || customer?.username || customer?.phone || req.decoded.name || req.decoded.username,
        customerPhone: customer?.phone || '',
        items: orderItems,
        subtotal,
        discount,
        voucher: redeemedVoucher?._id,
        voucherCode: redeemedVoucher?.code || '',
        total,
        status: 'PENDING',
        paymentStatus: 'UNPAID'
      });
    } catch (createError) {
      if (redeemedVoucher) {
        await Voucher.updateOne({ _id: redeemedVoucher._id }, { $pull: { usedBy: customerKey } });
      }
      throw createError;
    }

    await order.populate('items.product');
    return res.status(201).json(order);
  } catch (err) {
    console.error('Create customer order error:', err);
    return res.status(500).json({ success: false, message: 'Không thể gửi đơn hàng lúc này.' });
  }
});

router.get('/orders', JwtUtil.requireRole('admin', 'receptionist', 'kitchen'), async (req, res) => {
  const orders = await Order.find().sort({ cdate: -1 })
    .populate('items.product')
    .populate('customer', 'name username phone email');
  res.json(orders);
});

router.put('/orders/status/:id', JwtUtil.requireRole('admin', 'receptionist', 'kitchen'), async (req, res) => {
  const status = String(req.body.status || '').trim().toUpperCase();
  if (!['PENDING', 'COOKING', 'APPROVED', 'COMPLETED', 'CANCELED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ.' });
  }
  const previous = await Order.findById(req.params.id);
  if (!previous) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  const update = { $set: { status } };
  if (status === 'COMPLETED' && previous.status !== 'COMPLETED') update.$set.completedAt = new Date();
  if (status !== 'COMPLETED') update.$unset = { completedAt: 1 };
  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  return res.json(order);
});

router.get('/customer/orders', JwtUtil.requireRole('customer'), async (req, res) => {
  const customerKey = String(req.decoded.id);
  const query = req.decoded.guest
    ? { guestSessionId: customerKey }
    : { customer: req.decoded.id };
  const orders = await Order.find(query).sort({ cdate: -1 }).populate('items.product');
  return res.json(orders);
});

router.put('/customer/orders/:id/cancel', JwtUtil.requireRole('customer'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ.' });
  }

  const customerKey = String(req.decoded.id);
  const ownerQuery = req.decoded.guest
    ? { guestSessionId: customerKey }
    : { customer: req.decoded.id };
  const order = await Order.findOne({ _id: req.params.id, ...ownerQuery });
  if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng của bạn.' });
  if (order.status !== 'PENDING' || order.paymentStatus === 'PAID') {
    return res.status(409).json({ success: false, message: 'Chỉ có thể huỷ đơn đang chờ nhà hàng xác nhận.' });
  }

  const cancelledOrder = await Order.findOneAndUpdate(
    { _id: order._id, ...ownerQuery, status: 'PENDING', paymentStatus: { $ne: 'PAID' } },
    { $set: { status: 'CANCELED' } },
    { new: true }
  ).populate('items.product');
  if (!cancelledOrder) {
    return res.status(409).json({ success: false, message: 'Đơn vừa được nhà hàng tiếp nhận nên không thể huỷ.' });
  }

  if (order.voucher) {
    await Voucher.updateOne({ _id: order.voucher }, { $pull: { usedBy: customerKey } });
  }
  return res.json({ success: true, order: cancelledOrder });
});

router.get('/customer-vouchers', JwtUtil.requireRole('customer'), async (req, res) => {
  try {
    const customerKey = String(req.decoded.id);
    const membership = req.decoded.guest ? { tier: 'BRONZE' } : await getMembershipSummary(customerKey);
    const candidates = await Voucher.find({
      status: 'Active',
      usedBy: { $ne: customerKey }
    }).select('code title discount discountType minOrder expiryDate description minimumTier').sort({ expiryDate: 1 });
    const now = new Date();
    return res.json(candidates.filter(voucher =>
      getEffectiveVoucherExpiry(voucher) >= now && tierCanUseVoucher(membership.tier, voucher.minimumTier)
    ));
  } catch (err) {
    console.error('Load customer vouchers error:', err);
    return res.status(500).json({ success: false, message: 'Không thể tải mã ưu đãi lúc này.' });
  }
});

router.post('/customer-vouchers/validate', JwtUtil.requireRole('customer'), async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal);
    if (!code || !Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({ success: false, message: 'Nhập mã ưu đãi và thêm món vào giỏ trước.' });
    }
    const customerKey = String(req.decoded.id);
    const membership = req.decoded.guest ? { tier: 'BRONZE' } : await getMembershipSummary(customerKey);
    const voucher = await Voucher.findOne({
      code: new RegExp(`^${escapeRegex(code)}$`, 'i'),
      status: 'Active',
      usedBy: { $ne: customerKey }
    }).select('code title discount discountType minOrder expiryDate description minimumTier');
    if (!voucher || getEffectiveVoucherExpiry(voucher) < new Date()) {
      return res.status(404).json({ success: false, message: 'Mã ưu đãi không hợp lệ, hết hạn hoặc đã được sử dụng.' });
    }
    if (!tierCanUseVoucher(membership.tier, voucher.minimumTier)) {
      const tierNames = { BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', DIAMOND: 'Kim Cương' };
      return res.status(403).json({ success: false, message: `Mã này chỉ dành cho khách hàng hạng ${tierNames[normalizeTier(voucher.minimumTier)]} trở lên.` });
    }
    if (subtotal < Number(voucher.minOrder || 0)) {
      return res.status(400).json({ success: false, message: `Đơn hàng cần đạt tối thiểu ${Number(voucher.minOrder || 0).toLocaleString('vi-VN')} đ để dùng mã này.` });
    }
    return res.json({
      code: voucher.code,
      title: voucher.title,
      discount: voucher.discount,
      discountType: voucher.discountType,
      discountAmount: calculateVoucherDiscount(voucher, subtotal),
      minOrder: voucher.minOrder,
      minimumTier: normalizeTier(voucher.minimumTier),
      expiryDate: getEffectiveVoucherExpiry(voucher)
    });
  } catch (err) {
    console.error('Validate customer voucher error:', err);
    return res.status(500).json({ success: false, message: 'Không thể kiểm tra mã ưu đãi lúc này.' });
  }
});

// 4. KHÁCH HÀNG (CUSTOMER)
router.get('/customers', JwtUtil.requireRole('admin'), async (req, res) => {
  const customers = await Customer.find({ password: { $exists: true, $ne: null } }).sort({ cdate: -1 });
  if (!customers.length) return res.json([]);
  const customerIds = customers.map(customer => customer._id);
  const eligibleOrders = {
      customer: { $in: customerIds },
      status: { $nin: ['CANCELED', 'CANCELLED'] },
      $or: [
        { paymentStatus: 'PAID' },
        { paymentStatus: { $exists: false }, status: { $in: ['APPROVED', 'COMPLETED'] } }
      ]
  };
  const { start: monthStart, end: monthEnd } = getVietnamMonthRange();
  const [spendingRows, monthlyPointRows] = await Promise.all([
    Order.aggregate([
      { $match: eligibleOrders },
      { $group: {
        _id: '$customer',
        totalSpent: { $sum: { $ifNull: ['$total', 0] } },
        lastOrderDate: { $max: { $ifNull: ['$paidAt', '$cdate'] } }
      } }
    ]),
    Order.aggregate([
      { $match: eligibleOrders },
      { $match: { $expr: { $and: [
        { $gte: [{ $ifNull: ['$paidAt', '$cdate'] }, monthStart] },
        { $lt: [{ $ifNull: ['$paidAt', '$cdate'] }, monthEnd] }
      ] } } },
      { $group: { _id: '$customer', monthlySpent: { $sum: { $ifNull: ['$total', 0] } } } }
    ])
  ]);
  const spendingByCustomer = new Map(spendingRows.map(row => [String(row._id), row]));
  const monthlyPointsByCustomer = new Map(monthlyPointRows.map(row => [String(row._id), Math.floor(Number(row.monthlySpent || 0) / 10000)]));
  return res.json(customers.map(customer => {
    const spending = spendingByCustomer.get(String(customer._id));
    const totalSpent = Math.max(Number(customer.totalSpent || 0), Number(spending?.totalSpent || 0));
    return {
      ...customer.toObject(),
      totalSpent,
      points: monthlyPointsByCustomer.get(String(customer._id)) || 0,
      lastOrderDate: spending?.lastOrderDate || customer.lastOrderDate || null
    };
  }));
});

router.delete('/customers/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Mã khách hàng không hợp lệ.' });
  }
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, password: { $exists: true, $ne: null } });
  if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng.' });
  return res.json({ success: true, deletedId: customer._id });
});

router.put('/customers/status/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, { active: req.body.active }, { new: true });
  res.json(customer);
});

// 5. MÃ GIẢM GIÁ (VOUCHER)
router.get('/vouchers', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ _id: -1 });
    const now = new Date();
    
    const processedVouchers = vouchers.map((v, index) => {
      const currentStatus = getEffectiveVoucherExpiry(v) < now ? 'Expired' : v.status;
      return {
        ...v.toObject(),
        minimumTier: normalizeTier(v.minimumTier),
        autoIndex: index + 1,
        computedStatus: currentStatus
      };
    });

    res.json(processedVouchers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/vouchers', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const payload = buildVoucherPayload(req.body);
    if (payload.error) return res.status(400).json({ success: false, message: payload.error });
    const duplicate = await Voucher.findOne({ code: new RegExp(`^${escapeRegex(payload.code)}$`, 'i') });
    if (duplicate) return res.status(409).json({ success: false, message: 'Mã voucher này đã tồn tại.' });
    const newVoucher = new Voucher(payload);
    const saved = await newVoucher.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/vouchers/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const payload = buildVoucherPayload(req.body);
    if (payload.error) return res.status(400).json({ success: false, message: payload.error });
    const duplicate = await Voucher.findOne({
      code: new RegExp(`^${escapeRegex(payload.code)}$`, 'i'),
      _id: { $ne: req.params.id }
    });
    if (duplicate) return res.status(409).json({ success: false, message: 'Mã voucher này đã tồn tại.' });
    const updated = await Voucher.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy mã voucher.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/vouchers/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. BÁO CÁO (DASHBOARD)
router.get('/reports', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const vietnamNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const today = `${vietnamNow.getUTCFullYear()}-${String(vietnamNow.getUTCMonth() + 1).padStart(2, '0')}-${String(vietnamNow.getUTCDate()).padStart(2, '0')}`;
    const periodType = req.query.periodType === 'month' ? 'month' : 'day';
    const defaultPeriod = periodType === 'month' ? today.slice(0, 7) : today;
    const fromDate = String(req.query.fromDate || defaultPeriod);
    const toDate = String(req.query.toDate || defaultPeriod);
    const isValidDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    const isValidMonth = (value) => {
      if (!/^\d{4}-\d{2}$/.test(value)) return false;
      const [year, month] = value.split('-').map(Number);
      return month >= 1 && month <= 12 && year >= 1;
    };
    const isValidPeriod = periodType === 'month'
      ? isValidMonth(fromDate) && isValidMonth(toDate)
      : isValidDate(fromDate) && isValidDate(toDate);
    if (!isValidPeriod || fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'Khoảng thời gian lọc không hợp lệ.' });
    }

    const [startYear, startMonth, startDay = 1] = fromDate.split('-').map(Number);
    const [endYear, endMonth, endDay = 1] = toDate.split('-').map(Number);
    const vietnamOffset = 7 * 60 * 60 * 1000;
    const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, periodType === 'month' ? 1 : startDay) - vietnamOffset);
    const endDateObj = new Date((periodType === 'month'
      ? Date.UTC(endYear, endMonth, 1)
      : Date.UTC(endYear, endMonth - 1, endDay + 1)) - vietnamOffset);
    const chartDateFormat = periodType === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const paidOrderMatch = {
      status: { $nin: ['CANCELED', 'CANCELLED'] },
      $or: [
        { paymentStatus: 'PAID' },
        { paymentStatus: { $exists: false }, status: { $in: ['APPROVED', 'COMPLETED'] } }
      ],
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ['$paidAt', '$cdate'] }, startDateObj] },
          { $lt: [{ $ifNull: ['$paidAt', '$cdate'] }, endDateObj] }
        ]
      }
    };

    const [revenueByDay, costByDay, orders, customerCounts, products, pendingOrders, topItems] = await Promise.all([
      Order.aggregate([
        { $match: paidOrderMatch },
        { $group: {
          _id: { $dateToString: { format: chartDateFormat, date: { $ifNull: ['$paidAt', '$cdate'] }, timezone: 'Asia/Ho_Chi_Minh' } },
          revenue: { $sum: '$total' }
        } }
      ]),
      Order.aggregate([
        { $match: paidOrderMatch },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
        { $set: {
          effectiveCost: { $ifNull: [
            '$items.costPrice',
            { $ifNull: [{ $arrayElemAt: ['$productInfo.costPrice', 0] }, 0] }
          ] }
        } },
        { $group: {
          _id: { $dateToString: { format: chartDateFormat, date: { $ifNull: ['$paidAt', '$cdate'] }, timezone: 'Asia/Ho_Chi_Minh' } },
          cost: { $sum: { $multiply: ['$effectiveCost', { $ifNull: ['$items.quantity', 0] }] } }
        } }
      ]),
      Order.countDocuments(paidOrderMatch),
      Order.aggregate([
        { $match: paidOrderMatch },
        { $group: { _id: { $ifNull: ['$customer', { $ifNull: ['$guestSessionId', { $toString: '$_id' }] }] } } },
        { $count: 'count' }
      ]),
      Product.countDocuments(),
      Order.find({ status: 'PENDING', cdate: { $gte: startDateObj, $lt: endDateObj } }).sort({ cdate: -1 }).limit(5),
      Order.aggregate([
        { $match: paidOrderMatch },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 4 }
      ])
    ]);

    const revenueByDate = new Map(revenueByDay.map(item => [item._id, Number(item.revenue || 0)]));
    const costByDate = new Map(costByDay.map(item => [item._id, Number(item.cost || 0)]));
    const chartData = [];
    const cursor = new Date(Date.UTC(startYear, startMonth - 1, periodType === 'month' ? 1 : startDay));
    const lastDate = new Date(Date.UTC(endYear, endMonth - 1, periodType === 'month' ? 1 : endDay));
    while (cursor <= lastDate) {
      const key = cursor.toISOString().slice(0, periodType === 'month' ? 7 : 10);
      const revenue = revenueByDate.get(key) || 0;
      const cost = costByDate.get(key) || 0;
      chartData.push({ _id: key, revenue, cost, profit: revenue - cost });
      if (periodType === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const revenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
    const cost = chartData.reduce((sum, item) => sum + item.cost, 0);
    const profit = revenue - cost;
    const customers = Number(customerCounts[0]?.count || 0);
    const topProductsRaw = await Product.populate(topItems, { path: '_id' });
    const topProducts = topProductsRaw.map(item => ({
      _id: item._id?._id,
      name: item._id?.name || 'Món ăn',
      price: item._id?.price || 0,
      image: item._id?.image || '',
      totalSold: item.totalSold
    }));

    return res.json({
      reportVersion: 4,
      period: { periodType, fromDate, toDate },
      revenue,
      cost,
      profit,
      orders,
      customers,
      products,
      chartData,
      tableRequests: pendingOrders,
      topProducts
    });
  } catch (err) {
    console.error("Lỗi báo cáo:", err);
    res.status(500).json({ error: err.message });
  }
});
// Reception desk APIs: table occupancy, reservations, guest service requests, and checkout.
const getTableNumber = (value) => {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

router.get('/tables-status', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ''))
      ? String(req.query.date)
      : new Date().toISOString().slice(0, 10);
    const tables = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Bàn ${String(index + 1).padStart(2, '0')}`,
      status: 'empty',
      guests: 0,
      time: '',
      note: '4 ghế'
    }));

    const activeOrders = await Order.find({
      paymentStatus: { $ne: 'PAID' },
      status: { $nin: ['CANCELED', 'CANCELLED'] }
    }).select('tableNo items cdate');
    activeOrders.forEach((order) => {
      const table = tables.find(item => item.id === getTableNumber(order.tableNo));
      if (!table) return;
      table.status = 'occupied';
      table.guests += 1;
      table.time = order.cdate || new Date();
    });

    const reservations = await Reservation.find({
      serviceDate: date,
      completed: false,
      reservedAt: { $gte: new Date() }
    }).sort({ reservedAt: 1 });
    reservations.forEach((reservation) => {
      const table = tables.find(item => item.id === getTableNumber(reservation.tableNo));
      if (table && table.status === 'empty') {
        table.status = 'reserved';
        table.time = reservation.reservedAt;
      }
    });

    return res.json({ success: true, tables, reservations });
  } catch (err) {
    console.error('Reception table status error:', err);
    return res.status(500).json({ success: false, message: 'Không thể tải trạng thái bàn.' });
  }
});

router.get('/service-requests', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  const requests = await TableRequest.find({ status: 'PENDING' }).sort({ cdate: 1 });
  return res.json(requests);
});

router.post('/service-requests', JwtUtil.requireRole('customer'), async (req, res) => {
  const tableNo = String(req.body.tableNo || '').trim();
  const content = String(req.body.content || '').trim().slice(0, 300);
  if (!tableNo || getTableNumber(tableNo) < 1 || getTableNumber(tableNo) > 12 || !content) {
    return res.status(400).json({ success: false, message: 'Thông tin yêu cầu phục vụ không hợp lệ.' });
  }
  const request = await TableRequest.create({
    tableNo,
    content,
    customerName: String(req.decoded.name || req.decoded.username || '').trim()
  });
  return res.status(201).json(request);
});

router.put('/service-requests/:id/status', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  if (req.body.status !== 'RESOLVED') {
    return res.status(400).json({ success: false, message: 'Trạng thái yêu cầu không hợp lệ.' });
  }
  const request = await TableRequest.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
  if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu phục vụ.' });
  return res.json(request);
});

router.post('/reservations', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  const tableNumber = getTableNumber(req.body.tableNo);
  const customerName = String(req.body.customerName || '').trim().slice(0, 100);
  const customerPhone = String(req.body.customerPhone || '').trim().slice(0, 30);
  const reservedAt = new Date(req.body.reservedAt);
  const serviceDate = String(req.body.serviceDate || '').trim();
  const guests = Number(req.body.guests);
  if (tableNumber < 1 || tableNumber > 12 || !customerName || !customerPhone ||
      Number.isNaN(reservedAt.getTime()) || reservedAt.getTime() <= Date.now() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !Number.isInteger(guests) || guests < 1 || guests > 4) {
    return res.status(400).json({ success: false, message: 'Vui lòng kiểm tra lại thông tin đặt bàn.' });
  }

  const tableNo = String(tableNumber);
  const existing = await Reservation.findOne({ tableNo, serviceDate, completed: false, reservedAt: { $gte: new Date() } });
  if (existing) return res.status(409).json({ success: false, message: 'Bàn này đã có lịch đặt trong ngày.' });

  const reservation = await Reservation.create({ tableNo, customerName, customerPhone, guests, reservedAt, serviceDate });
  return res.status(201).json(reservation);
});

router.put('/reservations/:id/complete', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  const reservation = await Reservation.findByIdAndUpdate(req.params.id, { completed: true }, { new: true });
  if (!reservation) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch đặt bàn.' });
  return res.json(reservation);
});

router.get('/tables/:id/bill', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  const tableNumber = Number(req.params.id);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 12) {
    return res.status(400).json({ success: false, message: 'Số bàn không hợp lệ.' });
  }
  const openOrders = await Order.find({
    paymentStatus: { $ne: 'PAID' },
    status: { $nin: ['CANCELED', 'CANCELLED'] }
  }).populate('items.product').sort({ cdate: 1 });
  const orders = openOrders.filter(order => getTableNumber(order.tableNo) === tableNumber);
  return res.json({ orders });
});

router.put('/tables/:id/checkout', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  const tableNumber = Number(req.params.id);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 12) {
    return res.status(400).json({ success: false, message: 'Số bàn không hợp lệ.' });
  }
  const paymentMethod = String(req.body.paymentMethod || '').trim();
  if (!['CASH', 'BANK_TRANSFER'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn phương thức thanh toán.' });
  }
  const openOrders = await Order.find({ paymentStatus: { $ne: 'PAID' }, status: { $nin: ['CANCELED', 'CANCELLED'] } }).select('_id tableNo');
  const orderIds = openOrders.filter(order => getTableNumber(order.tableNo) === tableNumber).map(order => order._id);
  if (orderIds.length === 0) return res.status(409).json({ success: false, message: 'Bàn này không có hóa đơn cần thanh toán.' });
  await Order.updateMany({ _id: { $in: orderIds } }, { paymentStatus: 'PAID', paymentMethod, paidAt: new Date() });
  return res.json({ success: true, paidOrders: orderIds.length });
});
module.exports = router;
