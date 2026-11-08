const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const JwtUtil = require('../utils/JwtUtil');
const { Admin, Category, Product, Order, Customer, Voucher } = require('../models/Models');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
router.get('/products', JwtUtil.requireRole('admin', 'customer'), async (req, res) => {
  const products = await Product.find().populate('category');
  res.json(products);
});

router.post('/products', JwtUtil.requireRole('admin'), async (req, res) => {
  const product = await Product.create(req.body);
  res.json(product);
});

router.put('/products/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
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

    const toppingPrices = {
      'Rau thêm': 3000,
      'Mì thêm': 10000,
      'Đậu hũ thêm': 10000,
      'Nấm': 5000,
      'Chả chay': 5000
    };
    const productIds = [];
    for (const item of requestedItems) {
      const quantity = Number(item.quantity);
      if (!mongoose.Types.ObjectId.isValid(item.product) || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Thông tin món ăn hoặc số lượng không hợp lệ.' });
      }
      productIds.push(item.product);
    }

    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map(product => [product._id.toString(), product]));
    if (productsById.size !== new Set(productIds.map(id => id.toString())).size) {
      return res.status(400).json({ success: false, message: 'Một hoặc nhiều món không còn tồn tại.' });
    }

    const orderItems = [];
    let total = 0;
    for (const item of requestedItems) {
      const product = productsById.get(item.product.toString());
      const quantity = Number(item.quantity);
      const selectedToppings = item.selectedToppings && typeof item.selectedToppings === 'object' && !Array.isArray(item.selectedToppings)
        ? item.selectedToppings
        : {};
      let toppingsTotal = 0;
      const normalizedToppings = {};

      for (const [name, rawQuantity] of Object.entries(selectedToppings)) {
        const toppingQuantity = Number(rawQuantity);
        if (!(name in toppingPrices) || !Number.isInteger(toppingQuantity) || toppingQuantity < 1) {
          return res.status(400).json({ success: false, message: 'Thông tin món thêm không hợp lệ.' });
        }
        normalizedToppings[name] = toppingQuantity;
        toppingsTotal += toppingPrices[name] * toppingQuantity;
      }

      const lineTotal = (Number(product.price) + toppingsTotal) * quantity;
      total += lineTotal;
      orderItems.push({
        product: product._id,
        quantity,
        price: product.price,
        note: String(item.note || '').trim(),
        selectedToppings: normalizedToppings
      });
    }

    const customer = await Customer.findById(req.decoded.id);
    if (!customer) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng.' });
    }

    const order = await Order.create({
      tableNo,
      customer: customer._id,
      customerName: customer.name || customer.username || customer.phone || req.decoded.username,
      customerPhone: customer.phone || '',
      items: orderItems,
      total,
      status: 'PENDING'
    });

    await order.populate('items.product');
    return res.status(201).json(order);
  } catch (err) {
    console.error('Create customer order error:', err);
    return res.status(500).json({ success: false, message: 'Không thể gửi đơn hàng lúc này.' });
  }
});

router.get('/orders', JwtUtil.requireRole('admin', 'receptionist', 'kitchen'), async (req, res) => {
  const orders = await Order.find().sort({ cdate: -1 }).populate('items.product');
  res.json(orders);
});

router.put('/orders/status/:id', JwtUtil.requireRole('admin', 'receptionist', 'kitchen'), async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(order);
});

