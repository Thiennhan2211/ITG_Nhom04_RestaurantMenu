import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/OrderComponent.css';

class Order extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      filterStatus: 'ALL',
      searchTerm: ''
    };
  }

  componentDidMount() {
    this.apiGetOrders();
    this.refreshTimer = setInterval(this.apiGetOrders, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.refreshTimer);
  }

  apiGetOrders = () => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.get('/api/admin/orders', config).then((res) => {
      this.setState({ orders: res.data || [] });
    }).catch(err => {
      console.error("Lỗi tải đơn hàng:", err);
    });
  };

  // Cập nhật trạng thái đơn hàng (Ví dụ: Chờ xác nhận -> Đang chế biến -> Hoàn thành)
  updateOrderStatus = (id, newStatus) => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.put(`/api/admin/orders/status/${id}`, { status: newStatus }, config).then((res) => {
      if (res.data) {
        alert('Cập nhật trạng thái đơn hàng thành công!');
        this.apiGetOrders();
      }
    });
  };

  render() {
    const { orders, filterStatus, searchTerm } = this.state;

    // Thống kê số lượng theo trạng thái
    const countPending = orders.filter(o => o.status === 'PENDING').length;
    const countCooking = orders.filter(o => o.status === 'COOKING' || o.status === 'APPROVED').length;
    const countCompleted = orders.filter(o => o.status === 'COMPLETED').length;
    const countCancelled = orders.filter(o => o.status === 'CANCELLED').length;

    // Lọc đơn hàng theo Tab và Từ khóa tìm kiếm
    const filteredOrders = orders.filter(item => {
      const matchStatus = 
        filterStatus === 'ALL' ? true :
        filterStatus === 'PENDING' ? item.status === 'PENDING' :
        filterStatus === 'COOKING' ? (item.status === 'COOKING' || item.status === 'APPROVED') :
        filterStatus === 'COMPLETED' ? item.status === 'COMPLETED' :
        filterStatus === 'CANCELLED' ? item.status === 'CANCELLED' : true;

      const matchSearch = 
        (item._id && item._id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tableNo && item.tableNo.toString().includes(searchTerm));

      return matchStatus && matchSearch;
    });

    return (
      <div className="order-container">
        <h3 className="order-title">QUẢN LÝ ĐƠN HÀNG</h3>

        {/* 1. Thẻ thống kê tổng quan */}
        <div className="order-stats-grid">
          <div className="order-stat-card">
            <div className="order-stat-title">Chờ xác nhận</div>
            <div className="order-stat-value" style={{ color: '#F57F17' }}>{countPending} Đơn</div>
          </div>
          <div className="order-stat-card">
            <div className="order-stat-title">Đang chế biến</div>
            <div className="order-stat-value" style={{ color: '#1976D2' }}>{countCooking} Đơn</div>
          </div>
          <div className="order-stat-card">
            <div className="order-stat-title">Hoàn thành hôm nay</div>
            <div className="order-stat-value" style={{ color: '#2E7D32' }}>{countCompleted} Đơn</div>
          </div>
          <div className="order-stat-card">
            <div className="order-stat-title">Đơn đã hủy</div>
            <div className="order-stat-value" style={{ color: '#C62828' }}>{countCancelled} Đơn</div>
          </div>
        </div>

        {/* 2. Thanh lọc trạng thái & Tìm kiếm */}
        <div className="order-filter-card">
          <div className="order-tabs">
            <button 
              className={`order-tab-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
              onClick={() => this.setState({ filterStatus: 'ALL' })}
            >
              Tất cả ({orders.length})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'PENDING' ? 'active' : ''}`}
              onClick={() => this.setState({ filterStatus: 'PENDING' })}
            >
              Chờ xác nhận ({countPending})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'COOKING' ? 'active' : ''}`}
              onClick={() => this.setState({ filterStatus: 'COOKING' })}
            >
              Đang chế biến ({countCooking})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => this.setState({ filterStatus: 'COMPLETED' })}
            >
              Đã hoàn thành ({countCompleted})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'CANCELLED' ? 'active' : ''}`}
              onClick={() => this.setState({ filterStatus: 'CANCELLED' })}
            >
              Đã hủy ({countCancelled})
            </button>
          </div>

          <div className="order-search-row">
            <input
              type="text"
              className="order-search-input"
              placeholder="Tìm kiếm mã đơn (#HD-...), tên khách hàng, số bàn..."
              value={searchTerm}
              onChange={(e) => this.setState({ searchTerm: e.target.value })}
            />
            <select className="order-filter-select">
              <option>Tất cả loại đơn</option>
              <option>Tại bàn</option>
              <option>Mang về</option>
            </select>
            <select className="order-filter-select">
              <option>Tất cả PTTT</option>
              <option>Tiền mặt</option>
              <option>Chuyển khoản</option>
            </select>
          </div>
        </div>

        {/* 3. Bảng danh sách đơn hàng */}
        <div className="order-table-card">
          <table className="order-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng / Bàn</th>
                <th>Món Ăn Đặt</th>
                <th>Tổng Tiền</th>
                <th>Thời Gian</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '30px' }}>
                    Không có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 'bold' }}>#{item._id.slice(-6).toUpperCase()}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>Bàn: {item.tableNo || 'Mang về'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{item.customerName || 'Khách lẻ'}</div>
                      {item.customerPhone && <div style={{ fontSize: '12px', color: '#666' }}>{item.customerPhone}</div>}
                    </td>
                    <td>
                      {item.items && item.items.map((prod, idx) => (
                        <div key={idx} style={{ fontSize: '13px' }}>
                          {prod.selectedToppings && Object.entries(prod.selectedToppings).map(([name, quantity]) => (
                            <div key={name} style={{ paddingLeft: '12px', color: '#666' }}>{name} x{quantity}</div>
                          ))}
                          {prod.note && <div style={{ paddingLeft: '12px', color: '#666' }}>Ghi chú: {prod.note}</div>}
                          • {prod.quantity}x {prod.product?.name || 'Món ăn'}
                        </div>
                      ))}
                    </td>
                    <td style={{ color: '#8C4A3E', fontWeight: 'bold' }}>
                      {(item.total || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ fontSize: '13px', color: '#666' }}>
                      {new Date(item.cdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <div style={{ fontSize: '11px' }}>{new Date(item.cdate).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td>
                      <span className={
                        item.status === 'PENDING' ? 'badge-pending' :
                        item.status === 'COOKING' || item.status === 'APPROVED' ? 'badge-cooking' :
                        item.status === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'
                      }>
                        {item.status === 'PENDING' ? 'Chờ xác nhận' :
                         item.status === 'COOKING' || item.status === 'APPROVED' ? 'Đang chế biến' :
                         item.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
                      </span>
                    </td>
                    <td>
                      {item.status === 'PENDING' && (
                        <button 
                          className="btn-action-primary" 
                          onClick={() => this.updateOrderStatus(item._id, 'COOKING')}
                        >
                          Nhận đơn
                        </button>
                      )}
                      {(item.status === 'COOKING' || item.status === 'APPROVED') && (
                        <button 
                          className="btn-action-primary" 
                          onClick={() => this.updateOrderStatus(item._id, 'COMPLETED')}
                        >
                          Trả món
                        </button>
                      )}
                      <button className="btn-action-secondary">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    );
  }
}

export default Order;
