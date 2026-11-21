import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/OrderComponent.css';
import ToastNotificationComponent from './ToastNotificationComponent';

const getVietnamDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
};
const formatDrinkOptions = (options) => {
  if (!options) return '';
  const iceLabels = { normal: 'Đá thường', less: 'Ít đá', none: 'Không đá' };
  return `${iceLabels[options.ice] || iceLabels.normal} · ${Number(options.sugar ?? 100)}% đường`;
};

class Order extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      page: 1,
      year: getVietnamDateKey(new Date()).slice(0, 4),
      pagination: { total: 0, pages: 1, years: [], summary: {} },
      filterStatus: 'ALL',
      searchTerm: '',
      orderTypeFilter: 'ALL',
      paymentMethodFilter: 'ALL',
      selectedOrder: null,
      toast: null
    };
  }

  componentDidMount() {
    this.apiGetOrders();
    this.refreshTimer = setInterval(this.apiGetOrders, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.refreshTimer);
    clearTimeout(this.toastTimer);
  }

  apiGetOrders = () => {
    const { page, year, filterStatus, searchTerm, orderTypeFilter, paymentMethodFilter } = this.state;
    const requestId = (this.orderRequestId || 0) + 1;
    this.orderRequestId = requestId;
    const config = {
      headers: { 'x-access-token': this.context.token },
      params: {
        page,
        limit: 20,
        year,
        status: filterStatus,
        search: searchTerm,
        type: orderTypeFilter,
        paymentMethod: paymentMethodFilter
      }
    };
    axios.get('/api/admin/orders', config).then((res) => {
      if (requestId !== this.orderRequestId) return;
      const totalPages = Number(res.data?.pages || 1);
      if (page > totalPages) {
        this.setState({ page: totalPages }, this.apiGetOrders);
        return;
      }
      this.setState({
        orders: res.data?.orders || [],
        pagination: {
          total: Number(res.data?.total || 0),
          pages: totalPages,
          years: res.data?.years || [],
          summary: res.data?.summary || {}
        }
      });
    }).catch(err => {
      console.error('Order list fetch failed:', err);
    });
  };

  updateFilters = (updates) => this.setState(state => ({ ...updates, page: 1 }), this.apiGetOrders);

  goToPage = (page) => this.setState({ page }, this.apiGetOrders);

  // Cập nhật trạng thái đơn hàng (Ví dụ: Chờ xác nhận -> Đang chế biến -> Hoàn thành)
  showToast = (message, type = 'success') => {
    clearTimeout(this.toastTimer);
    this.setState({ toast: { message, type } });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 3500);
  };

  updateOrderStatus = async (id, newStatus) => {
    const config = { headers: { 'x-access-token': this.context.token } };
    try {
      const response = await axios.put(`/api/admin/orders/status/${id}`, { status: newStatus }, config);
      if (response.data) {
        this.showToast('Đã cập nhật trạng thái đơn hàng.');
        this.apiGetOrders();
      }
    } catch (error) {
      this.showToast(error.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng.', 'error');
    }
  };

  openOrderDetails = (order) => this.setState({ selectedOrder: order });

  closeOrderDetails = () => this.setState({ selectedOrder: null });

  render() {
    const { orders, filterStatus, searchTerm, orderTypeFilter, paymentMethodFilter, selectedOrder, toast, page, year, pagination } = this.state;
    const selectedCustomerName = selectedOrder?.customerName || selectedOrder?.customer?.name || selectedOrder?.customer?.username || 'Khách tại bàn';
    const selectedCustomerPhone = selectedOrder?.customerPhone || selectedOrder?.customer?.phone || 'Chưa cập nhật';
    const statusLabels = {
      PENDING: 'Chờ xác nhận',
      COOKING: 'Đang chế biến',
      APPROVED: 'Đang chế biến',
      COMPLETED: 'Hoàn thành',
      CANCELED: 'Đã hủy',
      CANCELLED: 'Đã hủy'
    };

    // Thống kê số lượng theo trạng thái
    const summary = pagination.summary || {};
    const countPending = Number(summary.pending || 0);
    const countCooking = Number(summary.cooking || 0);
    const countCompleted = Number(summary.completed || 0);
    const countCompletedToday = Number(summary.completedToday || 0);
    const countCancelled = Number(summary.cancelled || 0);
    const filteredOrders = orders;

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
            <div className="order-stat-value" style={{ color: '#2E7D32' }}>{countCompletedToday} Đơn</div>
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
              onClick={() => this.updateFilters({ filterStatus: 'ALL' })}
            >
              Tất cả ({pagination.summary?.total || 0})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'PENDING' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterStatus: 'PENDING' })}
            >
              Chờ xác nhận ({countPending})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'COOKING' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterStatus: 'COOKING' })}
            >
              Đang chế biến ({countCooking})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterStatus: 'COMPLETED' })}
            >
              Đã hoàn thành ({countCompleted})
            </button>
            <button 
              className={`order-tab-btn ${filterStatus === 'CANCELLED' ? 'active' : ''}`}
              onClick={() => this.updateFilters({ filterStatus: 'CANCELLED' })}
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
              onChange={(e) => this.updateFilters({ searchTerm: e.target.value })}
            />
            <select className="order-filter-select" value={orderTypeFilter} onChange={(e) => this.updateFilters({ orderTypeFilter: e.target.value })}>
              <option value="ALL">Tất cả loại đơn</option>
              <option value="TABLE">Tại bàn</option>
              <option value="TAKEAWAY">Mang về</option>
            </select>
            <select className="order-filter-select" value={paymentMethodFilter} onChange={(e) => this.updateFilters({ paymentMethodFilter: e.target.value })}>
              <option value="ALL">Tất cả PTTT</option>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
            </select>
            <select className="order-filter-select" value={year} onChange={(e) => this.updateFilters({ year: e.target.value })}>
              <option value="all">T&#7845;t c&#7843; n&#259;m</option>
              {pagination.years.map(value => <option key={value} value={String(value)}>{value}</option>)}
            </select>
          </div>
        </div>

        {/* 3. Bảng danh sách đơn hàng */}
        <div className="order-table-card">
          <table className="order-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Bàn</th>
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
                    </td>
                    <td>
                      {item.items && item.items.map((prod, idx) => (
                        <div key={idx} style={{ fontSize: '13px' }}>
                          {prod.selectedToppings && Object.entries(prod.selectedToppings).map(([name, quantity]) => (
                            <div key={name} style={{ paddingLeft: '12px', color: '#666' }}>{name} x{quantity}</div>
                          ))}
                          {prod.drinkOptions && <div style={{ paddingLeft: '12px', color: '#666' }}>{formatDrinkOptions(prod.drinkOptions)}</div>}
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
                      <button className="btn-action-secondary" onClick={() => this.openOrderDetails(item)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="list-pagination" aria-label="Order pagination">
          <span>{pagination.total ? 'Hi\u1ec3n th\u1ecb ' + ((page - 1) * 20 + 1) + ' - ' + Math.min(page * 20, pagination.total) + ' / ' + pagination.total + ' \u0111\u01a1n' : 'Kh\u00f4ng c\u00f3 \u0111\u01a1n h\u00e0ng'} &#183; N&#259;m {year === 'all' ? 't\u1ea5t c\u1ea3' : year}</span>
          <div className="list-pagination-actions">
            <button type="button" disabled={page <= 1} onClick={() => this.goToPage(page - 1)}>Tr&#432;&#7899;c</button>
            <strong>Trang {page} / {pagination.pages}</strong>
            <button type="button" disabled={page >= pagination.pages} onClick={() => this.goToPage(page + 1)}>Sau</button>
          </div>
        </div>

        {selectedOrder && (
          <div className="order-detail-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) this.closeOrderDetails();
          }}>
            <section className="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
              <header className="order-detail-header">
                <div>
                  <span>CHI TIẾT ĐƠN HÀNG</span>
                  <h3 id="order-detail-title">#{String(selectedOrder._id).slice(-6).toUpperCase()}</h3>
                </div>
                <button type="button" onClick={this.closeOrderDetails} aria-label="Đóng">×</button>
              </header>
              <div className="order-detail-meta">
                <div><span>Khách hàng</span><b>{selectedCustomerName}</b></div>
                <div><span>Số điện thoại</span><b>{selectedCustomerPhone}</b></div>
                <div><span>Email</span><b>{selectedOrder.customer?.email || 'Chưa cập nhật'}</b></div>
                <div><span>Bàn</span><b>{selectedOrder.tableNo || 'Mang về'}</b></div>
                <div><span>Ngày đặt</span><b>{selectedOrder.cdate ? new Date(selectedOrder.cdate).toLocaleDateString('vi-VN') : '—'}</b></div>
                <div><span>Giờ đặt</span><b>{selectedOrder.cdate ? new Date(selectedOrder.cdate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</b></div>
                <div><span>Trạng thái</span><b>{statusLabels[selectedOrder.status] || '—'}</b></div>
                <div><span>Thanh toán</span><b>{selectedOrder.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</b></div>
                <div><span>Phương thức</span><b>{selectedOrder.paymentMethod === 'CASH' ? 'Tiền mặt' : selectedOrder.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : '—'}</b></div>
                <div><span>Thanh toán lúc</span><b>{selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString('vi-VN') : 'Chưa thanh toán'}</b></div>
              </div>
              <div className="order-detail-items">
                <h4>Món đã đặt</h4>
                {(selectedOrder.items || []).map((line, index) => (
                  <article className="order-detail-item" key={`${line.product?._id || line.product || index}-${index}`}>
                    <div className="order-detail-item-main">
                      <b>{line.product?.name || line.name || 'Món ăn'}</b>
                      <span>x{line.quantity || 1} · {((Number(line.price || 0) + Number(line.toppingTotal || 0)) * Number(line.quantity || 1)).toLocaleString('vi-VN')} đ</span>
                    </div>
                    {Object.entries(line.selectedToppings || {}).map(([name, quantity]) => (
                      <small key={name}>Thêm {name} × {quantity}</small>
                    ))}
                    {line.drinkOptions && <small>{formatDrinkOptions(line.drinkOptions)}</small>}
                    {line.note && <small>Ghi chú: {line.note}</small>}
                  </article>
                ))}
              </div>
              <div className="order-detail-total">
                <div><span>Tạm tính</span><span>{Number(selectedOrder.subtotal ?? selectedOrder.total ?? 0).toLocaleString('vi-VN')} đ</span></div>
                {Number(selectedOrder.discount || 0) > 0 && <div><span>Giảm giá {selectedOrder.voucherCode ? `(${selectedOrder.voucherCode})` : ''}</span><span>−{Number(selectedOrder.discount).toLocaleString('vi-VN')} đ</span></div>}
                <div className="order-detail-grand-total"><b>Tổng thanh toán</b><b>{Number(selectedOrder.total || 0).toLocaleString('vi-VN')} đ</b></div>
              </div>
            </section>
          </div>
        )}
        <ToastNotificationComponent
          message={toast?.message}
          type={toast?.type}
          onDismiss={() => this.setState({ toast: null })}
        />

      </div>
    );
  }
}

export default Order;
