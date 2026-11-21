import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/CustomerComponent.css';
import ToastNotificationComponent from './ToastNotificationComponent';

class Customer extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      customers: [],
      page: 1,
      year: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
      pagination: { total: 0, pages: 1, years: [], summary: {} },
      filterTier: 'ALL',
      searchTerm: '',
      sortOption: 'NEWEST',
      statusOption: 'ALL',
      selectedCustomer: null,
      showDetailsModal: false,
      confirmDelete: false,
      toast: null
    };
  }

  componentDidMount() {
    this.apiGetCustomers();
  }

  componentWillUnmount() {
    clearTimeout(this.toastTimer);
    clearTimeout(this.filterTimer);
  }

  apiGetCustomers = () => {
    const { page, year, filterTier, searchTerm, sortOption, statusOption } = this.state;
    const requestId = (this.customerRequestId || 0) + 1;
    this.customerRequestId = requestId;
    const config = {
      headers: { 'x-access-token': this.context.token },
      params: { page, limit: 20, year, tier: filterTier, search: searchTerm, sort: sortOption, status: statusOption }
    };
    axios.get('/api/admin/customers', config).then((res) => {
      if (requestId !== this.customerRequestId) return;
      const totalPages = Number(res.data?.pages || 1);
      if (page > totalPages) {
        this.setState({ page: totalPages }, this.apiGetCustomers);
        return;
      }
      this.setState({
        customers: res.data?.customers || [],
        pagination: {
          total: Number(res.data?.total || 0),
          pages: totalPages,
          years: res.data?.years || [],
          summary: res.data?.summary || {}
        }
      });
    }).catch(err => {
      console.error('Customer list fetch failed:', err);
    });
  };

  updateFilters = (updates) => {
    this.setState(state => ({ ...updates, page: 1 }), () => {
      clearTimeout(this.filterTimer);
      this.filterTimer = setTimeout(this.apiGetCustomers, 250);
    });
  };

  goToPage = (page) => this.setState({ page }, this.apiGetCustomers);

  // Tính toán hạng thành viên dựa trên tổng chi tiêu
  getRankInfo = (totalSpent = 0) => {
    if (totalSpent >= 15000000) return { name: 'Kim Cương', class: 'badge-diamond', code: 'DIAMOND' };
    if (totalSpent >= 5000000) return { name: 'Hạng Vàng', class: 'badge-gold', code: 'GOLD' };
    if (totalSpent >= 2000000) return { name: 'Hạng Bạc', class: 'badge-silver', code: 'SILVER' };
    return { name: 'Hạng Đồng', class: 'badge-bronze', code: 'BRONZE' };
  };

  openDetailsModal = (customer) => {
    this.setState({
      selectedCustomer: customer,
      showDetailsModal: true,
      confirmDelete: false
    });
  };

  closeDetailsModal = () => {
    this.setState({
      selectedCustomer: null,
      showDetailsModal: false,
      confirmDelete: false
    });
  };

  showToast = (message, type = 'success') => {
    clearTimeout(this.toastTimer);
    this.setState({ toast: { message, type } });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 3500);
  };

  deleteCustomer = async () => {
    const { selectedCustomer } = this.state;
    if (!selectedCustomer?._id) return;
    try {
      await axios.delete(`/api/admin/customers/${selectedCustomer._id}`, {
        headers: { 'x-access-token': this.context.token }
      });
      this.setState(state => ({
        customers: state.customers.filter(customer => customer._id !== selectedCustomer._id),
        selectedCustomer: null,
        showDetailsModal: false,
        confirmDelete: false
      }));
      this.apiGetCustomers();
      this.showToast('Đã xóa tài khoản khách hàng.');
    } catch (error) {
      this.setState({ confirmDelete: false });
      this.showToast(error.response?.data?.message || 'Không thể xóa tài khoản khách hàng.', 'error');
    }
  };

  render() {
    const { customers, filterTier, searchTerm, sortOption, statusOption, selectedCustomer, showDetailsModal, confirmDelete, toast, page, year, pagination } = this.state;

    // Tính toán số liệu thống kê tổng quan
    const summary = pagination.summary || {};
    const tiers = summary.tiers || {};
    const totalCustomers = Number(summary.total || 0);
    const countDiamond = Number(tiers.DIAMOND || 0);
    const countGold = Number(tiers.GOLD || 0);
    const countSilver = Number(tiers.SILVER || 0);
    const countBronze = Number(tiers.BRONZE || 0);
    const totalPoints = Number(summary.totalPoints || 0);
    const vipCount = Number(summary.vip || 0);
    const filteredList = customers;

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
              {Number(summary.newThisMonth || 0)}
            </div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-title">Thành Viên VIP</div>
            <div className="customer-stat-value" style={{ color: '#F57F17' }}>{vipCount}</div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-title">Điểm Thưởng Tháng Này</div>
            <div className="customer-stat-value" style={{ color: '#2E7D32' }}>{totalPoints.toLocaleString()} P</div>
          </div>
        </div>

        {/* 2. Thanh lọc Hạng Thành Viên & Ô tìm kiếm */}
        <div className="customer-filter-card">
          <div className="customer-tabs">
            <button 
              className={`customer-tab-btn ${filterTier === 'ALL' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterTier: 'ALL' })}
            >
              Tất cả ({totalCustomers})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'DIAMOND' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterTier: 'DIAMOND' })}
            >
              Kim Cương ({countDiamond})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'GOLD' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterTier: 'GOLD' })}
            >
              Vàng ({countGold})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'SILVER' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterTier: 'SILVER' })}
            >
              Bạc ({countSilver})
            </button>
            <button 
              className={`customer-tab-btn ${filterTier === 'BRONZE' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterTier: 'BRONZE' })}
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
              onChange={(e) => this.updateFilters({ searchTerm: e.target.value })}
            />
            <select 
              className="customer-filter-select"
              value={sortOption}
              onChange={(e) => this.updateFilters({ sortOption: e.target.value })}
            >
              <option value="NEWEST">Sắp xếp: Mới nhất</option>
              <option value="SPENT_DESC">Chi tiêu: Cao đến thấp</option>
              <option value="SPENT_ASC">Chi tiêu: Thấp đến cao</option>
              <option value="POINTS_DESC">Điểm tháng này: Cao đến thấp</option>
              <option value="POINTS_ASC">Điểm tháng này: Thấp đến cao</option>
            </select>
            <select 
              className="customer-filter-select"
              value={statusOption}
              onChange={(e) => this.updateFilters({ statusOption: e.target.value })}
            >
              <option value="ALL">Trạng thái tài khoản</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
            <select className="customer-filter-select" value={year} onChange={(e) => this.updateFilters({ year: e.target.value })}>
              <option value="all">T&#7845;t c&#7843; n&#259;m</option>
              {pagination.years.map(value => <option key={value} value={String(value)}>{value}</option>)}
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
                  const displayName = item.name || item.username || item.phone || 'Khách hàng';
                  const firstLetter = displayName.charAt(0).toUpperCase();
                  const points = Number(item.points || 0);

                  return (
                    <tr key={item._id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-circle">{firstLetter}</div>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{displayName}</div>
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
                          onClick={() => this.openDetailsModal(item)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="list-pagination" aria-label="Customer pagination">
          <span>{pagination.total ? 'Hi\u1ec3n th\u1ecb ' + ((page - 1) * 20 + 1) + ' - ' + Math.min(page * 20, pagination.total) + ' / ' + pagination.total + ' kh\u00e1ch h\u00e0ng' : 'Kh\u00f4ng c\u00f3 kh\u00e1ch h\u00e0ng'} &#183; N&#259;m {year === 'all' ? 't\u1ea5t c\u1ea3' : year}</span>
          <div className="list-pagination-actions">
            <button type="button" disabled={page <= 1} onClick={() => this.goToPage(page - 1)}>Tr&#432;&#7899;c</button>
            <strong>Trang {page} / {pagination.pages}</strong>
            <button type="button" disabled={page >= pagination.pages} onClick={() => this.goToPage(page + 1)}>Sau</button>
          </div>
        </div>

        {showDetailsModal && selectedCustomer && (
          <div className="modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) this.closeDetailsModal();
          }}>
            <section className="customer-detail-modal" role="dialog" aria-modal="true" aria-labelledby="customer-detail-title">
              <header className="customer-detail-header">
                <div>
                  <span>HỒ SƠ KHÁCH HÀNG</span>
                  <h4 id="customer-detail-title">{selectedCustomer.name || selectedCustomer.username || selectedCustomer.phone || 'Khách hàng'}</h4>
                </div>
                <button type="button" onClick={this.closeDetailsModal} aria-label="Đóng">×</button>
              </header>
              <div className="customer-detail-grid">
                <div><span>Họ tên</span><b>{selectedCustomer.name || 'Chưa cập nhật'}</b></div>
                <div><span>Tên tài khoản</span><b>{selectedCustomer.username || 'Chưa cập nhật'}</b></div>
                <div><span>Số điện thoại</span><b>{selectedCustomer.phone || 'Chưa cập nhật'}</b></div>
                <div><span>Email</span><b>{selectedCustomer.email || 'Chưa cập nhật'}</b></div>
                <div><span>Trạng thái</span><b>{Number(selectedCustomer.active) === 0 ? 'Đã khóa' : 'Đang hoạt động'}</b></div>
                <div><span>Mã khách hàng</span><b>KH-{String(selectedCustomer._id || '').slice(-6).toUpperCase()}</b></div>
                <div><span>Hạng thành viên</span><b>{this.getRankInfo(selectedCustomer.totalSpent || 0).name}</b></div>
                <div><span>Tổng chi tiêu</span><b>{Number(selectedCustomer.totalSpent || 0).toLocaleString('vi-VN')} đ</b></div>
                <div><span>Điểm tích lũy tháng này</span><b>{Number(selectedCustomer.points || 0).toLocaleString('vi-VN')} P</b></div>
                <div><span>Ngày tạo tài khoản</span><b>{selectedCustomer.cdate ? new Date(selectedCustomer.cdate).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</b></div>
                <div><span>Đơn gần nhất</span><b>{selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleString('vi-VN') : 'Chưa có đơn'}</b></div>
              </div>
              {confirmDelete && (
                <div className="customer-delete-confirm" role="alert">
                  <b>Xóa tài khoản này?</b>
                  <span>Thông tin đăng nhập của khách hàng sẽ bị xóa khỏi danh sách.</span>
                  <div>
                    <button type="button" onClick={() => this.setState({ confirmDelete: false })}>Hủy</button>
                    <button type="button" className="confirm-delete-button" onClick={this.deleteCustomer}>Xóa tài khoản</button>
                  </div>
                </div>
              )}
              <footer className="customer-detail-actions">
                <button type="button" className="btn-delete-customer" onClick={() => this.setState({ confirmDelete: true })}>Xóa tài khoản</button>
                <button type="button" className="btn-close-customer-details" onClick={this.closeDetailsModal}>Đóng</button>
              </footer>
            </section>
          </div>
        )}
        <ToastNotificationComponent message={toast?.message} type={toast?.type} onDismiss={() => this.setState({ toast: null })} />

      </div>
    );
  }
}

export default Customer;
