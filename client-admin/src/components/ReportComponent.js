import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/ReportComponent.css';

class ReportComponent extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    this.state = {
      fromMonth: '2025-11',
      toMonth: '2026-04',
      stats: { revenue: 0, orders: 0, customers: 0, products: 0 },
      chartData: [],
      tableRequests: [],
      topProducts: [],
      showToast: false,
      toastMsg: ''
    };
  }

  componentDidMount() {
    this.apiGetReports();
  }

  apiGetReports = () => {
    const { fromMonth, toMonth } = this.state;
    const config = { 
      headers: { 'x-access-token': this.context.token },
      params: { fromMonth, toMonth }
    };
    axios.get('/api/admin/reports', config).then((res) => {
      if (res.data) {
        this.setState({
          stats: {
            revenue: res.data.revenue || 0,
            orders: res.data.orders || 0,
            customers: res.data.customers || 0,
            products: res.data.products || 0
          },
          chartData: res.data.chartData || [],
          tableRequests: res.data.tableRequests || [],
          topProducts: res.data.topProducts || []
        });
      }
    });
  };

  btnFilterClick = (e) => {
    e.preventDefault();
    this.apiGetReports();
    this.setState({ showToast: true, toastMsg: 'Lọc dữ liệu thành công!' });
    setTimeout(() => {
      this.setState({ showToast: false });
    }, 3000);
  };

  render() {
    const { fromMonth, toMonth, stats, chartData, tableRequests, topProducts, showToast, toastMsg } = this.state;
    
    const safeChartData = Array.isArray(chartData) && chartData.length > 0 ? chartData : [
      { _id: 'Tháng 11/2025', revenue: 0 },
      { _id: 'Tháng 12/2025', revenue: 0 },
      { _id: 'Tháng 1/2026', revenue: 0 },
      { _id: 'Tháng 2/2026', revenue: 0 },
      { _id: 'Tháng 3/2026', revenue: 0 },
      { _id: 'Tháng 4/2026', revenue: 0 }
    ];

    const maxRevenue = Math.max(...safeChartData.map(item => item.revenue), 1000000);
    const points = safeChartData.map((item, index) => {
      const x = (index / (safeChartData.length - 1 || 1)) * 500;
      const y = 160 - (item.revenue / maxRevenue) * 130;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="report-container">
        <h3 className="report-title">QUẢN LÝ CỬA HÀNG</h3>

        {/* 1. Bộ lọc ở bên trái */}
        <div className="filter-bar">
          <span><b>Từ tháng:</b></span>
          <input
            type="month"
            className="filter-input"
            value={fromMonth}
            onChange={(e) => this.setState({ fromMonth: e.target.value })}
          />
          <span><b>Đến tháng:</b></span>
          <input
            type="month"
            className="filter-input"
            value={toMonth}
            onChange={(e) => this.setState({ toMonth: e.target.value })}
          />
          <button className="filter-btn" onClick={this.btnFilterClick}>
            Lọc dữ liệu
          </button>
        </div>

        {/* 2. Thẻ thống kê tổng quan */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Doanh thu</div>
            <div className="stat-value" style={{ color: '#2E7D32' }}>
              {(stats.revenue || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Số đơn hàng</div>
            <div className="stat-value" style={{ color: '#1E88E5' }}>{stats.orders || 0} đơn</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Số khách hàng</div>
            <div className="stat-value" style={{ color: '#C85A32' }}>{stats.customers || 0} khách</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Số sản phẩm</div>
            <div className="stat-value" style={{ color: '#6A1B9A' }}>{stats.products || 0} món</div>
          </div>
        </div>

        {/* 3. Biểu đồ đường & Đơn hàng cần duyệt */}
        <div className="content-row">
          <div className="chart-box">
            <h4 style={{ marginBottom: '15px' }}>Biểu đồ doanh thu theo tháng</h4>
            <div style={{ position: 'relative', height: '180px', width: '100%' }}>
              <svg viewBox="0 0 500 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <polyline
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="3"
                  points={points}
                />
                {safeChartData.map((item, index) => {
                  const x = (index / (safeChartData.length - 1 || 1)) * 500;
                  const y = 160 - (item.revenue / maxRevenue) * 130;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r="5" fill="#4A2E2B" />
                      <text x={x} y="178" fontSize="11" textAnchor="middle" fill="#666">{item._id}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="notification-box">
            <h4 style={{ marginBottom: '15px', color: '#4A2E2B' }}>Đơn hàng đang cần duyệt</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              {(!tableRequests || tableRequests.length === 0) ? (
                <div style={{ color: '#888', fontStyle: 'italic' }}>Không có đơn hàng chờ duyệt.</div>
              ) : (
                tableRequests.map((req) => (
                  <div key={req._id} style={{ padding: '10px', backgroundColor: '#FFF8E1', borderRadius: '6px', marginBottom: '8px' }}>
                    <div><b>Bàn: {req.tableNo || 'N/A'}</b> - {req.customerName || 'Khách'}</div>
                    <div style={{ color: '#C85A32', fontWeight: 'bold' }}>{(req.total || 0).toLocaleString('vi-VN')} đ</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{new Date(req.cdate).toLocaleDateString('vi-VN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 4. Top sản phẩm bán chạy */}
        <div className="top-products-box">
          <h4 style={{ marginBottom: '15px' }}>Sản phẩm bán chạy</h4>
          <div className="top-products-grid">
            {(!topProducts || topProducts.length === 0) ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>Chưa có dữ liệu sản phẩm bán chạy.</div>
            ) : (
              topProducts.map((item, index) => (
                <div key={item._id || index} className="product-item">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="product-img" />
                  ) : (
                    <div className="product-placeholder">#{index + 1}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                    <div style={{ color: '#C85A32', fontSize: '13px', fontWeight: 'bold' }}>
                      {(item.price || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showToast && (
          <div className="toast-popup">
            <span className="toast-icon">✓</span>
            <span>{toastMsg}</span>
          </div>
        )}

      </div>
    );
  }
}

ReportComponent.contextType = MyContext;

export default ReportComponent;