import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to an error reporting service
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('Component Error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="alert alert-danger text-center" role="alert">
            <h4 className="mb-2">Component Error</h4>
            <div>{this.state.error?.message || 'An unexpected error occurred.'}</div>
            <button className="btn btn-primary mt-3" onClick={this.handleReset}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
