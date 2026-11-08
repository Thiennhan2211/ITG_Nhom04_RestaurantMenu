import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/ProductComponent.css';

class Product extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      products: [],
      categories: [],
      txtID: '',
      txtName: '',
      txtPrice: '',
      cmbCategory: '',
      cmbStatus: 'Active',
      imgProduct: '',
      isEdit: false,
      showConfirm: false,
      confirmMsg: '',
      onConfirmCallback: null,
      showToast: false,
      toastMsg: ''
    };
  }

  componentDidMount() {
    this.apiGetCategories();
    this.apiGetProducts();
  }

  triggerToast = (msg) => {
    this.setState({ showToast: true, toastMsg: msg });
    setTimeout(() => {
      this.setState({ showToast: false });
    }, 3000);
  };

  apiGetCategories = () => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.get('/api/admin/categories', config).then((res) => {
      this.setState({
        categories: res.data,
        cmbCategory: res.data.length > 0 ? res.data[0]._id : ''
      });
    });
  };

  apiGetProducts = () => {
    const config = { headers: { 'x-access-token': this.context.token } };
    axios.get('/api/admin/products', config).then((res) => {
      this.setState({ products: res.data });
    });
  };

  // Hàm xử lý file chung cho cả bấm chọn và kéo thả
  processFile = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        this.setState({ imgProduct: evt.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  previewImage = (e) => {
    this.processFile(e.target.files[0]);
  };

  // Xử lý sự kiện kéo thả ảnh
  handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  };

  handleDragOver = (e) => {
    e.preventDefault();
  };

  selectItem = (item) => {
    this.setState({
      txtID: item._id,
      txtName: item.name,
      txtPrice: item.price,
      cmbCategory: item.category ? item.category._id : '',
      cmbStatus: item.status || 'Active',
      imgProduct: item.image || '',
      isEdit: true
    });
  };

  resetForm = () => {
    this.setState({
      txtID: '',
      txtName: '',
      txtPrice: '',
      cmbCategory: this.state.categories.length > 0 ? this.state.categories[0]._id : '',
      cmbStatus: 'Active',
      imgProduct: '',
      isEdit: false
    });
  };

  btnSaveClick = (e) => {
    e.preventDefault();
    const { txtID, txtName, txtPrice, cmbCategory, cmbStatus, imgProduct, isEdit } = this.state;

    if (!txtName || !txtPrice || !cmbCategory) {
      this.triggerToast('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }

    const prod = {
      name: txtName,
      price: parseInt(txtPrice),
      category: cmbCategory,
      status: cmbStatus,
      image: imgProduct
    };

    const config = { headers: { 'x-access-token': this.context.token } };

    if (isEdit) {
      axios.put(`/api/admin/products/${txtID}`, prod, config).then((res) => {
        if (res.data) {
          this.triggerToast('Cập nhật món ăn thành công!');
          this.apiGetProducts();
          this.resetForm();
        }
      });
    } else {
      axios.post('/api/admin/products', prod, config).then((res) => {
        if (res.data) {
          this.triggerToast('Thêm món ăn mới thành công!');
          this.apiGetProducts();
          this.resetForm();
        }
      });
    }
  };

  btnDeleteClick = (id) => {
    this.setState({
      showConfirm: true,
      confirmMsg: 'Bạn có chắc chắn muốn xóa món ăn này không?',
      onConfirmCallback: () => {
        const config = { headers: { 'x-access-token': this.context.token } };
        axios.delete(`/api/admin/products/${id}`, config).then((res) => {
          if (res.data.success) {
            this.triggerToast('Đã xóa món ăn thành công!');
            this.apiGetProducts();
            this.resetForm();
          }
        });
      }
    });
  };

  render() {
    const { 
      products, categories, txtName, txtPrice, cmbCategory, cmbStatus, imgProduct, isEdit,
      showConfirm, confirmMsg, showToast, toastMsg 
    } = this.state;

    return (
      <div className="product-container">
        <h3 className="product-title">QUẢN LÝ THỰC ĐƠN & MÓN ĂN</h3>
        <div className="product-layout">
          
          {/* CỘT TRÁI: Form Chi tiết / Thêm mới sản phẩm */}
          <div className="product-form-card">
            <h4 style={{ marginBottom: '20px', color: '#4A2E2B' }}>
              {isEdit ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Ăn Mới'}
            </h4>
            <form>
              <div className="form-group">
                <label className="form-label">Tên Món Ăn *</label>
                <input
                  type="text"
                  className="form-input"
                  value={txtName}
                  onChange={(e) => this.setState({ txtName: e.target.value })}
                  placeholder="VD: Phở bò, Trà sữa..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá Bán (VNĐ) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={txtPrice}
                  onChange={(e) => this.setState({ txtPrice: e.target.value })}
                  placeholder="VD: 45000"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Danh Mục Món *</label>
                <select
                  className="form-select"
                  value={cmbCategory}
                  onChange={(e) => this.setState({ cmbCategory: e.target.value })}
                >
                  {categories.map((cate) => (
                    <option key={cate._id} value={cate._id}>{cate.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng Thái Món</label>
                <select
                  className="form-select"
                  value={cmbStatus}
                  onChange={(e) => this.setState({ cmbStatus: e.target.value })}
                >
                  <option value="Active">Còn món (Active)</option>
                  <option value="Inactive">Hết món (Inactive)</option>
                </select>
              </div>

              {/* Khung chọn ảnh hỗ trợ cả click và kéo thả (Drag and Drop) */}
              <div className="form-group">
                <label className="form-label">Hình Ảnh Món Ăn</label>
                <div 
                  className="image-upload-box" 
                  onClick={() => this.fileInputRef.click()}
                  onDragOver={this.handleDragOver}
                  onDrop={this.handleDrop}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={ref => this.fileInputRef = ref} 
                    onChange={this.previewImage} 
                    style={{ display: 'none' }} 
                  />
                  {imgProduct ? (
                    <div className="preview-container">
                      <img src={imgProduct} alt="Preview" className="preview-img" />
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                       Nhấn vào đây hoặc kéo thả ảnh vào khung
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" onClick={this.btnSaveClick} className="btn-submit">
                  {isEdit ? 'CẬP NHẬT MÓN' : 'LƯU MÓN ĂN'}
                </button>
                {isEdit && (
                  <button type="button" onClick={this.resetForm} className="btn-cancel">
                    HỦY
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* CỘT PHẢI: Bảng danh sách sản phẩm */}
          <div className="product-list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#4A2E2B' }}>Danh Sách Món Ăn</h4>
              <span style={{ fontSize: '13px', color: '#666' }}>Tổng số: {products.length} món</span>
            </div>

            <table className="product-table">
              <thead>
                <tr>
                  <th>Hình Ảnh</th>
                  <th>Tên Món</th>
                  <th>Giá Bán</th>
                  <th>Danh Mục</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="table-img" />
                      ) : (
                        <div style={{ width: '45px', height: '45px', backgroundColor: '#EEE', borderRadius: '8px' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ color: '#C85A32', fontWeight: 'bold' }}>
                      {item.price ? item.price.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td>{item.category ? item.category.name : 'N/A'}</td>
                    <td>
                      <span className={item.status === 'Active' ? 'badge-active' : 'badge-inactive'}>
                        {item.status === 'Active' ? 'Còn món' : 'Hết món'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => this.selectItem(item)} className="btn-edit">
                        Sửa
                      </button>
                      <button onClick={() => this.btnDeleteClick(item._id)} className="btn-delete">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* CUSTOM CONFIRM MODAL (Ở GIỮA MÀN HÌNH) */}
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

        {/* TOAST THÀNH CÔNG (Ở GÓC TRÊN BÊN TRÁI) */}
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

export default Product;