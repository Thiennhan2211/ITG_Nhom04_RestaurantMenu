import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/VoucherComponent.css';

class Voucher extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      vouchers: [],
      txtID: '',
      txtCode: '',
      txtTitle: '',
      txtDiscount: '',
      cmbDiscountType: 'amount', // 'amount' hoặc 'percent'
      txtMinOrder: '',
      txtExpiryDate: '',
      txtDescription: '',
      isEdit: false,
      showConfirm: false,
      confirmMsg: '',
      onConfirmCallback: null,
      showToast: false,
      toastMsg: ''
    };
  }

  componentDidMount() {
    this.apiGetVouchers();
  }

  triggerToast = (msg) => {
    this.setState({ showToast: true, toastMsg: msg });
    setTimeout(() => {
      this.setState({ showToast: false });
    }, 3000);
  };

  apiGetVouchers = () => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.get('/api/admin/vouchers', config).then((res) => {
      this.setState({ vouchers: res.data || [] });
    }).catch(err => {
      console.error("Lỗi tải mã giảm giá:", err);
    });
  };

  selectItem = (item) => {
    this.setState({
      txtID: item._id,
      txtCode: item.code,
      txtTitle: item.title || '',
      txtDiscount: item.discount,
      cmbDiscountType: item.discountType || 'amount',
      txtMinOrder: item.minOrder || 0,
      txtExpiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      txtDescription: item.description || '',
      isEdit: true
    });
  };

  resetForm = () => {
    this.setState({
      txtID: '',
      txtCode: '',
      txtTitle: '',
      txtDiscount: '',
      cmbDiscountType: 'amount',
      txtMinOrder: '',
      txtExpiryDate: '',
      txtDescription: '',
      isEdit: false
    });
  };

  btnSaveClick = (e) => {
    e.preventDefault();
    const { txtID, txtCode, txtTitle, txtDiscount, cmbDiscountType, txtMinOrder, txtExpiryDate, txtDescription, isEdit } = this.state;

    if (!txtCode || !txtDiscount || !txtExpiryDate) {
      this.triggerToast('Vui lòng nhập đầy đủ Mã code, Giá trị giảm và Ngày hết hạn!');
      return;
    }

    const voucherObj = {
      code: txtCode,
      title: txtTitle,
      discount: parseFloat(txtDiscount),
      discountType: cmbDiscountType,
      minOrder: parseFloat(txtMinOrder || 0),
      expiryDate: txtExpiryDate,
      description: txtDescription,
      status: 'Active'
    };

    const config = { headers: { 'x-access-token': this.context.token } };

    if (isEdit) {
      axios.put(`/api/admin/vouchers/${txtID}`, voucherObj, config).then((res) => {
        if (res.data) {
          this.triggerToast('Cập nhật mã giảm giá thành công!');
          this.apiGetVouchers();
          this.resetForm();
        }
      });
    } else {
      axios.post('/api/admin/vouchers', voucherObj, config).then((res) => {
        if (res.data) {
          this.triggerToast('Thêm mã giảm giá mới thành công!');
          this.apiGetVouchers();
          this.resetForm();
        }
      });
    }
  };

  btnDeleteClick = (id) => {
    this.setState({
      showConfirm: true,
      confirmMsg: 'Bạn có chắc chắn muốn xóa mã giảm giá này không?',
      onConfirmCallback: () => {
        const config = { headers: { 'x-access-token': this.context.token } };
        axios.delete(`/api/admin/vouchers/${id}`, config).then((res) => {
          if (res.data.success) {
            this.triggerToast('Đã xóa mã giảm giá thành công!');
            this.apiGetVouchers();
            this.resetForm();
          }
        });
      }
    });
  };

  render() {
    const { 
      vouchers, txtCode, txtTitle, txtDiscount, cmbDiscountType, txtMinOrder, txtExpiryDate, txtDescription, isEdit,
      showConfirm, confirmMsg, showToast, toastMsg 
    } = this.state;

    return (
      <div className="voucher-container">
        <h3 className="voucher-title">QUẢN LÝ MÃ GIẢM GIÁ (VOUCHER)</h3>
        <div className="voucher-layout">
          
          {/* CỘT TRÁI: Form Chi Tiết Mã Giảm Giá */}
          <div className="voucher-form-card">
            <h4 style={{ marginBottom: '20px', color: '#4A2E2B' }}>
              {isEdit ? 'Chỉnh Sửa Mã Giảm Giá' : 'Chi Tiết Mã Giảm Giá'}
            </h4>
            <form>
              <div className="form-group">
                <label className="form-label">Mã Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={txtCode}
                  onChange={(e) => this.setState({ txtCode: e.target.value })}
                  placeholder="Ví dụ: NhahangVanLang"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu Đề</label>
                <input
                  type="text"
                  className="form-input"
                  value={txtTitle}
                  onChange={(e) => this.setState({ txtTitle: e.target.value })}
                  placeholder="Ví dụ: Tết trung thu"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá Trị Giảm *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 2 }}
                    value={txtDiscount}
                    onChange={(e) => this.setState({ txtDiscount: e.target.value })}
                    placeholder={cmbDiscountType === 'percent' ? 'VD: 15 (15%)' : 'VD: 20000'}
                  />
                  <select
                    className="form-select"
                    style={{ flex: 1 }}
                    value={cmbDiscountType}
                    onChange={(e) => this.setState({ cmbDiscountType: e.target.value })}
                  >
                    <option value="amount">VNĐ (đ)</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Đơn Tối Thiểu (VNĐ)</label>
                <input
                  type="number"
                  className="form-input"
                  value={txtMinOrder}
                  onChange={(e) => this.setState({ txtMinOrder: e.target.value })}
                  placeholder="Ví dụ: 50000"
                />
              </div>

              <div className="form-group">
  <label className="form-label">Ngày Hết Hạn * (dd/mm/yyyy)</label>
  <input
    type="text"
    className="form-input"
    value={txtExpiryDate}
    onChange={(e) => this.setState({ txtExpiryDate: e.target.value })}
    placeholder="VD: 25/10/2026 hoặc 2026-10-25"
  />
