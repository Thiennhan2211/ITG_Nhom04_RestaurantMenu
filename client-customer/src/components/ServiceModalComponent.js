import React, { Component } from 'react';
import '../css/ServiceModalComponent.css';

class ServiceModalComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      requestType: 'Yêu cầu thanh toán', // Mặc định chọn yêu cầu thanh toán
      customNote: ''
    };
  }

  handleSubmit = () => {
    const { requestType, customNote } = this.state;
    const finalContent = requestType === 'Hỗ trợ khác' ? (customNote || 'Hỗ trợ khác') : requestType;

    // Gửi thông tin yêu cầu về component cha hoặc gọi API thông báo nhân viên
    if (this.props.onSubmitService) {
      this.props.onSubmitService(finalContent);
    }
  }

  render() {
    const { requestType, customNote } = this.state;
    const { onClose } = this.props;

    return (
      <div className="service-modal-overlay">
        <div className="service-modal-card">
          <div className="service-modal-header">
            <h3>Gọi phục vụ</h3>
            <button className="btn-close-service" onClick={onClose}>✕</button>
          </div>

          <div className="service-options">
            <label className="service-option-item">
              <input 
                type="radio" 
                name="serviceType" 
                checked={requestType === 'Yêu cầu thanh toán'}
                onChange={() => this.setState({ requestType: 'Yêu cầu thanh toán' })}
              />
              <span>Yêu cầu thanh toán</span>
            </label>

            <label className="service-option-item">
              <input 
                type="radio" 
                name="serviceType" 
                checked={requestType === 'Hỗ trợ khác'}
                onChange={() => this.setState({ requestType: 'Hỗ trợ khác' })}
              />
              <span>Hỗ trợ khác</span>
            </label>
          </div>

          {/* Hiển thị ô nhập ghi chú nếu chọn Hỗ trợ khác hoặc muốn nhập thêm */}
          {requestType === 'Hỗ trợ khác' && (
            <textarea 
              className="service-note-input"
              placeholder="Bạn cần hỗ trợ gì ?"
              value={customNote}
              onChange={(e) => this.setState({ customNote: e.target.value })}
            />
          )}

          <button className="btn-submit-service" onClick={this.handleSubmit}>
            Gọi nhân viên
          </button>
        </div>
      </div>
    );
  }
}

export default ServiceModalComponent;