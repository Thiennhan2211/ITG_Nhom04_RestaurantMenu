import React, { Component } from 'react';
import axios from 'axios';
import '../css/CustomerHomeComponent.css';
import ProductDetailComponent from './ProductDetailComponent';
import ServiceModalComponent from './ServiceModalComponent';
import CartModalComponent from './CartModalComponent';

const getTableNumberFromContext = () => {
  const normalize = (value) => {
    const number = Number(String(value || '').match(/\d+/)?.[0]);
    return Number.isInteger(number) && number >= 1 && number <= 12
      ? String(number).padStart(2, '0')
      : '';
  };
  const fromUrl = normalize(new URLSearchParams(window.location.search).get('table'));
  if (fromUrl) {
    try { window.sessionStorage.setItem('qrmenuTableNumber', fromUrl); } catch (error) { /* Storage may be unavailable in private browsing. */ }
    return fromUrl;
  }
  try {
    return normalize(window.sessionStorage.getItem('qrmenuTableNumber'));
  } catch (error) {
    return '';
  }
};

class CustomerHomeComponent extends Component {
  constructor(props) {
    super(props);
    const tableNumber = getTableNumberFromContext() || '01';
    this.state = {
      categories: [],
      products: [],
      selectedCategory: 'all',
      searchTerm: '',
      tableName: `Bàn ${String(tableNumber).padStart(2, '0')}`,
      accountName: localStorage.getItem('username') || 'Khách hàng',
      cart: [],
      isSubmittingOrder: false,
      cancellingOrderId: '',
      orderHistory: [],
      historyTab: 'current',
      historyLoading: false,
      availableVouchers: [],
      voucherCode: '',
      appliedVoucher: null,
      voucherError: '',
      isApplyingVoucher: false,
      selectedProductForDetail: null,
      showServiceModal: false,
      showCartModal: false,
      notification: null
    };
  }

  componentWillUnmount() {
    clearTimeout(this.notificationTimer);
  }