</div>

              <div className="form-group">
                <label className="form-label">Mô Tả Chi Tiết</label>
                <textarea
                  className="form-textarea"
                  value={txtDescription}
                  onChange={(e) => this.setState({ txtDescription: e.target.value })}
                  placeholder="Ví dụ: Giảm 10% cho đơn hàng từ 50.000đ..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" onClick={this.btnSaveClick} className="btn-submit">
                  {isEdit ? 'CẬP NHẬT MÃ' : 'Lưu Danh Mục'}
                </button>
                {isEdit && (
                  <button type="button" onClick={this.resetForm} className="btn-cancel">
                    HỦY
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* CỘT PHẢI: Bảng Danh Sách Mã Giảm Giá */}
          <div className="voucher-table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#4A2E2B' }}>Danh Sách Mã Giảm Giá Hiện Có</h4>
              <span style={{ fontSize: '13px', color: '#666' }}>Tổng cộng: {vouchers.length} Mã</span>
            </div>

            <table className="voucher-table">
              <thead>
                <tr>
                  <th>Thứ Tự</th>
                  <th>Mã Code</th>
                  <th>Tiêu Đề</th>
                  <th>Mức Giảm</th>
                  <th>Tối Thiểu</th>
                  <th>Hạn Sử Dụng</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '30px' }}>
                      Chưa có mã giảm giá nào.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((item, index) => {
                    const isExpired = item.computedStatus === 'Expired';
                    const displayDiscount = item.discountType === 'percent' 
                      ? `${item.discount}%` 
                      : `${(item.discount || 0).toLocaleString('vi-VN')} đ`;

                    // Định dạng ngày/tháng/năm
                    const formattedDate = item.expiryDate 
                      ? new Date(item.expiryDate).toLocaleDateString('vi-VN') 
                      : 'N/A';

                    return (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 'bold' }}>{item.autoIndex || (index + 1)}</td>
                        <td style={{ fontWeight: 'bold', color: '#8C4A3E' }}>{item.code}</td>
                        <td>{item.title || 'N/A'}</td>
                        <td style={{ fontWeight: 'bold', color: '#C85A32' }}>
                          {displayDiscount}
                        </td>
                        <td>{(item.minOrder || 0).toLocaleString('vi-VN')} đ</td>
                        <td style={{ fontSize: '13px', color: '#555' }}>{formattedDate}</td>
                        <td>
                          <span className={isExpired ? 'badge-expired' : 'badge-active'}>
                            {isExpired ? 'Hết hạn' : 'Đang hiển thị'}
                          </span>
                        </td>
                        <td>
                          <td>
                            <div className="action-buttons-group">
                              <button onClick={() => this.selectItem(item)} className="btn-edit">Sửa</button>
                              <button onClick={() => this.btnDeleteClick(item._id)} className="btn-delete">Xoá</button>
                            </div>
                          </td>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {showConfirm && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-title">Xác Nhận Thao Tác</div>
              <div className="modal-message">{confirmMsg}</div>
              <div className="modal-actions">
                <button 
                  className="modal-btn-confirm" 
                  onClick={() => {
                    this.setState({ showConfirm: false });
                    if (this.state.onConfirmCallback) this.state.onConfirmCallback();
                  }}
                >
                  Đồng ý
                </button>
                <button 
                  className="modal-btn-cancel" 
                  onClick={() => this.setState({ showConfirm: false })}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {showToast && (
          <div className="toast-top-left">
            <span className="toast-icon">✓</span>
            <span>{toastMsg}</span>
          </div>
        )}

      </div>
    );
  }
}

export default Voucher;