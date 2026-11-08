import React, { Component, useEffect } from 'react';
import MyContext from '../contexts/MyContext';
import Menu from './MenuComponent';
import Login from './LoginComponent';
import Reception from './ReceptionComponent';
import Kitchen from './KitchenComponent';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getCustomerAppUrl } from '../utils/customerAppUrl';
import Report from './ReportComponent';
import Category from './CategoryComponent';
import Product from './ProductComponent';
import Order from './OrderComponent';
import Customer from './CustomerComponent';
import Voucher from './VoucherComponent';
import Register from './RegisterComponent'; // Đã có import đầy đủ

function CustomerAppRedirect() {
  useEffect(() => {
    window.location.replace(getCustomerAppUrl());
  }, []);

  return null;
}

class Main extends Component {
  static contextType = MyContext;

  render() {
    const { token, role } = this.context;
    const recognizedRoles = ['admin', 'receptionist', 'kitchen', 'customer'];

    return (
      <div style={{ backgroundColor: '#F9F6F0', minHeight: '100vh', margin: 0, padding: 0 }}>
        <Routes>
          {/* Đưa route /register ra ngoài để ai cũng có thể vào xem form đăng ký */}
          <Route path="/register" element={<Register />} />

          {/* Nếu chưa đăng nhập hoặc sai role thì hiển thị trang Login */}
          {!token || !recognizedRoles.includes(role) ? (
            <Route path="*" element={<Login />} />
          ) : (
            /* Khi đã đăng nhập thành công thì hiển thị Menu và các trang quản trị tương ứng */
            <>
              <Route path="/*" element={
                <>
                  <Menu />
                  <div style={{ padding: '20px' }}>
                    <Routes>
                      {role === 'admin' && (
                        <>
                          <Route path="/admin" element={<Navigate to="/admin/report" replace />} />
                          <Route path="/admin/report" element={<Report />} />
                          <Route path="/admin/category" element={<Category />} />
                          <Route path="/admin/product" element={<Product />} />
                          <Route path="/admin/order" element={<Order />} />
                          <Route path="/admin/customer" element={<Customer />} />
                          <Route path="/admin/voucher" element={<Voucher />} />
                          <Route path="*" element={<Navigate to="/admin/report" replace />} />
                        </>
                      )}

                      {role === 'receptionist' && (
                        <>
                          <Route path="/admin/reception" element={<Reception />} />
                          <Route path="*" element={<Navigate to="/admin/reception" replace />} />
                        </>
                      )}

                      {role === 'kitchen' && (
                        <>
                          <Route path="/admin/kitchen" element={<Kitchen />} />
                          <Route path="*" element={<Navigate to="/admin/kitchen" replace />} />
                        </>
                      )}

                      {role === 'customer' && (
                        <Route path="*" element={<CustomerAppRedirect />} />
                      )}
                    </Routes>
                  </div>
                </>
              } />
            </>
          )}
        </Routes>
      </div>
    );
  }
}

export default Main;