// 4. KHÁCH HÀNG (CUSTOMER)
router.get('/customers', JwtUtil.requireRole('admin'), async (req, res) => {
  const customers = await Customer.find();
  res.json(customers);
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
      let currentStatus = v.status;
      if (v.expiryDate && new Date(v.expiryDate) < now) {
        currentStatus = 'Expired';
      }
      return {
        ...v.toObject(),
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
    const { code, title, discount, discountType, minOrder, expiryDate, description, status } = req.body;
    let parsedDate = expiryDate;
    if (typeof expiryDate === 'string' && expiryDate.includes('/')) {
      const parts = expiryDate.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }

    const newVoucher = new Voucher({
      code, title, discount, discountType, minOrder,
      expiryDate: parsedDate, description, status: status || 'Active'
    });
    const saved = await newVoucher.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/vouchers/:id', JwtUtil.requireRole('admin'), async (req, res) => {
  try {
    const { code, title, discount, discountType, minOrder, expiryDate, description, status } = req.body;
    let parsedDate = expiryDate;
    if (typeof expiryDate === 'string' && expiryDate.includes('/')) {
      const parts = expiryDate.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }

    const updated = await Voucher.findByIdAndUpdate(
      req.params.id,
      { code, title, discount, discountType, minOrder, expiryDate: parsedDate, description, status },
      { new: true }
    );
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
    const { fromMonth, toMonth } = req.query;
    let startYear, startMonth, endYear, endMonth;
    const now = new Date();

    if (fromMonth && toMonth) {
      const [sY, sM] = fromMonth.split('-').map(Number);
      const [eY, eM] = toMonth.split('-').map(Number);
      startYear = sY; startMonth = sM;
      endYear = eY; endMonth = eM;
    } else {
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
      const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      startYear = startDate.getFullYear();
      startMonth = startDate.getMonth() + 1;
    }

    let targetMonths = [];
    let y = startYear, m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      targetMonths.push({
        key: `${monthStr}/${y}`,
        label: `Tháng ${m}/${y}`,
        revenue: 0
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }

    const startDateObj = new Date(startYear, startMonth - 1, 1);
    const endDateObj = new Date(endYear, endMonth, 1);

    const orderAgg = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ['APPROVED', 'COMPLETED'] },
          cdate: { $gte: startDateObj, $lt: endDateObj }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%m/%Y", date: "$cdate" } },
          revenue: { $sum: "$total" }
        }
      }
    ]);

    orderAgg.forEach(item => {
      const found = targetMonths.find(t => t.key === item._id);
      if (found) {
        found.revenue = item.revenue;
      }
    });

    const chartData = targetMonths.map(t => ({
      _id: t.label,
      revenue: t.revenue
    }));

    const revenueAgg = await Order.aggregate([
      { $match: { status: { $in: ['APPROVED', 'COMPLETED'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenue = revenueAgg[0]?.total || 0;
    const orders = await Order.countDocuments();
    const customers = await Customer.countDocuments();
    const products = await Product.countDocuments();
    const pendingOrders = await Order.find({ status: 'PENDING' }).sort({ cdate: -1 }).limit(5);

    const topItems = await Order.aggregate([
      { $match: { status: { $in: ['APPROVED', 'COMPLETED'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 4 }
    ]);
    const topProductsRaw = await Product.populate(topItems, { path: '_id' });
    const topProducts = topProductsRaw.map(item => ({
      _id: item._id?._id,
      name: item._id?.name || 'Món ăn',
      price: item._id?.price || 0,
      image: item._id?.image || '',
      totalSold: item.totalSold
    }));

    res.json({
      revenue, orders, customers, products,
      chartData, tableRequests: pendingOrders, topProducts
    });
  } catch (err) {
    console.error("Lỗi báo cáo:", err);
    res.status(500).json({ error: err.message });
  }
});
// 7. QUẢN LÝ BÀN VÀ LỄ TÂN (TABLES & RESERVATIONS)
router.get('/tables-status', JwtUtil.requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    // Khởi tạo mặc định 12 bàn trạng thái trống ('empty')
    let tables = [];
    for (let i = 1; i <= 12; i++) {
      let tableNum = i < 10 ? `0${i}` : `${i}`;
      tables.push({
        id: i,
        name: `Bàn ${tableNum}`,
        status: 'empty', // 'empty' (Trống - Xanh), 'occupied' (Có khách - Đỏ), 'reserved' (Đặt trước - Vàng)
        guests: 0,
        time: '',
        note: '4 ghế'
      });
    }

    // Lấy tất cả các đơn hàng chưa hoàn thành từ cơ sở dữ liệu để quét trạng thái bàn
    // Giả sử trong schema Order của bạn có lưu trường 'table' (ví dụ: "Bàn 01", "Bàn 02"...) và 'status'
    const activeOrders = await Order.find({ 
      status: { $in: ['PENDING', 'APPROVED'] } 
    }).populate('customer');

    // Ánh xạ đơn hàng thực tế vào danh sách 12 bàn
    activeOrders.forEach(order => {
      // Tìm xem tên bàn trong đơn hàng khớp với bàn nào (ví dụ: "Bàn 01" hoặc "01" hoặc số 1)
      const orderTableStr = String(order.table || '').trim();
      
      let matchedTable = tables.find(t => 
        orderTableStr.toLowerCase().includes(t.name.toLowerCase()) || 
        orderTableStr === String(t.id)
      );

      if (matchedTable) {
        if (order.status === 'APPROVED' || order.status === 'PENDING') {
          matchedTable.status = 'occupied'; // Có khách (Đỏ)
          matchedTable.guests = order.guests || (order.items ? order.items.length * 2 : 2);
          matchedTable.time = new Date(order.cdate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    });

    // Lấy danh sách lịch đặt bàn thật từ Database (Nếu hệ thống có collection lưu lịch đặt/TableRequest, bạn thay thế ở đây)
    // Dưới đây tận dụng các đơn hàng ở trạng thái PENDING hoặc thông tin khách đặt bàn nếu có
    const reservations = activeOrders
      .filter(o => o.status === 'PENDING')
      .map((ord, index) => ({
        id: ord._id,
        customerName: `${ord.customer?.name || ord.customer?.username || 'Khách hàng'} - ${ord.customer?.phone || 'Chưa có SĐT'}`,
        table: ord.table || 'Bàn 01',
        guests: ord.guests || 4,
        time: new Date(ord.cdate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

    res.json({
      success: true,
      tables: tables,
      reservations: reservations
    });
  } catch (err) {
    console.error("Lỗi lấy trạng thái bàn:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
