export function getCustomerAppUrl(auth = {}) {
  const customerUrl = new URL(
    process.env.REACT_APP_CUSTOMER_APP_URL || '/',
    window.location.origin
  );
  const token = auth.token || localStorage.getItem('token');
  const username = auth.username || localStorage.getItem('username') || '';
  const tableNumber = String(auth.tableNumber || '').trim();
  if (tableNumber) customerUrl.searchParams.set('table', tableNumber);

  // Separate development servers have separate localStorage, so pass the
  // login handoff in the URL fragment, which is not sent to the server.
  if (token && customerUrl.origin !== window.location.origin) {
    customerUrl.hash = new URLSearchParams({
      qrmenuToken: token,
      qrmenuUsername: username
    }).toString();
  }

  return customerUrl.toString();
}

export function getTableEntryUrl(tableNumber = '', auth = {}) {
  const baseUrl = new URL(
    process.env.REACT_APP_ADMIN_LOGIN_URL || '/admin/login',
    window.location.origin
  );
  const normalizedTable = String(tableNumber || '').trim();

  if (normalizedTable) {
    const numericTable = Number(normalizedTable.match(/\d+/)?.[0]);
    const tableParam = Number.isInteger(numericTable) && numericTable >= 1 && numericTable <= 12
      ? String(numericTable).padStart(2, '0')
      : normalizedTable;
    baseUrl.searchParams.set('table', tableParam);
  }

  return baseUrl.toString();
}
