import React from 'react';
import '../css/CartModalComponent.css';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const orderStatus = (status) => {
  const labels = {
    PENDING: 'Chờ xác nhận',
    COOKING: 'Đang chế biến',
    APPROVED: 'Đang chế biến',
    COMPLETED: 'Hoàn thành',
    CANCELED: 'Đã hủy',
    CANCELLED: 'Đã hủy'
  };
  return labels[status] || 'Đang xử lý';
};

const orderItemsText = (items = []) => items
  .map((item) => `${item.quantity || 1} × ${item.product?.name || item.name || 'Món ăn'}`)
  .join(' · ');

function CartModalComponent(props) {
  const {
    cart = [],
    orders = [],
    activeTab = 'current',
    historyLoading = false,
    availableVouchers = [],
    voucherCode = '',
    appliedVoucher,
    voucherError = '',
    isApplyingVoucher = false,
    isSubmittingOrder = false,
    onHistoryTabChange,
    onVoucherCodeChange,
    onApplyVoucher,
    onSelectVoucher,
    onClearVoucher,
    onClose,
    onSubmitOrder
  } = props;

  const subtotal = cart.reduce((sum, item) => sum + Number(
    item.totalPrice ?? Number(item.price || 0) * Number(item.quantity || 0)
  ), 0);
  const discount = Math.min(subtotal, Number(appliedVoucher?.discountAmount || 0));
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const currentOrders = orders.filter((order) => !['COMPLETED', 'CANCELED', 'CANCELLED'].includes(order.status));
  const previousOrders = orders.filter((order) => ['COMPLETED', 'CANCELED', 'CANCELLED'].includes(order.status));
  const shownOrders = activeTab === 'current' ? currentOrders : previousOrders;

  return (
    <div className="cart-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="cart-modal-card" role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">
        <header className="cart-modal-header">
          <div>
            <div className="cart-modal-brand">NHÀ HÀNG VĂN LANG</div>
            <h2 id="cart-modal-title">Món đã gọi</h2>
          </div>
          <button type="button" className="cart-modal-close" aria-label="Đóng" onClick={onClose}>×</button>
        </header>

        <div className="cart-modal-body">
          <section className="cart-section">
            <div className="cart-section-heading">
              <div>
                <h3>Giỏ món hiện tại</h3>
                <p>{itemCount} món chờ gửi bếp</p>
              </div>
            </div>
            {cart.length ? (
              <div className="cart-items-list">
                {cart.map((item, index) => {
                  const itemTotal = Number(item.totalPrice ?? Number(item.price || 0) * Number(item.quantity || 0));
                  const selectedToppings = Object.entries(item.selectedToppings || {}).filter(([, quantity]) => Number(quantity) > 0);
                  return (
                    <article className="cart-item-card" key={`${item._id || item.name}-${index}`}>
                      <div className="cart-item-topline">
                        <div>
                          <h4>{item.name || 'Món ăn'}</h4>
                          <p>{item.quantity || 1} phần × {money(itemTotal / Math.max(1, Number(item.quantity || 1)))}</p>
                        </div>
                        <strong>{money(itemTotal)}</strong>
                      </div>
                      {selectedToppings.length > 0 && (
                        <p className="cart-item-extras">Thêm: {selectedToppings.map(([name, quantity]) => `${name} × ${quantity}`).join(', ')}</p>
                      )}
                      {item.note && <p className="cart-item-note">Ghi chú: {item.note}</p>}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="cart-empty">Giỏ món đang trống. Chọn món trong thực đơn để bắt đầu gọi món.</div>
            )}
          </section>

          <section className="voucher-panel">
            <div className="cart-section-heading">
              <div>
                <h3>Mã ưu đãi</h3>
                <p>Chọn mã còn hiệu lực hoặc nhập mã của bạn</p>
              </div>
              {appliedVoucher && <button type="button" className="voucher-remove" onClick={onClearVoucher}>Bỏ mã</button>}
            </div>
            <form className="voucher-entry" onSubmit={(event) => { event.preventDefault(); onApplyVoucher?.(); }}>
              <input
                type="text"
                value={voucherCode}
                onChange={(event) => onVoucherCodeChange?.(event.target.value)}
                placeholder="NHẬP MÃ GIẢM GIÁ"
                aria-label="Mã giảm giá"
                disabled={isApplyingVoucher || Boolean(appliedVoucher)}
              />
              <button type="submit" disabled={isApplyingVoucher || !voucherCode.trim() || Boolean(appliedVoucher)}>
                {isApplyingVoucher ? 'Đang kiểm tra…' : appliedVoucher ? 'Đã áp dụng' : 'Áp dụng'}
              </button>
            </form>
            {voucherError && <p className="voucher-error" role="alert">{voucherError}</p>}
            {appliedVoucher && (
              <div className="voucher-applied">
                <span><b>{appliedVoucher.code}</b>{appliedVoucher.title ? ` · ${appliedVoucher.title}` : ''}</span>
                <strong>−{money(discount)}</strong>
              </div>
            )}
            {availableVouchers.length > 0 && (
              <div className="available-vouchers">
                {availableVouchers.map((voucher) => (
                  <button
                    type="button"
                    className={`available-voucher ${appliedVoucher?.code === voucher.code ? 'selected' : ''}`}
                    key={voucher._id || voucher.code}
                    onClick={() => onSelectVoucher?.(voucher.code)}
                    disabled={isApplyingVoucher || Boolean(appliedVoucher)}
                  >
                    <span>
                      <b>{voucher.title || voucher.code}</b>
                      <small>{voucher.description || (voucher.discountType === 'percent' ? `Giảm ${voucher.discount}%` : `Giảm ${money(voucher.discount)}`)}{Number(voucher.minOrder) > 0 ? ` · Đơn từ ${money(voucher.minOrder)}` : ''}</small>
                    </span>
                    <strong>{appliedVoucher?.code === voucher.code ? '✓' : '+'}</strong>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="cart-section order-history-section">
            <div className="cart-section-heading history-heading">
              <div>
                <h3>Lịch sử đơn hàng</h3>
                <p>Theo dõi trạng thái món ngay tại đây</p>
              </div>
              <span className="history-count">{orders.length}</span>
            </div>
            <div className="history-tabs" role="tablist" aria-label="Lịch sử đơn hàng">
              <button type="button" role="tab" aria-selected={activeTab === 'current'} className={activeTab === 'current' ? 'active' : ''} onClick={() => onHistoryTabChange?.('current')}>
                Đang đặt ({currentOrders.length})
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'previous'} className={activeTab === 'previous' ? 'active' : ''} onClick={() => onHistoryTabChange?.('previous')}>
                Đơn cũ ({previousOrders.length})
              </button>
            </div>
            {historyLoading ? (
              <div className="history-empty">Đang tải lịch sử đơn hàng…</div>
            ) : shownOrders.length ? (
              <div className="order-history-list">
                {shownOrders.map((order) => (
                  <article className="order-history-card" key={order._id}>
                    <div className="order-history-topline">
                      <strong>Đơn #{String(order._id || '').slice(-6).toUpperCase()}</strong>
                      <span className={`order-status status-${String(order.status || '').toLowerCase()}`}>{orderStatus(order.status)}</span>
                    </div>
                    <p className="order-history-items">{orderItemsText(order.items)}</p>
                    <div className="order-history-bottomline">
                      <time>{order.cdate ? new Date(order.cdate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''}</time>
                      <strong>{money(order.total)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="history-empty">{activeTab === 'current' ? 'Bạn chưa có đơn nào đang xử lý.' : 'Chưa có đơn hàng cũ.'}</div>
            )}
          </section>
        </div>

        <footer className="cart-modal-footer">
          <div className="cart-total-row"><span>Tạm tính</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div className="cart-total-row discount-row"><span>Ưu đãi {appliedVoucher?.code ? `(${appliedVoucher.code})` : ''}</span><span>−{money(discount)}</span></div>}
          <div className="cart-total-row grand-total-row"><strong>Tổng thanh toán</strong><strong>{money(total)}</strong></div>
          <button type="button" className="btn-submit-order" onClick={onSubmitOrder} disabled={cart.length === 0 || isSubmittingOrder}>
            {isSubmittingOrder ? 'Đang gửi đơn…' : `Gửi bếp · ${money(total)}`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default CartModalComponent;
