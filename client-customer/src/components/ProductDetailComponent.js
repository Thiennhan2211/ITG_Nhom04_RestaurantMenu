import React, { Component } from 'react';
import '../css/ProductDetailComponent.css';

class ProductDetailComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: 1,
      note: '',
      selectedToppings: {} // Lưu số lượng của từng topping thêm vào
    };
  }

  // Tăng/giảm số lượng món chính
  handleQuantityChange = (type) => {
    let { quantity } = this.state;
    if (type === 'inc') {
      quantity += 1;
    } else if (type === 'dec' && quantity > 1) {
      quantity -= 1;
    }
    this.setState({ quantity });
  }

  // Tăng/giảm số lượng topping
  handleToppingChange = (toppingName, type) => {
    const { selectedToppings } = this.state;
    const currentQty = selectedToppings[toppingName] || 0;

    if (type === 'inc') {
      selectedToppings[toppingName] = currentQty + 1;
    } else if (type === 'dec' && currentQty > 0) {
      selectedToppings[toppingName] = currentQty - 1;
      if (selectedToppings[toppingName] === 0) {
        delete selectedToppings[toppingName];
      }
    }
    this.setState({ selectedToppings });
  }

  // Tính tổng tiền dựa trên giá món + giá các topping đã chọn * số lượng
  calculateTotal = () => {
    const { product } = this.props;
    const { quantity, selectedToppings } = this.state;
    
    let basePrice = product.price || 0;
    let toppingsTotal = 0;

    // Giả sử product.toppings được cấu hình từ admin, nếu không có lấy danh sách mặc định mẫu
    const availableToppings = product.toppings || [
      { name: 'Rau thêm', price: 3000 },
      { name: 'Mì thêm', price: 10000 },
      { name: 'Đậu hũ thêm', price: 10000 },
      { name: 'Nấm', price: 5000 },
      { name: 'Chả chay', price: 5000 }
    ];

    availableToppings.forEach(t => {
      const count = selectedToppings[t.name] || 0;
      toppingsTotal += (t.price * count);
    });

    return (basePrice + toppingsTotal) * quantity;
  }

  // Xác nhận thêm vào giỏ hàng
  handleAddToCartSubmit = () => {
    const { product, onAddToCart, onClose } = this.props;
    const { quantity, note, selectedToppings } = this.state;

    const cartItem = {
      ...product,
      quantity,
      note,
      selectedToppings,
      totalPrice: this.calculateTotal()
    };

    if (onAddToCart) {
      onAddToCart(cartItem);
    }
    if (onClose) {
      onClose();
    }
  }

  render() {
    const { product, onClose } = this.props;
    const { quantity, note, selectedToppings } = this.state;

    if (!product) return null;

    // Lấy danh sách topping từ database của món, hoặc danh sách mặc định nếu chưa nhập
    const availableToppings = product.toppings || [
      { name: 'Rau thêm', price: 3000 },
      { name: 'Mì thêm', price: 10000 },
      { name: 'Đậu hũ thêm', price: 10000 },
      { name: 'Nấm', price: 5000 },
      { name: 'Chả chay', price: 5000 }
    ];

    const totalPrice = this.calculateTotal();

    return (
      <div className="product-modal-overlay">
        <div className="product-modal-card">
          <button className="btn-close-modal" onClick={onClose}>✕</button>

          {/* Ảnh sản phẩm */}
          <img 
            src={product.image || 'https://via.placeholder.com/400'} 
            alt={product.name} 
            className="modal-product-img" 
          />

          {/* Thông tin món */}
          <div className="modal-product-info">
            <h3>{product.name}</h3>
            <span className="modal-product-price">
              {Number(product.price || 0).toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Tùy chọn thêm (Toppings) lấy từ DB */}
          <div className="modal-section">
            <div className="modal-section-title">Tuỳ chọn thêm</div>
            {availableToppings.map((topping, idx) => {
              const qty = selectedToppings[topping.name] || 0;
              return (
                <div key={idx} className="topping-row">
                  <div>
                    <div className="topping-info">{topping.name}</div>
                    <div className="topping-price">+{Number(topping.price).toLocaleString('vi-VN')}đ</div>
                  </div>
                  <div className="topping-controls">
                    <button className="btn-qty-small" onClick={() => this.handleToppingChange(topping.name, 'dec')}>-</button>
                    <span>{qty}</span>
                    <button className="btn-qty-small" onClick={() => this.handleToppingChange(topping.name, 'inc')}>+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ghi chú */}
          <div className="modal-note-section">
            <div className="modal-section-title">Thêm lưu ý cho quán</div>
            <textarea 
              placeholder="Cho quán biết thêm yêu cầu của bạn..."
              value={note}
              onChange={(e) => this.setState({ note: e.target.value })}
            />
          </div>

          {/* Footer nút thêm vào giỏ */}
          <div className="modal-footer">
            <div className="quantity-adjuster">
              <button className="btn-main-qty" onClick={() => this.handleQuantityChange('dec')}>-</button>
              <span className="quantity-number">{quantity}</span>
              <button className="btn-main-qty" onClick={() => this.handleQuantityChange('inc')}>+</button>
            </div>

            <button className="btn-submit-cart" onClick={this.handleAddToCartSubmit}>
              Thêm món - {totalPrice.toLocaleString('vi-VN')}đ
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ProductDetailComponent;