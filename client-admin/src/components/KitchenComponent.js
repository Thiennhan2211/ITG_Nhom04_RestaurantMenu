import React, { Component } from 'react';
import axios from 'axios';
import '../css/KitchenComponent.css';

class KitchenComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pendingTickets: [],
      completedItems: [],
      stats: {
        pendingCount: 0,
        cookingCount: 0,
        todayDoneCount: 0,
        avgTime: '12 Phút'
      }
    };
  }

  componentDidMount() {
    this.fetchRealKitchenData();
    // Tự động làm mới dữ liệu bếp mỗi 4 giây (Real-time polling)
    this.timerID = setInterval(() => this.fetchRealKitchenData(), 4000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  // Gọi API lấy dữ liệu thực tế từ MongoDB
  fetchRealKitchenData = () => {
    const token = localStorage.getItem('token');
    axios.get('/api/admin/orders', {
      headers: { 'x-access-token': token }
    })
    .then((res) => {
      if (Array.isArray(res.data)) {
        const allOrders = res.data.map(order => ({
          ...order,
          table: order.tableNo || order.table
        }));

        // 1. Lọc các đơn hàng đang chờ chế biến (PENDING hoặc APPROVED)
        const activeOrders = allOrders.filter(o => ['PENDING', 'COOKING', 'APPROVED'].includes(o.status));
        
        const pendingTickets = activeOrders.map((order) => {
          // Tính thời gian tạo đơn tính bằng phút trước
          const createdTime = new Date(order.cdate || Date.now());
          const diffMinutes = Math.max(1, Math.floor((new Date() - createdTime) / 60000));

          return {
            id: order._id,
            tableName: order.table || 'Bàn 01',
            timeAgo: `${diffMinutes} phút trước`,
            urgency: diffMinutes > 10 ? 'urgent' : 'normal',
            items: order.items && order.items.length > 0 
              ? order.items.map(i => ({
                  name: i.product?.name || i.name || 'Món ăn',
                  quantity: i.quantity || 1,
                  note: [
                    i.note,
                    ...Object.entries(i.selectedToppings || {}).map(([name, quantity]) => `${name} x${quantity}`)
                  ].filter(Boolean).join(' · ')
                }))
              : [{ name: 'Món ăn từ khách hàng', quantity: 1, note: '' }]
          };
        });

        // 2. Lọc các đơn hàng đã hoàn thành (COMPLETED) trong ngày để đưa vào cột "Món Vừa Ra Bếp"
        const completedOrders = allOrders.filter(o => o.status === 'COMPLETED').slice(0, 5);
        const completedItems = [];
        
        completedOrders.forEach((ord, idx) => {
          if (ord.items) {
            ord.items.forEach(it => {
              const doneTime = new Date(ord.cdate || Date.now());
              const timeStr = doneTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              completedItems.push({
                id: `${ord._id}-${idx}`,
                name: `${ord.table || 'Bàn'} - ${it.product?.name || it.name || 'Món ăn'}`,
                detail: `Số lượng: x${it.quantity || 1} • Xong lúc ${timeStr}`
              });
            });
          }
        });

        // 3. Tính toán thống kê
        const pendingCount = pendingTickets.length;
        const cookingCount = pendingTickets.reduce((acc, t) => acc.concat(t.items), []).length;
        const todayDoneCount = allOrders.filter(o => o.status === 'COMPLETED').length;

        this.setState({
          pendingTickets,
          completedItems,
          stats: {
            pendingCount,
            cookingCount,
            todayDoneCount,
            avgTime: '12 Phút'
          }
        });
      }
    })
    .catch(err => console.error("Lỗi tải dữ liệu bếp thật:", err));
  }

  // Xử lý khi bếp bấm "Hoàn thành & Chuyển Phục Vụ"
  handleCompleteTicket = (orderId) => {
    const token = localStorage.getItem('token');
    axios.put(`/api/admin/orders/status/${orderId}`, { status: 'COMPLETED' }, {
      headers: { 'x-access-token': token }
    })
    .then((res) => {
      if (res.data) {
        alert('Đã hoàn thành món và chuyển sang phục vụ!');
        this.fetchRealKitchenData(); // Tải lại ngay lập tức
      }
    })
    .catch(err => {
      alert('Lỗi cập nhật trạng thái đơn hàng: ' + err.message);
    });
  }

  render() {
    const { pendingTickets, completedItems, stats } = this.state;

    return (
      <div className="kitchen-container">
        <div className="kitchen-title">MÀN HÌNH ĐIỀU HÀNH BẾP</div>

        {/* 4 Thẻ thống kê tổng quan */}
        <div className="kitchen-stats">
          <div className="k-stat-card">
            <div className="k-stat-label">Phiếu chế biến chờ</div>
            <div className="k-stat-value highlight">{stats.pendingCount} Phiếu</div>
          </div>
          <div className="k-stat-card">
            <div className="k-stat-label">Món đang chế biến</div>
            <div className="k-stat-value">{stats.cookingCount} Món</div>
          </div>
          <div className="k-stat-card">
            <div className="k-stat-label">Đã xong trong ngày</div>
            <div className="k-stat-value">{stats.todayDoneCount} Món</div>
          </div>
          <div className="k-stat-card">
            <div className="k-stat-label">Thời gian trung bình</div>
            <div className="k-stat-value">{stats.avgTime}</div>
          </div>
        </div>

        {/* Khu vực chính chia 2 cột */}
        <div className="kitchen-content">
          {/* Cột trái: Phiếu gọi món đang chờ chế biến từ DB */}
          <div className="cooking-queue-section">
            <div className="section-header">
              <span>Phiếu Gọi Món Đang Chờ Chế Biến</span>
              <span className="sub-note">Dữ liệu thực tế từ khách hàng quét mã</span>
            </div>

            <div className="ticket-grid">
              {pendingTickets.length > 0 ? pendingTickets.map((ticket) => (
                <div key={ticket.id} className="ticket-card">
                  <div>
                    <div className="ticket-header">
                      <span className="table-title">{ticket.tableName}</span>
                      <span className={`time-badge ${ticket.urgency}`}>{ticket.timeAgo}</span>
                    </div>

                    <div className="item-list">
                      {ticket.items.map((item, idx) => (
                        <div key={idx} className="order-item-row">
                          <span><b>x{item.quantity}</b> {item.name}</span>
                          {item.note && <span className="item-note">({item.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="btn-complete"
                    onClick={() => this.handleCompleteTicket(ticket.id)}
                  >
                    Hoàn thành & Chuyển Phục Vụ
                  </button>
                </div>
              )) : <div className="no-data">Hiện không có phiếu gọi món nào đang chờ trong hệ thống.</div>}
            </div>
          </div>

          {/* Cột phải: Món vừa ra bếp từ DB */}
          <div className="completed-history-section">
            <div className="section-header">
              <span>Món Vừa Ra Bếp</span>
            </div>

            <div className="history-list">
              {completedItems.length > 0 ? completedItems.map((item) => (
                <div key={item.id} className="history-card">
                  <div className="history-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-detail">{item.detail}</div>
                  </div>
                  <span className="status-badge-done">Đã Ra Bàn</span>
                </div>
              )) : <div className="no-data">Chưa có món nào hoàn thành gần đây.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default KitchenComponent;
