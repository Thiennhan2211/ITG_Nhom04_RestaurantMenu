import React, { Component } from 'react';
import '../css/CartModalComponent.css';

class CartModalComponent extends Component {
  render() {
    const { cart, onClose, onSubmitOrder } = this.props;

    // Tính tổng tiền tất cả các món trong giỏ
    const grandTotal = cart.reduce((sum, item) => sum + (item.totalPrice || item.price * item.quantity), 0);

    return (
      <div className="cart-modal-overlay">
        <div className="cart-modal-card">
          {/* Header */}
          <div className="cart-modal-header">
            <button className="btn-back-cart" onClick={onClose}>〈</button>
            <span>Món đã gọi</span>
          </div>

          {/* Danh sách món */}
          <div className="cart-modal-body">
            {cart.length > 0 ? (
              cart.map((item, index) => {
                const baseItemPrice = item.price * item.quantity;
                let toppingsTotal = 0;

                // Tính tổng topping nếu có
                if (item.selectedToppings) {
                  Object.keys(item.selectedToppings).forEach(tName => {
                    // Bạn có thể mapping giá topping thực tế ở đây nếu lưu kèm
                  });
                }

                const itemTotal = item.totalPrice || (baseItemPrice + toppingsTotal);

                return (
                  <div key={index} className="cart-item-card">
                    <div className="cart-item-name">{item.name}</div>
                    
                    <div className="cart-item-detail-row">
                      <span>x{item.quantity} Phần</span>
                      <span>+{baseItemPrice.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {/* Hiển thị danh sách topping đã chọn */}
                    {item.selectedToppings && Object.entries(item.selectedToppings).map(([tName, tQty], idx) => (
                      <div key={idx} className="cart-item-detail-row">
                        <span>x{tQty} {tName}</span>
                      </div>
                    ))}

                    {/* Hiển thị ghi chú nếu có */}
                    {item.note && (
                      <div className="cart-item-note">{item.note}</div>
                    )}

                    <hr className="cart-item-divider" />

                    <div className="cart-item-total-row">
                      <span>Tổng giá</span>
                      <span className="cart-item-total-price">+{itemTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
                Chưa có món nào trong danh sách.
              </div>
            )}
          </div>

          {/* Footer nút gọi phục vụ / Gửi bếp */}
          <div className="cart-modal-footer">
            <button className="btn-submit-order" onClick={onSubmitOrder} disabled={this.props.isSubmittingOrder}>
              {this.props.isSubmittingOrder ? 'Đang gửi đơn...' : `Gọi phục vụ (${grandTotal.toLocaleString('vi-VN')}đ)`}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default CartModalComponent;
