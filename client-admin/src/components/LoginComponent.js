import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import MyContext from '../contexts/MyContext';
import { getCustomerAppUrl } from '../utils/customerAppUrl';
import '../css/LoginComponent.css';

const roleHome = {
  admin: '/admin/report',
  receptionist: '/admin/reception',
  kitchen: '/admin/kitchen'
};

function Login() {
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/admin/login', {
        username: username.trim(),
        password
      });
      const { token, role, username: accountName } = response.data || {};

      if (!token || (role !== 'customer' && !roleHome[role])) {
        setError(response.data?.message || 'Máy chủ trả về thông tin đăng nhập không hợp lệ.');
        return;
      }

      const signedInUsername = accountName || username.trim();
      context.signIn({ token, role, username: signedInUsername });

      if (role === 'customer') {
        window.location.assign(getCustomerAppUrl({ token, username: signedInUsername }));
        return;
      }

      navigate(roleHome[role], { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra máy chủ rồi thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Header thương hiệu nhà hàng */}
      <div className="login-header">
        <h2>Nhà hàng Văn Lang</h2>
        <p>Vietnamese Restaurant</p>
      </div>

      {/* Card chứa form đăng nhập */}
      <div className="login-card">
        <h3>Đăng nhập</h3>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              autoComplete="username"
              placeholder="Tên đăng nhập hoặc số điện thoại"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p role="alert" style={{ color: '#b42318', fontSize: '13px', marginBottom: '10px' }}>{error}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-submit">
            {isSubmitting ? 'ĐĂNG NHẬP…' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="switch-auth">
          Bạn chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </div>
      </div>

      {/* Footer */}
      <div className="login-footer">
        <div>Nhà hàng Văn Lang</div>
        <div>© 2026</div>
      </div>
    </div>
  );
}

export default Login;
