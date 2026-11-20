import React, { Component } from 'react';
import axios from 'axios';
import MyContext from '../contexts/MyContext';
import '../css/ReportComponent.css';

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthKey = (date) => dateKey(date).slice(0, 7);

class ReportComponent extends Component {
  static contextType = MyContext;

  constructor(props) {
    super(props);
    const today = dateKey(new Date());
    this.state = {
      periodType: 'day',
      fromDate: today,
      toDate: today,
      fromMonth: monthKey(new Date()),
      toMonth: monthKey(new Date()),
      stats: { revenue: 0, cost: 0, profit: 0, orders: 0, customers: 0, products: 0 },
      chartData: [],
      tableRequests: [],
      topProducts: [],
      showToast: false,
      toastMsg: '',
      error: '',
      isLoading: false
    };
  }

  componentDidMount() {
    this.apiGetReports();
  }

  apiGetReports = async () => {
    const { periodType } = this.state;
    const fromDate = periodType === 'month' ? this.state.fromMonth : this.state.fromDate;
    const toDate = periodType === 'month' ? this.state.toMonth : this.state.toDate;
    if (!fromDate || !toDate || fromDate > toDate) {
      this.setState({ error: periodType === 'month'
        ? 'Tháng bắt đầu phải nhỏ hơn hoặc bằng tháng kết thúc.'
        : 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' });
      return false;
    }
    const config = {
      headers: { 'x-access-token': this.context.token },
      params: { periodType, fromDate, toDate }
    };
    this.setState({ isLoading: true, error: '' });
    try {
      const res = await axios.get('/api/admin/reports', config);
      if (res.data) {
        if (res.data.reportVersion !== 4 || res.data.period?.periodType !== periodType ||
            res.data.period?.fromDate !== fromDate || res.data.period?.toDate !== toDate) {
          this.setState({
            stats: { revenue: 0, cost: 0, profit: 0, orders: 0, customers: 0, products: 0 },
            chartData: [],
            tableRequests: [],
            topProducts: [],
            error: 'API báo cáo đang chạy phiên bản cũ hoặc chưa nhận khoảng ngày. Hãy khởi động lại backend hoặc triển khai lại Render.'
          });
          return false;
        }
        const chartData = Array.isArray(res.data.chartData) ? res.data.chartData : [];
        const revenue = chartData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
        const cost = chartData.reduce((sum, item) => sum + Number(item.cost || 0), 0);
        this.setState({
          stats: {
            revenue,
            cost,
            profit: revenue - cost,
            orders: Number(res.data.orders || 0),
            customers: Number(res.data.customers || 0),
            products: Number(res.data.products || 0)
          },
          chartData,
          tableRequests: Array.isArray(res.data.tableRequests) ? res.data.tableRequests : [],
          topProducts: Array.isArray(res.data.topProducts) ? res.data.topProducts : []
        });
      }
      return true;
    } catch (error) {
      this.setState({
        stats: { revenue: 0, cost: 0, profit: 0, orders: 0, customers: 0, products: 0 },
        chartData: [],
        tableRequests: [],
        topProducts: [],
        error: error.response?.data?.message || 'Không thể tải báo cáo. Vui lòng thử lại.'
      });
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  };

  btnFilterClick = async (e) => {
    e.preventDefault();
    const success = await this.apiGetReports();
    if (success) {
      this.setState({ showToast: true, toastMsg: this.state.periodType === 'month'
        ? 'Đã cập nhật báo cáo theo tháng.'
        : 'Đã cập nhật báo cáo theo ngày.' });
      setTimeout(() => this.setState({ showToast: false }), 3000);
    }
  };

  render() {
    const { periodType, fromDate, toDate, fromMonth, toMonth, stats, chartData, tableRequests, topProducts, showToast, toastMsg, error, isLoading } = this.state;
    const safeChartData = chartData.length ? chartData : [{ _id: 'Chưa có dữ liệu', revenue: 0, cost: 0 }];
    const chartWidth = Math.max(500, safeChartData.length * 76);
    const maxValue = Math.max(...safeChartData.flatMap((item) => [
      Math.abs(Number(item.revenue || 0)),
      Math.abs(Number(item.cost || 0)),
      Math.abs(Number(item.profit ?? (Number(item.revenue || 0) - Number(item.cost || 0))))
    ]), 1);
    const getPoint = (item, index, key) => {
      const x = 38 + (safeChartData.length === 1 ? (chartWidth - 76) / 2 : (index / (safeChartData.length - 1)) * (chartWidth - 76));
      const y = 90 - (Number(item[key] || 0) / maxValue) * 70;
      return `${x},${y}`;
    };
    const revenuePoints = safeChartData.map((item, index) => getPoint(item, index, 'revenue')).join(' ');
    const costPoints = safeChartData.map((item, index) => getPoint(item, index, 'cost')).join(' ');
    const profitPoints = safeChartData.map((item, index) => getPoint(item, index, 'profit')).join(' ');
    const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

    return (
      <div className="report-container">
        <h3 className="report-title">QUẢN LÝ CỬA HÀNG</h3>

        <form className="filter-bar" onSubmit={this.btnFilterClick}>
          <label htmlFor="report-period-type"><b>Xem theo:</b></label>
          <select
            id="report-period-type"
            className="filter-input"
            value={periodType}
            onChange={(e) => this.setState({ periodType: e.target.value })}
          >
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
          </select>
          {periodType === 'month' && (
            <>
              <label htmlFor="report-from-month"><b>Từ tháng:</b></label>
              <input
                id="report-from-month"
                type="month"
                className="filter-input"
                value={fromMonth}
                max={toMonth || undefined}
                onChange={(e) => this.setState({ fromMonth: e.target.value })}
              />
              <label htmlFor="report-to-month"><b>Đến tháng:</b></label>
              <input
                id="report-to-month"
                type="month"
                className="filter-input"
                value={toMonth}
                min={fromMonth || undefined}
                onChange={(e) => this.setState({ toMonth: e.target.value })}
              />
            </>
          )}
          <span style={{ display: periodType === 'day' ? 'contents' : 'none' }}>
          <label htmlFor="report-from-date"><b>Từ ngày:</b></label>
          <input
            id="report-from-date"
            type="date"
            className="filter-input"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => this.setState({ fromDate: e.target.value })}
          />
          <label htmlFor="report-to-date"><b>Đến ngày:</b></label>
          <input
            id="report-to-date"
            type="date"
            className="filter-input"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => this.setState({ toDate: e.target.value })}
          />
          </span>
          <button className="filter-btn" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang lọc...' : 'Lọc dữ liệu'}
          </button>
        </form>
        {error && <div className="report-filter-error" role="alert">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Doanh thu</div>
            <div className="stat-value" style={{ color: '#2E7D32' }}>{formatMoney(stats.revenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Giá vốn</div>
            <div className="stat-value" style={{ color: '#D07825' }}>{formatMoney(stats.cost)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Lãi / lỗ sau giá vốn</div>
            <div className="stat-value" style={{ color: stats.profit >= 0 ? '#1E88E5' : '#C62828' }}>{formatMoney(stats.profit)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Số đơn đã thanh toán</div>
            <div className="stat-value" style={{ color: '#1E88E5' }}>{stats.orders} đơn</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Số khách hàng</div>
            <div className="stat-value" style={{ color: '#C85A32' }}>{stats.customers} khách</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Sản phẩm trong thực đơn</div>
            <div className="stat-value" style={{ color: '#6A1B9A' }}>{stats.products} món</div>
          </div>
        </div>

        <div className="content-row">
          <div className="chart-box">
            <h4 style={{ marginBottom: '8px' }}>Doanh thu và giá vốn theo {periodType === 'month' ? 'tháng' : 'ngày'}</h4>
            <div className="report-chart-legend">
              <span><i className="legend-revenue" /> Doanh thu</span>
              <span><i className="legend-cost" /> Giá vốn</span>
              <span><i className="legend-profit" /> Lợi nhuận</span>
            </div>
            <div className="report-chart-scroll">
              <svg viewBox={`0 0 ${chartWidth} 190`} style={{ width: `${chartWidth}px`, height: '190px' }} role="img" aria-label="Biểu đồ doanh thu, giá vốn và lợi nhuận theo ngày">
                <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="#e9e2da" strokeDasharray="4 5" />
                <polyline fill="none" stroke="#C85A32" strokeWidth="3" points={revenuePoints} />
                <polyline fill="none" stroke="#D79A43" strokeWidth="3" points={costPoints} />
                <polyline fill="none" stroke="#2E7D32" strokeWidth="3" points={profitPoints} />
                {safeChartData.map((item, index) => {
                  const x = 38 + (safeChartData.length === 1 ? (chartWidth - 76) / 2 : (index / (safeChartData.length - 1)) * (chartWidth - 76));
                  const revenueY = 90 - (Number(item.revenue || 0) / maxValue) * 70;
                  const costY = 90 - (Number(item.cost || 0) / maxValue) * 70;
                  const profitY = 90 - (Number(item.profit ?? (Number(item.revenue || 0) - Number(item.cost || 0))) / maxValue) * 70;
                  return (
                    <g key={item._id || index}>
                      <circle cx={x} cy={revenueY} r="4" fill="#C85A32" />
                      <circle cx={x} cy={costY} r="4" fill="#D79A43" />
                      <circle cx={x} cy={profitY} r="4" fill="#2E7D32" />
                      <text x={x} y="183" fontSize="11" textAnchor="middle" fill="#666">{item._id}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="notification-box">
            <h4 style={{ marginBottom: '15px', color: '#4A2E2B' }}>Đơn hàng đang cần duyệt</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              {!tableRequests.length ? (
                <div style={{ color: '#888', fontStyle: 'italic' }}>Không có đơn hàng chờ duyệt trong khoảng thời gian đã chọn.</div>
              ) : (
                tableRequests.map((req) => (
                  <div key={req._id} style={{ padding: '10px', backgroundColor: '#FFF8E1', borderRadius: '6px', marginBottom: '8px' }}>
                    <div><b>Bàn: {req.tableNo || 'N/A'}</b> - {req.customerName || 'Khách'}</div>
                    <div style={{ color: '#C85A32', fontWeight: 'bold' }}>{formatMoney(req.total)}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{new Date(req.cdate).toLocaleDateString('vi-VN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="top-products-box">
          <h4 style={{ marginBottom: '15px' }}>Sản phẩm bán chạy trong {periodType === 'month' ? 'các tháng' : 'khoảng ngày'} đã chọn</h4>
          <div className="top-products-grid">
            {!topProducts.length ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>Chưa có dữ liệu sản phẩm bán chạy.</div>
            ) : (
              topProducts.map((item, index) => (
                <div key={item._id || index} className="product-item">
                  {item.image ? <img src={item.image} alt={item.name} className="product-img" /> : <div className="product-placeholder">#{index + 1}</div>}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                    <div style={{ color: '#C85A32', fontSize: '13px', fontWeight: 'bold' }}>
                      {Number(item.totalSold || 0)} đã bán · {formatMoney(item.price)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showToast && <div className="toast-popup"><span className="toast-icon">✓</span><span>{toastMsg}</span></div>}
      </div>
    );
  }
}

export default ReportComponent;
