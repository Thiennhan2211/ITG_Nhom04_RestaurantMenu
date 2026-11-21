import React, { Component } from 'react';
import axios from 'axios';
import { getTableEntryUrl } from '../utils/customerAppUrl';
import '../css/ReceptionComponent.css';

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tableNumber = (value) => {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;
const formatDrinkOptions = (options) => {
  if (!options) return '';
  const iceLabels = { normal: 'Đá thường', less: 'Ít đá', none: 'Không đá' };
  return `${iceLabels[options.ice] || iceLabels.normal} · ${Number(options.sugar ?? 100)}% đường`;
};
const toppingPrices = {
  'Rau thêm': 3000,
  'Mì thêm': 10000,
  'Đậu hũ thêm': 10000,
  'Nấm': 5000,
  'Chả chay': 5000
};
const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
  : '';
const getQrImageUrl = (url) => {
  const qrUrl = new URL('https://api.qrserver.com/v1/create-qr-code/');
  qrUrl.searchParams.set('size', '320x320');
  qrUrl.searchParams.set('margin', '8');
  qrUrl.searchParams.set('data', url);
  return qrUrl.toString();
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

class ReceptionComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tables: Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        name: `Bàn ${String(index + 1).padStart(2, '0')}`,
        status: 'empty',
        guests: 0,
        time: '',
        note: '4 ghế'
      })),
      reservations: [],
      serviceRequests: [],
      resolvingRequestIds: [],
      serviceRequestError: '',
      stats: { total: 12, occupied: 0, reserved: 0, empty: 12 },
      selectedTable: null,
      modal: '',
      billOrders: [],
      billLoading: false,
      savingReservation: false,
      completingReservation: false,
      confirmingPayment: false,
      paymentMethod: 'CASH',
      error: '',
      tableEntryUrl: '',
      reservationForm: { customerName: '', customerPhone: '', guests: '2', time: '' }
    };
  }

  componentDidMount() {
    this.fetchReceptionData();
    this.timerID = setInterval(this.fetchReceptionData, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  apiConfig = () => ({
    headers: { 'x-access-token': localStorage.getItem('token') }
  });

  fetchReceptionData = () => {
    this.fetchServiceRequests();
    axios.get(`/api/admin/tables-status?date=${localDateString()}`, this.apiConfig())
      .then((res) => {
        if (!res.data?.success) return;
        const tables = res.data.tables || [];
        const reservations = res.data.reservations || [];
        const occupied = tables.filter(table => table.status === 'occupied').length;
        const occupiedTableNumbers = new Set(tables.filter(table => table.status === 'occupied').map(table => table.id));
        const reservedTableNumbers = new Set(
          reservations.map(item => tableNumber(item.tableNo)).filter(id => !occupiedTableNumbers.has(id))
        );
        const reserved = reservedTableNumbers.size;
        const empty = Math.max(tables.length - occupied - reserved, 0);
        this.setState({
          tables,
          reservations,
          stats: { total: tables.length, occupied, reserved, empty }
        });
      })
      .catch((err) => console.error('Lỗi tải dữ liệu lễ tân:', err));
  };

  fetchServiceRequests = () => {
    axios.get('/api/admin/service-requests', this.apiConfig())
      .then((res) => this.setState({ serviceRequests: Array.isArray(res.data) ? res.data : [], serviceRequestError: '' }))
      .catch((err) => this.setState({
        serviceRequestError: err.response?.data?.message || 'Không thể tải yêu cầu phục vụ.'
      }));
  };

  resolveServiceRequest = (request) => {
    this.setState(({ resolvingRequestIds }) => ({
      resolvingRequestIds: [...resolvingRequestIds, request._id],
      serviceRequestError: ''
    }));
    axios.put(`/api/admin/service-requests/${request._id}/status`, { status: 'RESOLVED' }, this.apiConfig())
      .then(() => this.setState(({ serviceRequests, resolvingRequestIds }) => ({
        serviceRequests: serviceRequests.filter(item => item._id !== request._id),
        resolvingRequestIds: resolvingRequestIds.filter(id => id !== request._id)
      })))
      .catch((err) => this.setState(({ resolvingRequestIds }) => ({
        resolvingRequestIds: resolvingRequestIds.filter(id => id !== request._id),
        serviceRequestError: err.response?.data?.message || 'Không thể cập nhật yêu cầu phục vụ.'
      })));
  };

  openTable = (table) => {
    this.setState({ selectedTable: table, error: '' });
    if (table.status === 'occupied') {
      this.setState({ modal: 'bill', billLoading: true, billOrders: [] });
      axios.get(`/api/admin/tables/${table.id}/bill`, this.apiConfig())
        .then((res) => this.setState({ billOrders: res.data.orders || [], billLoading: false }))
        .catch((err) => this.setState({
          billLoading: false,
          error: err.response?.data?.message || 'Không thể tải hóa đơn bàn này.'
        }));
      return;
    }

    if (table.status === 'reserved') {
      this.setState({ modal: 'reservation-details' });
      return;
    }

    this.setState({
      modal: 'reserve',
      reservationForm: { customerName: '', customerPhone: '', guests: '2', time: '' }
    });
  };

  openTableQr = (table) => {
    this.setState({
      selectedTable: table,
      tableEntryUrl: getTableEntryUrl(table.id),
      modal: 'table-qr',
      error: ''
    });
  };

  printTableQr = () => {
    const { selectedTable, tableEntryUrl } = this.state;
    if (!selectedTable || !tableEntryUrl) return;

    const printWindow = window.open('', '_blank', 'popup,width=720,height=900');
    if (!printWindow) {
      this.setState({ error: 'Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.' });
      return;
    }

    const tableName = escapeHtml(selectedTable.name);
    const printDocument = `<!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Mã QR ${tableName}</title>
          <style>
            @page { size: A6 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 105mm; height: 148mm; margin: 0; }
            body { color: #332925; font-family: Arial, sans-serif; }
            .sheet { display: flex; width: 105mm; height: 148mm; flex-direction: column; align-items: center; padding: 0 10mm 7mm; background: #f8f5f0; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .brand { display: flex; width: calc(100% + 20mm); min-height: 24mm; flex-direction: column; justify-content: center; margin: 0 -10mm; border-radius: 0 0 7mm 7mm; background: #4a352e; color: #fff; }
            .brand strong { font-size: 16pt; }
            .brand span { margin-top: 2mm; font-size: 8pt; }
            .qr-panel { display: flex; width: 100%; flex-direction: column; align-items: center; margin-top: 8mm; padding: 5mm 3mm 3mm; border-radius: 7mm; background: #fff; }
            h1 { margin: 0; font-size: 13pt; }
            .qr-image { display: block; width: 54mm; height: 54mm; margin: 4mm auto 1mm; image-rendering: pixelated; }
            .scan-hint { margin: 1mm 0 0; font-size: 8pt; font-weight: 700; }
            .caption { margin: 7mm 0 0; font-size: 9pt; font-weight: 700; }
            .table-name { margin-top: 3mm; font-size: 18pt; }
            .footer { margin-top: auto; color: #8a7d74; font-size: 8pt; line-height: 1.5; }
            @media screen { body { margin: 16px auto; } .sheet { box-shadow: 0 4px 20px #0002; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="brand"><strong>Nhà hàng Văn Lang</strong><span>Vietnamese Restaurant</span></header>
            <section class="qr-panel">
              <h1>Quét mã để mở thực đơn</h1>
              <img id="table-qr-print-image" class="qr-image" alt="Mã QR thực đơn ${tableName}" />
              <p class="scan-hint">Dùng camera điện thoại để quét</p>
            </section>
            <p class="caption">Menu điện tử của chúng tôi</p>
            <strong class="table-name">${tableName}</strong>
            <footer class="footer">Nhà hàng Văn Lang<br />© 2026</footer>
          </main>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(printDocument);
    printWindow.document.close();
    printWindow.onafterprint = () => printWindow.close();

    const qrImage = printWindow.document.getElementById('table-qr-print-image');
    qrImage.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    qrImage.addEventListener('error', () => {
      this.setState({ error: 'Không tải được mã QR để in. Vui lòng kiểm tra kết nối mạng rồi thử lại.' });
    }, { once: true });
    qrImage.src = getQrImageUrl(tableEntryUrl);
  };

  openReservation = (reservation) => {
    const id = tableNumber(reservation.tableNo);
    const table = this.state.tables.find(item => item.id === id) || {
      id,
      name: `Bàn ${String(id).padStart(2, '0')}`,
      status: 'reserved'
    };
    this.setState({ selectedTable: table, modal: 'reservation-details', error: '' });
  };

  closeModal = () => this.setState({ modal: '', selectedTable: null, error: '', billOrders: [] });

  updateReservationForm = (event) => {
    const { name, value } = event.target;
    this.setState(state => ({
      reservationForm: { ...state.reservationForm, [name]: value },
      error: ''
    }));
  };

  createReservation = (event) => {
    event.preventDefault();
    const { selectedTable, reservationForm } = this.state;
    const reservedAt = new Date(`${localDateString()}T${reservationForm.time}:00`);
    if (Number.isNaN(reservedAt.getTime()) || reservedAt.getTime() <= Date.now()) {
      this.setState({ error: 'Vui lòng chọn giờ đặt bàn trong tương lai hôm nay.' });
      return;
    }

    this.setState({ savingReservation: true, error: '' });
    axios.post('/api/admin/reservations', {
      tableNo: selectedTable.id,
      customerName: reservationForm.customerName,
      customerPhone: reservationForm.customerPhone,
      guests: Number(reservationForm.guests),
      reservedAt: reservedAt.toISOString(),
      serviceDate: localDateString()
    }, this.apiConfig())
      .then(() => {
        this.setState({ modal: '', selectedTable: null, savingReservation: false });
        this.fetchReceptionData();
      })
      .catch((err) => this.setState({
        savingReservation: false,
        error: err.response?.data?.message || 'Không thể lưu lịch đặt bàn lúc này.'
      }));
  };

  completeReservation = (reservationId) => {
    if (!reservationId || this.state.completingReservation) return;
    this.setState({ completingReservation: true, error: '' });
    axios.put(`/api/admin/reservations/${reservationId}/complete`, {}, this.apiConfig())
      .then(() => {
        this.setState({ modal: '', selectedTable: null, completingReservation: false });
        this.fetchReceptionData();
      })
      .catch((err) => this.setState({
        completingReservation: false,
        error: err.response?.data?.message || 'Không thể cập nhật lịch đặt bàn lúc này.'
      }));
  };

  getOrderTotal = (order) => Number(order.total) || (order.items || []).reduce((sum, item) => {
    const toppingTotal = item.toppingTotal != null
      ? Number(item.toppingTotal)
      : Object.entries(item.selectedToppings || {}).reduce(
        (toppingSum, [name, quantity]) => toppingSum + (toppingPrices[name] || 0) * Number(quantity || 0), 0
      );
    const unitPrice = Number(item.price || item.product?.price || 0) + toppingTotal;
    return sum + unitPrice * Number(item.quantity || 0);
  }, 0);

  getBillTotal = () => this.state.billOrders.reduce((sum, order) => sum + this.getOrderTotal(order), 0);

  confirmPayment = () => {
    const { selectedTable, paymentMethod } = this.state;
    if (!selectedTable || this.state.billOrders.length === 0) return;
    this.setState({ confirmingPayment: true, error: '' });
    axios.put(`/api/admin/tables/${selectedTable.id}/checkout`, { paymentMethod }, this.apiConfig())
      .then(() => {
        this.setState({ modal: '', selectedTable: null, billOrders: [], confirmingPayment: false });
        this.fetchReceptionData();
      })
      .catch((err) => this.setState({
        confirmingPayment: false,
        error: err.response?.data?.message || 'Không thể xác nhận thanh toán lúc này.'
      }));
  };

  renderTableStatus = (table) => {
    if (table.status === 'occupied') return 'Đang có khách';
    if (table.status === 'reserved') return `Đặt trước lúc ${formatTime(table.time)}`;
    return 'Bàn trống';
  };

  render() {
    const {
      tables, reservations, stats, selectedTable, modal, billOrders, billLoading,
      savingReservation, completingReservation, confirmingPayment, error, reservationForm,
      serviceRequests, resolvingRequestIds, serviceRequestError, tableEntryUrl
    } = this.state;
    const selectedReservation = selectedTable && reservations.find(
      item => tableNumber(item.tableNo) === selectedTable.id
    );

    return (
      <div className="reception-container">
        <h2 className="reception-title">QUẢN LÝ LỄ TÂN &amp; ĐẶT BÀN</h2>

        <section className="service-requests-section" aria-live="polite">
          <div className="service-requests-heading">
            <div>
              <h3>Yêu cầu phục vụ</h3>
              <p>Yêu cầu từ khách hàng sẽ cập nhật tự động.</p>
            </div>
            <span className="service-request-count">{serviceRequests.length} đang chờ</span>
          </div>
          {serviceRequestError && <div className="service-request-error" role="alert">{serviceRequestError}</div>}
          <div className="service-request-list">
            {serviceRequests.map(request => (
              <article className="service-request-card" key={request._id}>
                <div className="service-request-table">{request.tableNo}</div>
                <div className="service-request-content">
                  <strong>{request.content}</strong>
                  <span>{formatTime(request.cdate)}</span>
                </div>
                <button
                  type="button"
                  className="service-request-resolve"
                  disabled={resolvingRequestIds.includes(request._id)}
                  onClick={() => this.resolveServiceRequest(request)}
                >
                  {resolvingRequestIds.includes(request._id) ? 'Đang cập nhật...' : 'Đã xử lý'}
                </button>
              </article>
            ))}
            {serviceRequests.length === 0 && !serviceRequestError && (
              <div className="service-request-empty">Chưa có yêu cầu nào đang chờ.</div>
            )}
          </div>
        </section>

        <div className="reception-stats">
          <div className="stat-card">
            <div className="stat-label">Tổng số bàn</div>
            <div className="stat-value">{stats.total} Bàn</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bàn đang có khách</div>
            <div className="stat-value occupied">{stats.occupied} Bàn</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bàn đã đặt trước hôm nay</div>
            <div className="stat-value reserved">{stats.reserved} Bàn</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bàn còn trống</div>
            <div className="stat-value empty">{stats.empty} Bàn</div>
          </div>
        </div>

        <div className="reception-content">
          <section className="table-map-section">
            <h3>Sơ Đồ Bàn Trực Quan ({stats.total} Bàn)</h3>
            <div className="table-grid">
              {tables.map(table => (
                <div className="table-card" key={table.id}>
                  <button
                    type="button"
                    className={`table-box ${table.status}`}
                    onClick={() => this.openTable(table)}
                    aria-label={`${table.name}, ${this.renderTableStatus(table)}. Bấm để xem thao tác.`}
                  >
                    <span className="table-name">{table.name}</span>
                    <span className="table-status-text">{this.renderTableStatus(table)}</span>
                    <span className="table-note">{table.note || '4 ghế'}</span>
                    {table.status === 'occupied' && <span className="table-action-hint">Bấm để tính tiền</span>}
                    {table.status === 'empty' && <span className="table-action-hint">Bấm để đặt bàn</span>}
                  </button>
                  <button type="button" className="table-qr-button" onClick={() => this.openTableQr(table)}>
                    Link &amp; mã QR
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="reservation-section">
            <h3>Lịch Đặt Bàn Trong Ngày</h3>
            <div className="reservation-list">
              {reservations.length > 0 ? reservations.map(reservation => (
                <button
                  type="button"
                  key={reservation._id || reservation.id}
                  className="reservation-item reservation-item-button"
                  aria-label={`Xem lịch đặt bàn của ${reservation.customerName} tại bàn ${tableNumber(reservation.tableNo)}`}
                  onClick={() => this.openReservation(reservation)}
                >
                  <span className="reservation-summary">
                    <span className="reservation-info-name">{reservation.customerName}</span>
                    <span className="reservation-info-detail">
                      Bàn {String(tableNumber(reservation.tableNo)).padStart(2, '0')} · {reservation.guests} người
                    </span>
                    <span className="reservation-info-detail">{reservation.customerPhone}</span>
                    <span className="reservation-info-hint">Bấm để xem hoặc kết thúc lịch đặt bàn</span>
                  </span>
                  <span className="reservation-time-badge">{formatTime(reservation.reservedAt)}</span>
                </button>
              )) : <div className="no-reservation">Chưa có lịch đặt bàn nào.</div>}
            </div>
          </section>
        </div>

        {modal && (
          <div className="reception-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) this.closeModal();
          }}>
            <section className="reception-modal" role="dialog" aria-modal="true">
              <button type="button" className="modal-close" onClick={this.closeModal} aria-label="Đóng">×</button>

              {modal === 'bill' && (
                <>
                  <h3>Tính tiền · {selectedTable?.name}</h3>
                  {billLoading ? <p className="modal-muted">Đang tải hóa đơn...</p> : (
                    <>
                      {billOrders.length === 0 ? <p className="modal-muted">Bàn này chưa có đơn hàng cần thanh toán.</p> : (
                        <div className="bill-order-list">
                          {billOrders.map(order => (
                            <article className="bill-order" key={order._id}>
                              <div className="bill-order-heading">
                                <div>
                                  <strong>Đơn #{order._id.slice(-6).toUpperCase()}</strong>
                                  <div className="bill-customer">
                                    {order.customerName || 'Khách tại bàn'}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
                                  </div>
                                </div>
                                <span>{formatTime(order.cdate)}</span>
                              </div>
                              <div className="bill-items">
                                {(order.items || []).map((item, index) => {
                                  const quantity = Number(item.quantity || 0);
                                  const toppingTotal = item.toppingTotal != null
                                    ? Number(item.toppingTotal)
                                    : Object.entries(item.selectedToppings || {}).reduce(
                                      (sum, [name, count]) => sum + (toppingPrices[name] || 0) * Number(count || 0), 0
                                    );
                                  const unitPrice = Number(item.price || item.product?.price || 0) + toppingTotal;
                                  return (
                                    <div className="bill-item" key={`${order._id}-${index}`}>
                                      <div>
                                        <strong>{item.product?.name || 'Món ăn'} × {quantity}</strong>
                                        {item.selectedToppings && Object.keys(item.selectedToppings).length > 0 && (
                                          <div className="bill-item-note">
                                            Món thêm: {Object.entries(item.selectedToppings).map(([name, count]) => `${name} × ${count}`).join(', ')}
                                          </div>
                                        )}
                                        {item.drinkOptions && <div className="bill-item-note">{formatDrinkOptions(item.drinkOptions)}</div>}
                                        {item.note && <div className="bill-item-note">Ghi chú: {item.note}</div>}
                                      </div>
                                      <span>{formatCurrency(unitPrice * quantity)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="bill-order-total">
                                <span>Tạm tính đơn này</span><strong>{formatCurrency(this.getOrderTotal(order))}</strong>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                      <div className="bill-grand-total">
                        <span>Tổng cần thanh toán</span><strong>{formatCurrency(this.getBillTotal())}</strong>
                      </div>
                      <label className="bill-payment-method">
                        Phương thức thanh toán
                        <select value={this.state.paymentMethod} onChange={(event) => this.setState({ paymentMethod: event.target.value })}>
                          <option value="CASH">Tiền mặt</option>
                          <option value="BANK_TRANSFER">Chuyển khoản</option>
                        </select>
                      </label>
                    </>
                  )}
                  {error && <div className="reception-error">{error}</div>}
                  <div className="modal-actions">
                    <button type="button" className="button-secondary" onClick={this.closeModal}>Đóng</button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={billLoading || billOrders.length === 0 || confirmingPayment}
                      onClick={this.confirmPayment}
                    >
                      {confirmingPayment ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền'}
                    </button>
                  </div>
                </>
              )}

              {modal === 'reserve' && (
                <>
                  <h3>Đặt bàn trước · {selectedTable?.name}</h3>
                  <p className="modal-muted">Lịch đặt sẽ được thêm vào danh sách hôm nay. Bàn chuyển màu vàng trong 2 giờ trước giờ hẹn.</p>
                  <form className="reservation-form" onSubmit={this.createReservation}>
                    <label>
                      Tên khách hàng
                      <input name="customerName" value={reservationForm.customerName} onChange={this.updateReservationForm} required maxLength="100" />
                    </label>
                    <label>
                      Số điện thoại
                      <input name="customerPhone" type="tel" value={reservationForm.customerPhone} onChange={this.updateReservationForm} required maxLength="30" />
                    </label>
                    <div className="reservation-form-row">
                      <label>
                        Số khách
        <input name="guests" type="number" min="1" max="4" value={reservationForm.guests} onChange={this.updateReservationForm} required />
                      </label>
                      <label>
                        Giờ đặt hôm nay
                        <input name="time" type="time" value={reservationForm.time} onChange={this.updateReservationForm} required />
                      </label>
                    </div>
                    {error && <div className="reception-error">{error}</div>}
                    <div className="modal-actions">
                      <button type="button" className="button-secondary" onClick={this.closeModal}>Hủy</button>
                      <button type="submit" className="button-primary" disabled={savingReservation}>
                        {savingReservation ? 'Đang lưu...' : 'Xác nhận đặt bàn'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modal === 'reservation-details' && (
                <>
                  <h3>Thông tin đặt bàn · {selectedTable?.name}</h3>
                  {selectedReservation ? (
                    <div className="reservation-details">
                      <p><strong>Khách hàng:</strong> {selectedReservation.customerName}</p>
                      <p><strong>Số điện thoại:</strong> {selectedReservation.customerPhone}</p>
                      <p><strong>Số khách:</strong> {selectedReservation.guests}</p>
                      <p><strong>Giờ đặt:</strong> {formatTime(selectedReservation.reservedAt)}</p>
                    </div>
                  ) : <p className="modal-muted">Không tìm thấy thông tin lịch đặt bàn.</p>}
                  {error && <div className="reception-error">{error}</div>}
                  <div className="modal-actions">
                    <button type="button" className="button-secondary" onClick={this.closeModal}>Đóng</button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={!selectedReservation || completingReservation}
                      onClick={() => this.completeReservation(selectedReservation?._id)}
                    >
                      {completingReservation ? 'Đang cập nhật...' : 'Khách đã dùng xong'}
                    </button>
                  </div>
                </>
              )}

              {modal === 'table-qr' && selectedTable && (
                <div className="table-qr-content">
                  <h3 className="table-qr-screen-title">Mã QR · {selectedTable.name}</h3>
                  <p className="modal-muted">Khách quét mã này để mở thực đơn đúng bàn.</p>
                  <img
                    className="table-qr-screen-image"
                    src={getQrImageUrl(tableEntryUrl)}
                    alt={`Mã QR thực đơn ${selectedTable.name}`}
                  />
                  <a className="table-qr-link" href={tableEntryUrl} target="_blank" rel="noreferrer">
                    {tableEntryUrl}
                  </a>
                  <div className="modal-actions">
                    <button type="button" className="button-secondary" onClick={this.closeModal}>Đóng</button>
                    <button type="button" className="button-primary" onClick={this.printTableQr}>In mã QR</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    );
  }
}

export default ReceptionComponent;
