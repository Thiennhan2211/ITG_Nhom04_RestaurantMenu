const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});