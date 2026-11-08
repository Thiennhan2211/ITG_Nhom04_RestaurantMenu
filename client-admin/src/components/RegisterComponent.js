import React, { Component } from 'react';
import axios from 'axios';
import '../css/RegisterComponent.css';

class RegisterComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      txtPhone: '',
      txtUsername: '',
      txtPassword: '',
      txtConfirmPassword: '',
      txtEmail: '',
      error: '',
      successMessage: ''
    };
  }

  btnRegisterClick = (e) => {
    e.preventDefault();
    const { txtPhone, txtUsername, txtPassword, txtConfirmPassword, txtEmail } = this.state;

    this.setState({ error: '', successMessage: '' });

    if (!txtPhone || !txtUsername || !txtPassword) {
      this.setState({ error: 'Vui lòng nhập đầy đủ Số điện thoại, Tên đăng nhập và Mật khẩu!' });
      return;
    }

    if (txtPassword !== txtConfirmPassword) {
      this.setState({ error: 'Mật khẩu nhập lại không khớp!' });
      return;
    }

    const newCustomer = {
      phone: txtPhone,
      username: txtUsername,
      password: txtPassword,
      email: txtEmail
    };

    axios.post('/api/admin/customer-register', newCustomer)
      .then((res) => {
        const result = res.data;
        if (result.success) {
          // Hiển thị thông báo thành công đẹp mắt thay vì dùng alert()
          this.setState({ 
            successMessage: 'Đăng ký tài khoản thành công! Đang chuyển hướng về trang đăng nhập...' 
          });
          
          // Tự động chuyển hướng sau 1.5 giây
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } else {
          this.setState({ error: result.message || 'Đăng ký thất bại!' });
        }
      })
      .catch((err) => {
        console.error("Lỗi đăng ký:", err);
        this.setState({ error: 'Có lỗi xảy ra khi kết nối đến máy chủ!' });
      });
  };

  render() {
    const { error, successMessage } = this.state;

    return (
      <div className="register-container">
        <div className="register-header">
          <h2>Nhà hàng Văn Lang</h2>
          <p>Vietnamese Restaurant</p>
        </div>

        <div className="register-card">
          <h3>Đăng ký</h3>

          {/* Hiển thị thông báo lỗi nếu có */}
          {error && <div className="alert-message error">{error}</div>}

          {/* Hiển thị thông báo thành công tinh tế */}
          {successMessage && <div className="alert-message success">{successMessage}</div>}

          <form onSubmit={this.btnRegisterClick}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Số điện thoại"
                value={this.state.txtPhone}
                onChange={(e) => this.setState({ txtPhone: e.target.value })}
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={this.state.txtUsername}
                onChange={(e) => this.setState({ txtUsername: e.target.value })}
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Mật khẩu"
                value={this.state.txtPassword}
                onChange={(e) => this.setState({ txtPassword: e.target.value })}
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={this.state.txtConfirmPassword}
                onChange={(e) => this.setState({ txtConfirmPassword: e.target.value })}
              />
            </div>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email (không bắt buộc)"
                value={this.state.txtEmail}
                onChange={(e) => this.setState({ txtEmail: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-submit">Đăng ký</button>
          </form>

          <div className="switch-auth">
            Đã có tài khoản? <a href="/login">Đăng nhập</a>
          </div>
        </div>

        <div className="register-footer">
          <div>Nhà hàng Văn Lang</div>
          <div>© 2026</div>
        </div>
      </div>
    );
  }
}

export default RegisterComponent;