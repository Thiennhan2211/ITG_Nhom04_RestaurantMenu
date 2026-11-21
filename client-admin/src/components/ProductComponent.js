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
      txtCostPrice: '',
      cmbCategory: '',
      cmbStatus: 'Active',
      imgProduct: '',
      imageFile: null,
      toppings: [],
      newToppingName: '',
      newToppingPrice: '',
      isSaving: false,
      isUploadingImage: false,
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

  isDrinkCategory = (categoryId = this.state.cmbCategory) => {
    const categoryName = String(this.state.categories.find(category => category._id === categoryId)?.name || '').toLowerCase();
    return ['uống', 'nước', 'drink', 'beverage'].some(keyword => categoryName.includes(keyword));
  };

  addTopping = () => {
    const name = this.state.newToppingName.trim();
    const price = Number(this.state.newToppingPrice);
    if (!name || this.state.newToppingPrice === '' || !Number.isInteger(price) || price < 0) {
      this.triggerToast('Nhập tên topping và giá hợp lệ.');
      return;
    }
    if (this.state.toppings.some(topping => topping.name.trim().toLowerCase() === name.toLowerCase())) {
      this.triggerToast('Tên topping này đã có trong món.');
      return;
    }
    this.setState(state => ({
      toppings: [...state.toppings, { name, price }],
      newToppingName: '',
      newToppingPrice: ''
    }));
  };

  removeTopping = (index) => this.setState(state => ({
    toppings: state.toppings.filter((_, toppingIndex) => toppingIndex !== index)
  }));

  changeCategory = (event) => {
    const cmbCategory = event.target.value;
    this.setState({
      cmbCategory,
      ...(this.isDrinkCategory(cmbCategory) ? { toppings: [], newToppingName: '', newToppingPrice: '' } : {})
    });
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
    if (!file) return;
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      this.triggerToast('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.triggerToast('Ảnh sản phẩm phải nhỏ hơn 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => this.setState({ imgProduct: evt.target.result, imageFile: file });
    reader.onerror = () => this.triggerToast('Không thể đọc tệp ảnh đã chọn.');
    reader.readAsDataURL(file);
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
      txtCostPrice: item.costPrice ?? 0,
      cmbCategory: item.category ? item.category._id : '',
      cmbStatus: item.status || 'Active',
      imgProduct: item.image || '',
      imageFile: null,
      toppings: Array.isArray(item.toppings) ? item.toppings.map(topping => ({ name: topping.name, price: Number(topping.price) })) : [],
      newToppingName: '',
      newToppingPrice: '',
      isEdit: true
    });
  };

  resetForm = () => {
    this.setState({
      txtID: '',
      txtName: '',
      txtPrice: '',
      txtCostPrice: '',
      cmbCategory: this.state.categories.length > 0 ? this.state.categories[0]._id : '',
      cmbStatus: 'Active',
      imgProduct: '',
      imageFile: null,
      toppings: [],
      newToppingName: '',
      newToppingPrice: '',
      isEdit: false
    });
  };

  btnSaveClick = async (e) => {
    e.preventDefault();
    const { txtID, txtName, txtPrice, txtCostPrice, cmbCategory, cmbStatus, imgProduct, imageFile, toppings, newToppingName, newToppingPrice, isEdit } = this.state;

    if (!txtName.trim() || txtPrice === '' || txtCostPrice === '' || !cmbCategory ||
        !Number.isFinite(Number(txtPrice)) || !Number.isFinite(Number(txtCostPrice)) ||
        Number(txtPrice) < 0 || Number(txtCostPrice) < 0) {
      this.triggerToast('Vui lòng nhập tên món, giá bán, giá vốn và danh mục hợp lệ.');
      return;
    }

    if (!this.isDrinkCategory(cmbCategory) && (newToppingName.trim() || newToppingPrice !== '')) {
      this.triggerToast('Bấm “Thêm” để đưa topping mới vào danh sách trước khi lưu món.');
      return;
    }
    const configuredToppings = this.isDrinkCategory(cmbCategory) ? [] : toppings.map(topping => ({
      name: String(topping.name || '').trim(),
      price: Number(topping.price)
    }));
    if (configuredToppings.some(topping => !topping.name || !Number.isInteger(topping.price) || topping.price < 0) ||
        new Set(configuredToppings.map(topping => topping.name.toLowerCase())).size !== configuredToppings.length) {
      this.triggerToast('Vui lòng kiểm tra tên và giá topping của món.');
      return;
    }

    const config = { headers: { 'x-access-token': this.context.token } };
    this.setState({ isSaving: true });
    try {
      let imageUrl = imgProduct;
      let uploadFile = imageFile;
      if (!uploadFile && typeof imgProduct === 'string' && imgProduct.startsWith('data:image/')) {
        const imageBlob = await fetch(imgProduct).then(response => response.blob());
        uploadFile = new File([imageBlob], 'product-image', { type: imageBlob.type || 'image/jpeg' });
      }
      if (uploadFile) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(uploadFile.type)) {
          throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
        }
        if (uploadFile.size > 8 * 1024 * 1024) {
          throw new Error('Ảnh sản phẩm phải nhỏ hơn 8 MB.');
        }
        this.setState({ isUploadingImage: true });
        const signatureResponse = await axios.post('/api/admin/products/upload-signature', {}, config);
        const uploadData = signatureResponse.data;
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('api_key', uploadData.apiKey);
        formData.append('timestamp', String(uploadData.timestamp));
        formData.append('asset_folder', uploadData.assetFolder);
        formData.append('allowed_formats', uploadData.allowedFormats);
        formData.append('signature', uploadData.signature);
        const cloudinaryResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/image/upload`,
          formData
        );
        imageUrl = cloudinaryResponse.data?.secure_url;
        if (!imageUrl) throw new Error('Cloudinary không trả về địa chỉ ảnh.');
      }

      const product = {
        name: txtName.trim(),
        price: Number(txtPrice),
        costPrice: Number(txtCostPrice),
        category: cmbCategory,
        status: cmbStatus,
        image: imageUrl || '',
        toppings: configuredToppings
      };
      if (isEdit) {
        await axios.put(`/api/admin/products/${txtID}`, product, config);
        this.triggerToast('Cập nhật món ăn thành công!');
      } else {
        await axios.post('/api/admin/products', product, config);
        this.triggerToast('Thêm món ăn mới thành công!');
      }
      this.apiGetProducts();
      this.resetForm();
    } catch (error) {
      const responseMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      if (/invalid cloud_name/i.test(responseMessage || '')) {
        this.triggerToast('Cloudinary báo sai Cloud name. Hãy kiểm tra CLOUDINARY_URL hoặc Cloud name trong Render có đúng tên tài khoản ở Cloudinary Console rồi deploy lại.');
      } else {
        this.triggerToast(responseMessage || 'Không thể lưu món ăn. Vui lòng thử lại.');
      }
    } finally {
      this.setState({ isSaving: false, isUploadingImage: false });
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
      products, categories, txtName, txtPrice, txtCostPrice, cmbCategory, cmbStatus, imgProduct, toppings, newToppingName, newToppingPrice, isEdit, isSaving, isUploadingImage,
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
                <label className="form-label">Giá Vốn (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input"
                  value={txtCostPrice}
                  onChange={(e) => this.setState({ txtCostPrice: e.target.value })}
                  placeholder="VD: 25000"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Danh Mục Món *</label>
                <select
                  className="form-select"
                  value={cmbCategory}
                  onChange={this.changeCategory}
                >
                  {categories.map((cate) => (
                    <option key={cate._id} value={cate._id}>{cate.name}</option>
                  ))}
                </select>
              </div>

              {!this.isDrinkCategory(cmbCategory) ? (
                <div className="form-group topping-config">
                  <label className="form-label">Topping riêng cho món</label>
                  <div className="topping-config-inputs">
                    <input
                      className="form-input"
                      value={newToppingName}
                      onChange={(event) => this.setState({ newToppingName: event.target.value })}
                      placeholder="Tên topping"
                      maxLength="60"
                    />
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="500"
                      value={newToppingPrice}
                      onChange={(event) => this.setState({ newToppingPrice: event.target.value })}
                      placeholder="Giá thêm"
                    />
                    <button type="button" className="topping-add-button" onClick={this.addTopping}>Thêm</button>
                  </div>
                  {toppings.length > 0 ? (
                    <div className="topping-config-list">
                      {toppings.map((topping, index) => (
                        <div className="topping-config-item" key={`${topping.name}-${index}`}>
                          <span>{topping.name} · {Number(topping.price).toLocaleString('vi-VN')} đ</span>
                          <button type="button" onClick={() => this.removeTopping(index)} aria-label={`Xóa topping ${topping.name}`}>Xóa</button>
                        </div>
                      ))}
                    </div>
                  ) : <small className="topping-config-hint">Món này chưa có topping thêm.</small>}
                </div>
              ) : (
                <div className="drink-config-hint">Danh mục đồ uống dùng tuỳ chọn đá và đường, không dùng topping.</div>
              )}

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
                  onClick={(event) => { if (event.target.tagName !== 'INPUT') this.fileInputRef?.click(); }}
                  onDragOver={this.handleDragOver}
                  onDrop={this.handleDrop}
                >
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp"
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
                <button type="submit" onClick={this.btnSaveClick} className="btn-submit" disabled={isSaving}>
                  {isUploadingImage ? 'ĐANG TẢI ẢNH...' : isSaving ? 'ĐANG LƯU...' : isEdit ? 'CẬP NHẬT MÓN' : 'LƯU MÓN ĂN'}
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
                  <th>Giá Vốn</th>
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
                    <td style={{ color: '#6c5b53' }}>
                      {Number(item.costPrice || 0).toLocaleString('vi-VN')} đ
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
