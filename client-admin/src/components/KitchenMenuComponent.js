import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/KitchenMenuComponent.css';

class KitchenMenuComponent extends Component {
  static contextType = MyContext;

  state = {
    products: [],
    updatingIds: [],
    error: ''
  };

  componentDidMount() {
    this.fetchProducts();
  }

  fetchProducts = () => {
    axios.get('/api/admin/products', {
      headers: { 'x-access-token': this.context.token }
    }).then((res) => {
      this.setState({ products: Array.isArray(res.data) ? res.data : [], error: '' });
    }).catch((error) => {
      this.setState({ error: error.response?.data?.message || 'Không thể tải danh sách món ăn.' });
    });
  };

  toggleAvailability = (product) => {
    const status = product.status === 'Active' ? 'Inactive' : 'Active';
    this.setState(({ updatingIds }) => ({ updatingIds: [...updatingIds, product._id], error: '' }));

    axios.put(`/api/admin/products/${product._id}/availability`, { status }, {
      headers: { 'x-access-token': this.context.token }
    }).then((res) => {
      this.setState(({ products, updatingIds }) => ({
        products: products.map(item => item._id === product._id ? res.data : item),
        updatingIds: updatingIds.filter(id => id !== product._id)
      }));
    }).catch((error) => {
      this.setState(({ updatingIds }) => ({
        updatingIds: updatingIds.filter(id => id !== product._id),
        error: error.response?.data?.message || 'Không thể cập nhật trạng thái món.'
      }));
    });
  };

  render() {
    const { products, updatingIds, error } = this.state;

    return (
      <div className="kitchen-menu-page">
        <div className="kitchen-menu-heading">
          <div>
            <h2>Quản lý tình trạng món</h2>
            <p>Tắt món khi hết hàng để khách không thể gọi món đó.</p>
          </div>
          <button className="kitchen-menu-refresh" type="button" onClick={this.fetchProducts}>
            Làm mới
          </button>
        </div>

        {error && <div className="kitchen-menu-error" role="alert">{error}</div>}

        <div className="kitchen-menu-list">
          {products.map((product) => {
            const available = product.status === 'Active';
            const updating = updatingIds.includes(product._id);
            return (
              <article className="kitchen-menu-item" key={product._id}>
                {product.image ? (
                  <img className="kitchen-menu-image" src={product.image} alt="" />
                ) : (
                  <div className="kitchen-menu-image kitchen-menu-image-empty" aria-hidden="true">Món</div>
                )}
                <div className="kitchen-menu-info">
                  <h3>{product.name}</h3>
                  <span>{product.category?.name || 'Chưa phân loại'}</span>
                </div>
                <span className={`kitchen-menu-status ${available ? 'is-available' : 'is-unavailable'}`}>
                  {available ? 'Còn món' : 'Hết món'}
                </span>
                <button
                  type="button"
                  className={`availability-toggle ${available ? 'is-on' : 'is-off'}`}
                  role="switch"
                  aria-checked={available}
                  aria-label={`${available ? 'Tắt' : 'Bật'} món ${product.name}`}
                  disabled={updating}
                  onClick={() => this.toggleAvailability(product)}
                >
                  <span className="availability-toggle-knob" />
                  <span className="availability-toggle-label">{available ? 'Đang bán' : 'Đã tắt'}</span>
                </button>
              </article>
            );
          })}
          {products.length === 0 && !error && <p className="kitchen-menu-empty">Chưa có món ăn nào.</p>}
        </div>
      </div>
    );
  }
}

export default KitchenMenuComponent;
