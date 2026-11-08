import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/CustomerComponent.css';

class Customer extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      customers: [],
      filterTier: 'ALL',
      searchTerm: '',
      sortOption: 'NEWEST',
      statusOption: 'ALL',
      selectedCustomer: null,
      showHistoryModal: false
    };
  }

  componentDidMount() {
    this.apiGetCustomers();
  }

  apiGetCustomers = () => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.get('/api/admin/customers', config).then((res) => {
      this.setState({ customers: res.data || [] });
    }).catch(err => {
      console.error("Lỗi tải danh sách khách hàng:", err);
    });
  };

  // Tính toán hạng thành viên dựa trên tổng chi tiêu
  getRankInfo = (totalSpent = 0) => {
    if (totalSpent >= 15000000) return { name: 'Kim Cương', class: 'badge-diamond', code: 'DIAMOND' };
    if (totalSpent >= 5000000) return { name: 'Hạng Vàng', class: 'badge-gold', code: 'GOLD' };
    if (totalSpent >= 2000000) return { name: 'Hạng Bạc', class: 'badge-silver', code: 'SILVER' };
    return { name: 'Hạng Đồng', class: 'badge-bronze', code: 'BRONZE' };
  };

  openHistoryModal = (customer) => {
    this.setState({
      selectedCustomer: customer,
      showHistoryModal: true
    });
  };

  closeHistoryModal = () => {
    this.setState({
      selectedCustomer: null,
      showHistoryModal: false
    });
  };

  render() {
    const { customers, filterTier, searchTerm, sortOption, statusOption, selectedCustomer, showHistoryModal } = this.state;

    // Tính toán số liệu thống kê tổng quan
    const totalCustomers = customers.length;
    
    // Đếm theo hạng
    const countDiamond = customers.filter(c => this.getRankInfo(c.totalSpent || 0).code === 'DIAMOND').length;
    const countGold = customers.filter(c => this.getRankInfo(c.totalSpent || 0).code === 'GOLD').length;
    const countSilver = customers.filter(c => this.getRankInfo(c.totalSpent || 0).code === 'SILVER').length;
    const countBronze = customers.filter(c => this.getRankInfo(c.totalSpent || 0).code === 'BRONZE').length;

    const totalPoints = customers.reduce((acc, c) => acc + (c.points || Math.floor((c.totalSpent || 0) / 10000)), 0);
    const vipCount = countDiamond + countGold;

    // Lọc và Sắp xếp danh sách
    let filteredList = customers.filter(item => {
      const rank = this.getRankInfo(item.totalSpent || 0);
      const matchTier = 
        filterTier === 'ALL' ? true :
        filterTier === rank.code;

      const matchSearch = 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.phone && item.phone.includes(searchTerm)) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = 
        statusOption === 'ALL' ? true :
        statusOption === 'ACTIVE' ? item.active !== false :
        statusOption === 'LOCKED' ? item.active === false : true;

      return matchTier && matchSearch && matchStatus;
    });

    if (sortOption === 'SPENT_DESC') {
      filteredList.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    } else if (sortOption === 'POINTS_DESC') {
      filteredList.sort((a, b) => (b.points || 0) - (a.points || 0));
    }

    return (
      <div className="customer-container">
        <h3 className="customer-title">QUẢN LÝ KHÁCH HÀNG & THÀNH VIÊN</h3>

        {/* 1. Thẻ thống kê tổng quan */}
        <div className="customer-stats-grid">
          <div className="customer-stat-card">
            <div className="customer-stat-title">Tổng Khách Hàng</div>
            <div className="customer-stat-value">{totalCustomers.toLocaleString()}</div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-title">Khách Hàng Mới (Tháng)</div>
            <div className="customer-stat-value" style={{ color: '#1976D2' }}>
              {customers.filter(c => c.cdate && new Date(c.cdate).getMonth() === new Date().getMonth()).length}
            </div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-title">Thành Viên VIP</div>
            <div className="customer-stat-value" style={{ color: '#F57F17' }}>{vipCount}</div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-title">Điểm Thưởng Đã Tích</div>
            <div className="customer-stat-value" style={{ color: '#2E7D32' }}>{totalPoints.toLocaleString()} P</div>
          </div>
        </div>

        {/* 2. Thanh lọc Hạng Thành Viên & Ô tìm kiếm */}
        <div className="customer-filter-card">
          <div className="customer-tabs">
            <button 
              className={`customer-tab-btn ${filterTier === 'ALL' ? 'active' : ''}`}
              onClick={() => this.setState({ filterTier: 'ALL' })}
            >
              Tất cả ({totalCustomers})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'DIAMOND' ? 'active' : ''}`}
              onClick={() => this.setState({ filterTier: 'DIAMOND' })}
            >
              Kim Cương ({countDiamond})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'GOLD' ? 'active' : ''}`}
              onClick={() => this.setState({ filterTier: 'GOLD' })}
            >
              Vàng ({countGold})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'SILVER' ? 'active' : ''}`}
              onClick={() => this.setState({ filterTier: 'SILVER' })}
            >
              Bạc ({countSilver})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'BRONZE' ? 'active' : ''}`}
              onClick={() => this.setState({ filterTier: 'BRONZE' })}
            >
              Đồng ({countBronze})
            </button>
          </div>

          <div className="customer-search-row">
            <input
              type="text"
              className="customer-search-input"
              placeholder=" Tìm kiếm theo tên, số điện thoại hoặc email..."
              value={searchTerm}
              onChange={(e) => this.setState({ searchTerm: e.target.value })}
            />
            <select 
              className="customer-filter-select"
              value={sortOption}
              onChange={(e) => this.setState({ sortOption: e.target.value })}
            >
              <option value="NEWEST">Sắp xếp: Mới nhất</option>
              <option value="SPENT_DESC">Chi tiêu: Cao đến thấp</option>
              <option value="POINTS_DESC">Điểm thưởng: Cao đến thấp</option>
            </select>
            <select 
              className="customer-filter-select"
              value={statusOption}
              onChange={(e) => this.setState({ statusOption: e.target.value })}
            >
              <option value="ALL">Trạng thái tài khoản</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* 3. Bảng danh sách khách hàng */}
        <div className="customer-table-card">
          <table className="customer-table">
            <thead>
              <tr>
                <th>Khách Hàng</th>
                <th>Liên Hệ</th>
                <th>Hạng Thành Viên</th>
                <th>Tổng Chi Tiêu</th>
                <th>Điểm Tích Lũy</th>
                <th>Đơn Gần Nhất</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '30px' }}>
                    Không tìm thấy dữ liệu khách hàng.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const rank = this.getRankInfo(item.totalSpent || 0);
                  const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : 'K';
                  const points = item.points || Math.floor((item.totalSpent || 0) / 10000);

                  return (
                    <tr key={item._id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-circle">{firstLetter}</div>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{item.name || 'Khách vãng lai'}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              KH-{item._id ? item._id.slice(-5).toUpperCase() : '0001'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{item.phone || 'Chưa cập nhật SĐT'}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{item.email || 'Chưa có email'}</div>
                      </td>
                      <td>
                        <span className={rank.class}>{rank.name}</span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#4A2E2B' }}>
                        {(item.totalSpent || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#8C4A3E' }}>
                        {points.toLocaleString()} P
                      </td>
                      <td style={{ fontSize: '13px', color: '#666' }}>
                        {item.lastOrderDate ? new Date(item.lastOrderDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </td>
                      <td>
                        <button 
                          className="btn-history"
                          onClick={() => this.openHistoryModal(item)}
                        >
                          Lịch sử
                        </button>
                        <button className="btn-edit-cust">
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal xem Lịch sử giao dịch/đơn hàng */}
        {showHistoryModal && selectedCustomer && (
          <div className="modal-backdrop">
            <div className="modal-card-large">
              <h4 style={{ color: '#4A2E2B', marginBottom: '15px' }}>
                Lịch sử giao dịch: {selectedCustomer.name}
              </h4>
              <p style={{ fontSize: '13px', color: '#666' }}>
                SĐT: {selectedCustomer.phone || 'N/A'} | Email: {selectedCustomer.email || 'N/A'}
              </p>
              <div style={{ margin: '20px 0', fontSize: '14px' }}>
                <div><b>Tổng chi tiêu:</b> {(selectedCustomer.totalSpent || 0).toLocaleString('vi-VN')} đ</div>
                <div><b>Điểm tích lũy:</b> {(selectedCustomer.points || 0).toLocaleString()} P</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button 
                  className="btn-history" 
                  onClick={this.closeHistoryModal}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }
}

export default Customer;