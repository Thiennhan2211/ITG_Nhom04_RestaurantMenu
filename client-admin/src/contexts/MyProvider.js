import React, { Component } from 'react';
import MyContext from './MyContext';

const readStoredValue = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch (error) {
    return '';
  }
};

class MyProvider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: readStoredValue('token'),
      role: readStoredValue('role'),
      username: readStoredValue('username'),
      setToken: this.setToken,
      setRole: this.setRole,
      setUsername: this.setUsername,
      signIn: this.signIn,
      signOut: this.signOut
    };
  }

  componentDidMount() {
    window.addEventListener('qrmenu:session-expired', this.signOut);
  }

  componentWillUnmount() {
    window.removeEventListener('qrmenu:session-expired', this.signOut);
  }

  setToken = (token) => {
    this.setState({ token: token || '' });
  };

  setRole = (role) => {
    this.setState({ role: role || '' });
  };

  setUsername = (username) => {
    this.setState({ username: username || '' });
  };

  signIn = ({ token, role, username }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username || '');
    this.setState({ token, role, username: username || '' });
  };

  signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    this.setState({ token: '', role: '', username: '' });
  };

  render() {
    return (
      <MyContext.Provider value={this.state}>
        {this.props.children}
      </MyContext.Provider>
    );
  }
}

export default MyProvider;
