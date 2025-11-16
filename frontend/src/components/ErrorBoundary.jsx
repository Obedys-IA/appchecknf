import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <div className="mb-2 font-semibold text-red-700">Ocorreu um erro inesperado.</div>
          <div className="mb-4 text-sm text-gray-700">Tente recarregar a página. Se persistir, entre em contato com o suporte.</div>
          <button onClick={this.handleReload} className="bg-red-600 text-white px-3 py-1 rounded">Recarregar</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary