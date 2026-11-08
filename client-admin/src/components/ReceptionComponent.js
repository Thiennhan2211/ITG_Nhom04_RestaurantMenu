import React, { Component } from 'react';
import axios from 'axios';
import '../css/ReceptionComponent.css';

class ReceptionComponent extends Component {
  constructor(props) {
    super(props);
    
    // Khởi tạo sẵn 12 bàn mặc định
    const defaultTables = [];
    for (let i = 1; i <= 12; i++) {
      let tableNum = i < 10 ? `0${i}` : `${i}`;
      defaultTables.push({
        id: i,
        name: `Bàn ${tableNum}`,
        status: 'empty', 
        guests: 0,
        time: '',
        note: '4 ghế'
      });
    }

    this.state = {
      tables: defaultTables,
      reservations: [],
      stats: { total: 12, occupied: 0, reserved: 0, empty: 12 }
    };
  }

  componentDidMount() {
    this.fetchReceptionData();
    this.timerID = setInterval(() => this.fetchReceptionData(), 4000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  fetchReceptionData = () => {
    const token = localStorage.getItem('token');
    axios.get('/api/admin/tables-status', {
      headers: { 'x-access-token': token }
    })
    .then((res) => {
      if (res.data && res.data.success) {
        const tables = res.data.tables || this.state.tables;
        const reservations = res.data.reservations || [];

        const occupied = tables.filter(t => t.status === 'occupied').length;
        const reserved = tables.filter(t => t.status === 'reserved').length;
        const empty = tables.filter(t => t.status === 'empty').length;

        this.setState({
          tables,
          reservations,
          stats: { total: tables.length, occupied, reserved, empty }
        });
      }
    })
    .catch(err => {
      console.error("Lỗi tải dữ liệu lễ tân:", err);
    });
  }

  render() {
    const { tables, reservations, stats } = this.state;

    return (
      <div className="reception-container">
        <h2 className="reception-title">QUẢN LÝ LỄ TÂN & ĐẶT BÀN</h2>

        {/* 4 Thẻ thống kê tổng quan */}
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
            <div className="stat-label">Bàn đã đặt trước</div>
            <div className="stat-value reserved">{stats.reserved} Bàn</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bàn còn trống</div>
            <div className="stat-value empty">{stats.empty} Bàn</div>
          </div>
        </div>

        {/* Khu vực sơ đồ bàn và lịch đặt bàn */}
        <div className="reception-content">
          {/* Sơ đồ 12 bàn bên trái */}
          <div className="table-map-section">
            <h3>Sơ Đồ Bàn Trực Quan (12 Bàn)</h3>
            <div className="table-grid">
              {tables.map((table) => {
                let statusClass = 'empty';
                let statusText = 'Bàn Trống';

                if (table.status === 'occupied') {
                  statusClass = 'occupied';
                  statusText = `Có khách (${table.guests || 2} người)`;
                } else if (table.status === 'reserved') {
                  statusClass = 'reserved';
                  statusText = `Đã đặt trước (${table.time || '19:00'})`;
                }

                return (
                  <div key={table.id} className={`table-box ${statusClass}`}>
                    <div className="table-name">{table.name}</div>
                    <div className="table-status-text">{statusText}</div>
                    <div className="table-note">{table.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lịch đặt bàn bên phải */}
          <div className="reservation-section">
            <h3>Lịch Đặt Bàn Trong Ngày</h3>
            <div className="reservation-list">
              {reservations.length > 0 ? reservations.map((res) => (
                <div key={res.id} className="reservation-item">
                  <div>
                    <div className="reservation-info-name">{res.customerName}</div>
                    <div className="reservation-info-detail">{res.table} • {res.guests} Người</div>
                  </div>
                  <div className="reservation-time-badge">
                    {res.time}
                  </div>
                </div>
              )) : <div className="no-reservation">Chưa có lịch đặt bàn nào.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ReceptionComponent;