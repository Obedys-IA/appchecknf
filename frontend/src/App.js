import React, { useState } from 'react';
import './App.css';
import logo from './logodoapp.png'; // Importando o logo

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // URL da API - funciona tanto local quanto na web
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
    setProcessedFiles([]);
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Selecione um arquivo PDF primeiro.');
      return;
    }
    setIsProcessing(true);
    setStatus('Enviando e processando... Isso pode levar alguns segundos.');
    setProcessedFiles([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/processar`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setStatus(`Processamento concluído! ${data.arquivos.length} notas separadas.`);
        setProcessedFiles(data.arquivos);
      } else {
        setStatus('Erro: ' + (data.error || 'Ocorreu um problema no servidor.'));
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setStatus('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = () => {
    window.location.href = `${API_URL}/download-excel`;
  };

  const handleDownloadZip = () => {
    window.location.href = `${API_URL}/download-zip`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>GDM - SeparadorPDF</h1>
        <p className="subtitle">Faça o upload de um arquivo PDF com múltiplas notas fiscais.</p>
        
        <div className="upload-section">
          <input type="file" id="file-upload" accept="application/pdf" onChange={handleFileChange} />
          <label htmlFor="file-upload" className="custom-file-upload">
            {file ? file.name : 'Escolher Arquivo'}
          </label>
          <button onClick={handleUpload} disabled={!file || isProcessing}>
            {isProcessing ? 'Processando...' : 'Processar Arquivo'}
          </button>
        </div>

        {status && <p className="status">{status}</p>}

        {processedFiles.length > 0 && (
          <div className="results-section">
            <h2>Arquivos Gerados:</h2>
            <ul>
              {processedFiles.map((filename, index) => (
                <li key={index}>{filename}</li>
              ))}
            </ul>
            <div className="download-buttons-container">
              <button onClick={handleDownloadExcel} className="download-button">
                Exportar para Excel
              </button>
              <button onClick={handleDownloadZip} className="download-button">
                Baixar Todos (ZIP)
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
