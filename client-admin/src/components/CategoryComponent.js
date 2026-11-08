import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/CategoryComponent.css';

class Category extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      categories: [],
      txtID: '',
      txtName: '',
      txtDescription: '',
      cmbStatus: 'Active',
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
  }

  triggerToast = (msg) => {
    this.setState({ showToast: true, toastMsg: msg });
    setTimeout(() => {
      this.setState({ showToast: false });
    }, 3000);
  };

  apiGetCategories() {
  const token = localStorage.getItem('token');
  
  axios.get('/api/admin/categories', {
    headers: { 'x-access-token': token }
  })
  .then((res) => {
    // Kiểm tra xem dữ liệu trả về có phải là mảng không trước khi setState
    if (Array.isArray(res.data)) {
      this.setState({ categories: res.data });
    } else {
      console.error("API không trả về mảng:", res.data);
      this.setState({ categories: [] }); // Gán mảng rỗng để không bị lỗi map
    }
  })
  .catch((err) => {
    console.error("Lỗi gọi API categories:", err);
    this.setState({ categories: [] });
  });
}

  selectItem = (item) => {
    this.setState({
      txtID: item._id,
      txtName: item.name,
      txtDescription: item.description || '',
      cmbStatus: item.status || 'Active',
      isEdit: true
    });
  };

  resetForm = () => {
    this.setState({
      txtID: '',
      txtName: '',
      txtDescription: '',
      cmbStatus: 'Active',
      isEdit: false
    });
  };

  btnSaveClick = (e) => {
    e.preventDefault();
    const { txtID, txtName, txtDescription, cmbStatus, isEdit } = this.state;
    if (!txtName) {
      this.triggerToast('Vui lòng nhập tên danh mục!');
      return;
    }

    const category = { 
      name: txtName, 
      description: txtDescription,
      status: cmbStatus 
    };
    const config = { headers: { 'x-access-token': this.context.token } };

    if (isEdit) {
      axios.put(`/api/admin/categories/${txtID}`, category, config).then((res) => {
        if (res.data) {
          this.triggerToast('Cập nhật danh mục thành công!');
          this.apiGetCategories();
          this.resetForm();
        }
      });
    } else {
      axios.post('/api/admin/categories', category, config).then((res) => {
        if (res.data) {
          this.triggerToast('Thêm danh mục mới thành công!');
          this.apiGetCategories();
          this.resetForm();
        }
      });
    }
  };

  btnDeleteClick = (id) => {
    this.setState({
      showConfirm: true,
      confirmMsg: 'Bạn có chắc chắn muốn xóa danh mục này không?',
      onConfirmCallback: () => {
        const config = { headers: { 'x-access-token': this.context.token } };
        axios.delete(`/api/admin/categories/${id}`, config).then((res) => {
          if (res.data.success) {
            this.triggerToast('Đã xóa danh mục thành công!');
            this.apiGetCategories();
            this.resetForm();
          }
        });
      }
    });
  };

  render() {
    const { 
      categories, txtName, txtDescription, cmbStatus, isEdit,
      showConfirm, confirmMsg, showToast, toastMsg 
    } = this.state;
    const listCategories = Array.isArray(categories) ? categories : [];
    return (
      <div className="category-container">
        <h3 className="category-title">QUẢN LÝ DANH MỤC THỰC ĐƠN</h3>
        <div className="category-layout">
          
          {/* Cột trái: Form thêm/sửa danh mục */}
          <div className="category-form-card">
            <h4 style={{ marginBottom: '20px', color: '#4A2E2B' }}>
              {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm Danh Mục Mới'}
            </h4>
            <form>
              <div className="form-group">
                <label className="form-label">Tên Danh Mục *</label>
                <input
                  type="text"
                  className="form-input"
                  value={txtName}
                  onChange={(e) => this.setState({ txtName: e.target.value })}
                  placeholder="Ví dụ: Lẩu & Nướng..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô Tả Danh Mục</label>
                <textarea
                  className="form-textarea"
                  value={txtDescription}
                  onChange={(e) => this.setState({ txtDescription: e.target.value })}
                  placeholder="Mô tả ngắn gọn về nhóm món ăn..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trạng Thái</label>
                <select
                  className="form-select"
                  value={cmbStatus}
                  onChange={(e) => this.setState({ cmbStatus: e.target.value })}
                >
                  <option value="Active">Đang hiển thị</option>
                  <option value="Inactive">Tạm ẩn</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" onClick={this.btnSaveClick} className="btn-submit">
                  {isEdit ? 'CẬP NHẬT' : 'Lưu Danh Mục'}
                </button>
                {isEdit && (
                  <button type="button" onClick={this.resetForm} className="btn-cancel">
                    HỦY
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Cột phải: Bảng danh sách danh mục */}
          <div className="category-table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#4A2E2B' }}>Danh Sách Danh Mục Hiện Có</h4>
              <span style={{ fontSize: '13px', color: '#666' }}>Tổng cộng: {categories.length} Danh mục</span>
            </div>

            <table className="category-table">
              <thead>
                <tr>
                  <th>Thứ Tự</th>
                  <th>Tên Danh Mục</th>
                  <th>Số Món</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item, index) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 'bold' }}>{item.autoIndex || (index + 1)}</td>
                    <td style={{ fontWeight: '600' }}>{item.name}</td>
                    <td>{item.productCount || 0} món</td>
                    <td>
                      <span className={item.status === 'Active' ? 'badge-active' : 'badge-inactive'}>
                        {item.status === 'Active' ? 'Đang hiển thị' : 'Tạm ẩn'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => this.selectItem(item)} className="btn-edit">
                        Sửa
                      </button>
                      <button onClick={() => this.btnDeleteClick(item._id)} className="btn-delete">
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* CUSTOM CONFIRM MODAL (GIỮA MÀN HÌNH) */}
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

        {/* TOAST THÀNH CÔNG (GÓC TRÊN BÊN TRÁI) */}
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

export default Category;