const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Khởi tạo kết nối DB
require('./utils/MongooseUtil');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// APIs
app.use('/api/admin', require('./api/admin.js'));

// API Test
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from QR-Menu Server!' });
});

// Static builds cho Admin và Customer
const adminBuildPath = path.resolve(__dirname, '..', 'client-admin', 'build');
const customerBuildPath = path.resolve(__dirname, '..', 'client-customer', 'build');

app.use('/admin', express.static(adminBuildPath));
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

app.use(express.static(customerBuildPath));
app.get(/^(?!\/api|\/admin|\/hello).*/, (req, res) => {
  res.sendFile(path.join(customerBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});