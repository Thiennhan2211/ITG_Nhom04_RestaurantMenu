const jwt = require('jsonwebtoken');
const MyConstants = require('./MyConstants');

const JwtUtil = {
  genToken(user, role) {
    const token = jwt.sign(
      {
        id: user._id ? user._id.toString() : user.id,
        username: user.username || user.phone || '',
        role
      },
      MyConstants.JWT_SECRET,
      { expiresIn: MyConstants.JWT_EXPIRES }
    );
    return token;
  },

  checkToken(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const token = req.headers['x-access-token'] || bearerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập lại.' });
    }

    jwt.verify(token, MyConstants.JWT_SECRET, (err, decoded) => {
      if (err || !decoded || !decoded.role) {
        return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
      }

      req.decoded = decoded;
      return next();
    });
  },

  requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.decoded || !allowedRoles.includes(req.decoded.role)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
      }
      return next();
    };
  }
};

module.exports = JwtUtil;
