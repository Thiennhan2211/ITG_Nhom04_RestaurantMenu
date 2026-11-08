import React, { useContext } from 'react';
import MyContext from '../contexts/MyContext';

function CustomerPortal() {
  const { username } = useContext(MyContext);

  return (
    <section style={{ maxWidth: '720px', margin: '48px auto', textAlign: 'center' }}>
      <h2>Chào mừng {username || 'bạn'}!</h2>
      <p>Bạn đã đăng nhập vào cổng khách hàng.</p>
    </section>
  );
}

export default CustomerPortal;