  componentDidMount() {
    if (!localStorage.getItem('token')) {
      const loginUrl = new URL(
        process.env.REACT_APP_ADMIN_LOGIN_URL || '/admin/login',
        window.location.origin
      );
      loginUrl.searchParams.set('table', getTableNumberFromContext() || '01');
      window.location.replace(loginUrl.toString());
      return;
    }
    this.fetchMenuData();
    this.fetchOrderHistory();
    this.fetchAvailableVouchers();
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      this.setState({ accountName: storedUsername });
    }
  }

  fetchMenuData = () => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'x-access-token': token, 'Authorization': token } : {};

    // Gọi API kèm header authorization nếu cần
    axios.get('/api/admin/categories', { headers })
      .then(res => {
        if (Array.isArray(res.data)) {
          this.setState({ categories: res.data });
        }
      })
      .catch(err => console.error("Lỗi tải danh mục:", err));

    axios.get('/api/admin/products', { headers })
      .then(res => {
        if (Array.isArray(res.data)) {
          this.setState({ products: res.data });
        }
      })
      .catch(err => console.error("Lỗi tải thực đơn:", err));
  }

  fetchOrderHistory = async () => {
    this.setState({ historyLoading: true });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/customer/orders', {
        headers: token ? { 'x-access-token': token } : {}
      });
      this.setState({ orderHistory: Array.isArray(response.data) ? response.data : [] });
    } catch (error) {
      console.error('Không thể tải lịch sử đơn hàng:', error);
    } finally {
      this.setState({ historyLoading: false });
    }
  }

  cancelCustomerOrder = async (orderId) => {
    if (!orderId || this.state.cancellingOrderId) return;
    this.setState({ cancellingOrderId: orderId });
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/customer/orders/${orderId}/cancel`, {}, {
        headers: token ? { 'x-access-token': token } : {}
      });
      await this.fetchOrderHistory();
      this.showNotification('Đơn hàng đã được huỷ.', 'success');
    } catch (error) {
      this.showNotification(error.response?.data?.message || 'Không thể huỷ đơn hàng lúc này.', 'error');
    } finally {
      this.setState({ cancellingOrderId: '' });
    }
  }

  fetchAvailableVouchers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/customer-vouchers', {
        headers: token ? { 'x-access-token': token } : {}
      });
      this.setState({ availableVouchers: Array.isArray(response.data) ? response.data : [] });
    } catch (error) {
      console.error('Không thể tải mã ưu đãi:', error);
    }
  }

  getCartSubtotal = (cart = this.state.cart) => cart.reduce(
    (sum, item) => sum + Number(item.totalPrice ?? Number(item.price || 0) * Number(item.quantity || 0)), 0
  )

  handleAddToCart = (itemWithDetails) => {
    const cart = [...this.state.cart, itemWithDetails];
    const appliedCode = this.state.appliedVoucher?.code;
    this.setState({ cart, selectedProductForDetail: null }, () => {
      if (appliedCode) this.handleApplyVoucher(appliedCode);
    });
  }

  handleVoucherCodeChange = (voucherCode) => {
    const appliedVoucher = this.state.appliedVoucher?.code?.toUpperCase() === voucherCode.trim().toUpperCase()
      ? this.state.appliedVoucher
      : null;
    this.setState({ voucherCode, appliedVoucher, voucherError: '' });
  }

  handleApplyVoucher = async (rawCode = this.state.voucherCode) => {
    const code = String(rawCode || '').trim();
    if (!code) {
      this.setState({ voucherError: 'Vui lòng nhập hoặc chọn mã ưu đãi.' });
      return;
    }
    const subtotal = this.getCartSubtotal();
    if (subtotal <= 0) {
      this.setState({ voucherError: 'Thêm món vào giỏ trước khi áp dụng mã.' });
      return;
    }
    this.setState({ isApplyingVoucher: true, voucherError: '' });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/customer-vouchers/validate', { code, subtotal }, {
        headers: token ? { 'x-access-token': token } : {}
      });
      this.setState({ voucherCode: response.data.code, appliedVoucher: response.data, voucherError: '' });
    } catch (error) {
      this.setState({
        appliedVoucher: null,
        voucherError: error.response?.data?.message || 'Không thể áp dụng mã ưu đãi.'
      });
    } finally {
      this.setState({ isApplyingVoucher: false });
    }
  }

  handleClearVoucher = () => this.setState({ voucherCode: '', appliedVoucher: null, voucherError: '' });

  handleHistoryTabChange = (historyTab) => this.setState({ historyTab });

  showNotification = (message, type = 'success') => {
    clearTimeout(this.notificationTimer);
    this.setState({ notification: { message, type } });
    this.notificationTimer = setTimeout(() => this.setState({ notification: null }), 4000);
  }

  getEffectiveVoucher = () => {
    const { appliedVoucher } = this.state;
    if (!appliedVoucher) return null;
    const subtotal = this.getCartSubtotal();
    const rawDiscount = appliedVoucher.discountType === 'percent'
      ? subtotal * Number(appliedVoucher.discount || 0) / 100
      : Number(appliedVoucher.discount || appliedVoucher.discountAmount || 0);
    return { ...appliedVoucher, discountAmount: Math.min(subtotal, Math.max(0, Math.round(rawDiscount))) };
  }

  handleSubmitOrder = async () => {
    const { cart, tableName } = this.state;
    if (cart.length === 0) {
      this.showNotification('Hãy chọn ít nhất một món trước khi gửi bếp.', 'warning');
      return;
    }
    if (this.state.isSubmittingOrder) return;
    this.setState({ isSubmittingOrder: true });
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/orders', {
        tableNo: tableName,
        voucherCode: this.state.appliedVoucher?.code || '',
        items: cart.map(item => ({
          product: item._id,
          quantity: item.quantity,
          note: item.note,
          selectedToppings: item.selectedToppings,
          drinkOptions: item.drinkOptions
        }))
      }, {
        headers: token ? { 'x-access-token': token } : {}
      });
    } catch (error) {
      this.showNotification(error.response?.data?.message || 'Không thể gửi đơn hàng. Vui lòng thử lại.', 'error');
      this.setState({ isSubmittingOrder: false });
      return;
    }
    this.setState({
      showCartModal: false,
      cart: [],
      voucherCode: '',
      appliedVoucher: null,
      voucherError: '',
      isSubmittingOrder: false
    });
    this.fetchOrderHistory();
    this.fetchAvailableVouchers();
    this.showNotification(`Đã gửi ${cart.length} món của ${tableName} tới bếp.`, 'success');
  }

  handleSendServiceRequest = async (serviceContent) => {
    try {
      await axios.post('/api/admin/service-requests', {
        tableNo: this.state.tableName,
        content: serviceContent
      });
      this.setState({ showServiceModal: false });
      this.showNotification(`Yêu cầu “${serviceContent}” đã được gửi đến nhân viên phục vụ.`, 'success');
    } catch (error) {
      this.showNotification(error.response?.data?.message || 'Không thể gửi yêu cầu phục vụ. Vui lòng thử lại.', 'error');
    }
  }

  handleLogout = () => {
    const tableNumber = getTableNumberFromContext() || String(this.state.tableName.match(/\d+/)?.[0] || '01');
    try { window.sessionStorage.setItem('qrmenuTableNumber', tableNumber); } catch (error) { /* Storage may be unavailable in private browsing. */ }
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');

    const loginUrl = new URL(
      process.env.REACT_APP_ADMIN_LOGIN_URL || '/admin/login',
      window.location.origin
    );
    loginUrl.searchParams.set('loggedOut', '1');
    loginUrl.searchParams.set('table', tableNumber);
    window.location.assign(loginUrl.toString());
  }

  render() {
    const { 
      categories, 
      products, 
      selectedCategory, 
      searchTerm, 
      tableName, 
      accountName, 
      cart, 
      orderHistory,
      historyTab,
      historyLoading,
      availableVouchers,
      voucherCode,
      appliedVoucher,
      voucherError,
      isApplyingVoucher,
      selectedProductForDetail, 
      showServiceModal, 
      showCartModal,
      notification
    } = this.state;

    const filteredProducts = products.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category?._id === selectedCategory || item.category === selectedCategory;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch && (!item.status || item.status === 'Active');
    });

    const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
      <div className="customer-home-container">
        {/* HEADER MENU */}
        <div className="customer-header">
          <div className="header-content-wrapper">
            <div className="header-top-row">
              <div className="header-title">Menu đồ ăn - {tableName}</div>
              <div className="user-greeting-area">
                <span className="greeting-text">Chào: <b>{accountName}</b></span>
                <button className="btn-logout-inline" onClick={this.handleLogout}>
                  Đăng xuất
                </button>
              </div>
            </div>

            <div className="header-actions">
              <div className="search-box">
                <span>🔍</span>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm món ăn..." 
                  value={searchTerm}
                  onChange={(e) => this.setState({ searchTerm: e.target.value })}
                />
              </div>
              <button className="action-btn" onClick={() => this.setState({ showServiceModal: true })}>
                Gọi phục vụ
              </button>
              <button className="action-btn" onClick={() => this.setState({ showCartModal: true })}>
                Món đã gọi ({totalCartCount})
              </button>
            </div>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (FLEXIBLE WRAPPER) */}
        <div className="customer-body">
          <div className="category-filter">
            <button 
              className={`cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => this.setState({ selectedCategory: 'all' })}
            >
              Tất cả
            </button>
            {categories.map(cat => (
              <button 
                key={cat._id}
                className={`cat-pill ${selectedCategory === cat._id ? 'active' : ''}`}
                onClick={() => this.setState({ selectedCategory: cat._id })}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="section-info">
            <span>Danh sách món ({filteredProducts.length})</span>
          </div>

          {/* GRID TỰ ĐỘNG CHUYỂN CỘT TRÊN MÁY TÍNH & 1 CỘT TRÊN DI ĐỘNG */}
          <div className="product-grid">
            {filteredProducts.length > 0 ? filteredProducts.map(prod => (
              <div 
                key={prod._id} 
                className="product-card"
                onClick={() => this.setState({ selectedProductForDetail: prod })}
              >
                <div className="product-info-left">
                  <img 
                    src={prod.image || 'https://via.placeholder.com/150'} 
                    alt={prod.name} 
                    className="product-img" 
                  />
                  <div className="product-details">
                    <h4>{prod.name}</h4>
                    <p className="product-price">
                      {Number(prod.price || 0).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>
                <button 
                  className="btn-add-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.setState({ selectedProductForDetail: prod });
                  }}
                >
                  +
                </button>
              </div>
            )) : (
              <div className="empty-products-msg">
                Không tìm thấy món ăn phù hợp.
              </div>
            )}
          </div>
        </div>

        {/* POPUP MODALS */}
        {selectedProductForDetail && (
          <ProductDetailComponent 
            product={selectedProductForDetail}
            onClose={() => this.setState({ selectedProductForDetail: null })}
            onAddToCart={this.handleAddToCart}
          />
        )}

        {showServiceModal && (
          <ServiceModalComponent 
            onClose={() => this.setState({ showServiceModal: false })}
            onSubmitService={this.handleSendServiceRequest}
          />
        )}

        {showCartModal && (
          <CartModalComponent 
            cart={cart}
            orders={orderHistory}
            activeTab={historyTab}
            historyLoading={historyLoading}
            availableVouchers={availableVouchers}
            voucherCode={voucherCode}
            appliedVoucher={this.getEffectiveVoucher()}
            voucherError={voucherError}
            isApplyingVoucher={isApplyingVoucher}
            isSubmittingOrder={this.state.isSubmittingOrder}
            cancellingOrderId={this.state.cancellingOrderId}
            onHistoryTabChange={this.handleHistoryTabChange}
            onVoucherCodeChange={this.handleVoucherCodeChange}
            onApplyVoucher={this.handleApplyVoucher}
            onSelectVoucher={(code) => this.handleApplyVoucher(code)}
            onClearVoucher={this.handleClearVoucher}
            onClose={() => this.setState({ showCartModal: false })}
            onSubmitOrder={this.handleSubmitOrder}
            onCancelOrder={this.cancelCustomerOrder}
          />
        )}

        {notification && (
          <div className={`customer-notification customer-notification-${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
            <span className="customer-notification-icon" aria-hidden="true">{notification.type === 'error' ? '!' : notification.type === 'warning' ? 'i' : '✓'}</span>
            <span>{notification.message}</span>
            <button type="button" onClick={() => this.setState({ notification: null })} aria-label="Đóng thông báo">×</button>
          </div>
        )}
      </div>
    );
  }
}

export default CustomerHomeComponent;
