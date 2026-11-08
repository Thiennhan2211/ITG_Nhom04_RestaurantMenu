export function getCustomerAppUrl(auth = {}) {
  const customerUrl = new URL(
    process.env.REACT_APP_CUSTOMER_APP_URL || '/',
    window.location.origin
  );
  const token = auth.token || localStorage.getItem('token');
  const username = auth.username || localStorage.getItem('username') || '';

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
