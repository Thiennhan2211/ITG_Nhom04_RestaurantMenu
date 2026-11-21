import React, { Component } from 'react';
import '../css/ProductDetailComponent.css';

const isDrinkProduct = (product) => {
  const categoryName = String(product?.category?.name || '').toLowerCase();
  return ['uống', 'nước', 'drink', 'beverage'].some(keyword => categoryName.includes(keyword));
};

class ProductDetailComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: 1,
      note: '',
      selectedToppings: {},
      drinkOptions: { ice: 'normal', sugar: 100 }
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
    this.setState(({ selectedToppings }) => {
      const currentQty = Number(selectedToppings[toppingName] || 0);
      const nextQty = type === 'inc' ? currentQty + 1 : Math.max(0, currentQty - 1);
      const nextToppings = { ...selectedToppings };
      if (nextQty > 0) nextToppings[toppingName] = nextQty;
      else delete nextToppings[toppingName];
      return { selectedToppings: nextToppings };
    });
  }

  getAvailableToppings = () => Array.isArray(this.props.product?.toppings) ? this.props.product.toppings : [];

  // Tính tổng tiền dựa trên giá món + giá các topping đã chọn * số lượng
  calculateTotal = () => {
    const { product } = this.props;
    const { quantity, selectedToppings } = this.state;
    
    const basePrice = Number(product.price || 0);
    let toppingsTotal = 0;
    this.getAvailableToppings().forEach(t => {
      const count = selectedToppings[t.name] || 0;
      toppingsTotal += Number(t.price || 0) * count;
    });

    return (basePrice + toppingsTotal) * quantity;
  }

  // Xác nhận thêm vào giỏ hàng
  handleAddToCartSubmit = () => {
    const { product, onAddToCart, onClose } = this.props;
    const { quantity, note, selectedToppings, drinkOptions } = this.state;
    const isDrink = isDrinkProduct(product);

    const cartItem = {
      ...product,
      quantity,
      note,
      selectedToppings: isDrink ? {} : selectedToppings,
      drinkOptions: isDrink ? drinkOptions : null,
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
    const { quantity, note, selectedToppings, drinkOptions } = this.state;

    if (!product) return null;

    const isDrink = isDrinkProduct(product);
    const availableToppings = this.getAvailableToppings();
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

          {isDrink ? (
            <div className="modal-section drink-options-section">
              <div className="modal-section-title">Tuỳ chọn đồ uống</div>
              <label className="drink-option-field">
                Lượng đá
                <select value={drinkOptions.ice} onChange={event => this.setState({ drinkOptions: { ...drinkOptions, ice: event.target.value } })}>
                  <option value="normal">Đá bình thường</option>
                  <option value="less">Ít đá</option>
                  <option value="none">Không đá</option>
                </select>
              </label>
              <label className="drink-option-field">
                Lượng đường
                <select value={drinkOptions.sugar} onChange={event => this.setState({ drinkOptions: { ...drinkOptions, sugar: Number(event.target.value) } })}>
                  <option value="100">100% đường</option>
                  <option value="70">70% đường</option>
                  <option value="50">50% đường</option>
                  <option value="30">30% đường</option>
                </select>
              </label>
            </div>
          ) : availableToppings.length > 0 ? (
            <div className="modal-section">
              <div className="modal-section-title">Topping thêm cho món này</div>
              {availableToppings.map((topping, idx) => {
                const qty = selectedToppings[topping.name] || 0;
                return (
                  <div key={`${topping.name}-${idx}`} className="topping-row">
                    <div>
                      <div className="topping-info">{topping.name}</div>
                      <div className="topping-price">+{Number(topping.price).toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div className="topping-controls">
                      <button type="button" className="btn-qty-small" onClick={() => this.handleToppingChange(topping.name, 'dec')}>-</button>
                      <span>{qty}</span>
                      <button type="button" className="btn-qty-small" onClick={() => this.handleToppingChange(topping.name, 'inc')}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

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
