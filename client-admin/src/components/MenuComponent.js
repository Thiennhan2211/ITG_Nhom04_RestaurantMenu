import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import MyContext from '../contexts/MyContext';
import '../css/MenuComponent.css';

const roleLabels = {
  admin: 'Quản trị viên',
  receptionist: 'Lễ tân',
  kitchen: 'Bếp',
  customer: 'Khách hàng'
};

const adminLinks = [
  ['/admin/report', 'Báo cáo'],
  ['/admin/category', 'Danh mục'],
  ['/admin/product', 'Thực đơn'],
  ['/admin/order', 'Đơn hàng'],
  ['/admin/customer', 'Khách hàng'],
  ['/admin/voucher', 'Mã giảm giá']
];

class Menu extends Component {
  static contextType = MyContext;

  render() {
    const { role, username, signOut } = this.context;

    return (
      <header className="admin-navbar">
        <div className="admin-navbar-brand">Nhà hàng Văn Lang</div>

        {role === 'admin' && (
          <nav className="admin-navbar-links" aria-label="Điều hướng quản trị">
            {adminLinks.map(([path, label]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="admin-navbar-user">
          <span>{roleLabels[role] || 'Tài khoản'}: <b>{username || 'Người dùng'}</b></span>
          <button className="btn-logout" onClick={signOut} type="button">
            Đăng xuất
          </button>
        </div>
      </header>
    );
  }
}

export default Menu;
