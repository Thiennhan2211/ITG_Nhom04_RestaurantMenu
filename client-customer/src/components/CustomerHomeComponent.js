import React, { Component } from 'react';
import axios from 'axios';
import '../css/CustomerHomeComponent.css';
import ProductDetailComponent from './ProductDetailComponent';
import ServiceModalComponent from './ServiceModalComponent';
import CartModalComponent from './CartModalComponent';

class CustomerHomeComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      categories: [],
      products: [],
      selectedCategory: 'all',
      searchTerm: '',
      tableName: 'Bàn 01',
      accountName: 'Khách hàng',
      cart: [],
      isSubmittingOrder: false,
      selectedProductForDetail: null,
      showServiceModal: false,
      showCartModal: false
    };
  }

  componentDidMount() {
    this.fetchMenuData();
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

  handleAddToCart = (itemWithDetails) => {
    const { cart } = this.state;
    cart.push(itemWithDetails);
    this.setState({ cart, selectedProductForDetail: null });
  }

  handleSubmitOrder = async () => {
    const { cart, tableName } = this.state;
    if (cart.length === 0) {
      alert('Chưa có món nào trong danh sách!');
      return;
    }
    if (this.state.isSubmittingOrder) return;
    this.setState({ isSubmittingOrder: true });
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/orders', {
        tableNo: tableName,
        items: cart.map(item => ({
          product: item._id,
          quantity: item.quantity,
          note: item.note,
          selectedToppings: item.selectedToppings
        }))
      }, {
        headers: token ? { 'x-access-token': token } : {}
      });
    } catch (error) {
      alert(error.response?.data?.message || 'Khong the gui don hang. Vui long thu lai.');
      this.setState({ isSubmittingOrder: false });
      return;
    }
    this.setState({ showCartModal: false, cart: [], isSubmittingOrder: false });
    alert(`Đã gửi thành công ${cart.length} món của ${tableName} tới nhà bếp!`);
  }

  handleSendServiceRequest = (serviceContent) => {
    this.setState({ showServiceModal: false });
    alert(`Đã gửi yêu cầu "${serviceContent}" tới nhân viên phục vụ!`);
  }

  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');

    const loginUrl = new URL(
      process.env.REACT_APP_ADMIN_LOGIN_URL || '/admin/login',
      window.location.origin
    );
    loginUrl.searchParams.set('loggedOut', '1');
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
      selectedProductForDetail, 
      showServiceModal, 
      showCartModal 
    } = this.state;

    const filteredProducts = products.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category?._id === selectedCategory || item.category === selectedCategory;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
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
            isSubmittingOrder={this.state.isSubmittingOrder}
            onClose={() => this.setState({ showCartModal: false })}
            onSubmitOrder={this.handleSubmitOrder}
          />
        )}
      </div>
    );
  }
}

export default CustomerHomeComponent;
