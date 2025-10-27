import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Upload, FileText, Download, Package } from 'lucide-react'

const ProcessarPDFs = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState([])
  const [statusMessage, setStatusMessage] = useState('')

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0])
    setStatusMessage('')
    setProcessedFiles([])
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage('Por favor, selecione um arquivo PDF.')
      return
    }

    setIsProcessing(true)
    setStatusMessage('Processando arquivo...')
    setProcessedFiles([])

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_URL}/processar`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setProcessedFiles(result.files || [])
        setStatusMessage(`Processamento concluído! ${result.files?.length || 0} arquivo(s) gerado(s).`)
      } else {
        const errorText = await response.text()
        setStatusMessage(`Erro no processamento: ${errorText}`)
      }
    } catch (error) {
      console.error('Erro:', error)
      setStatusMessage('Erro na comunicação com o servidor.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch(`${API_URL}/download-excel`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'dados_processados.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        setStatusMessage('Erro ao baixar o arquivo Excel.')
      }
    } catch (error) {
      console.error('Erro:', error)
      setStatusMessage('Erro na comunicação com o servidor.')
    }
  }

  const handleDownloadZip = async () => {
    try {
      const response = await fetch(`${API_URL}/download-zip`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'arquivos_processados.zip'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        setStatusMessage('Erro ao baixar o arquivo ZIP.')
      }
    } catch (error) {
      console.error('Erro:', error)
      setStatusMessage('Erro na comunicação com o servidor.')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Processar PDFs</h1>
        <p className="text-gray-600 mt-2">
          Faça upload de arquivos PDF com múltiplas notas fiscais para separação automática
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>
              Selecione um arquivo PDF contendo múltiplas notas fiscais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-12 w-12 text-gray-400" />
                <span className="text-lg font-medium text-gray-700">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo PDF'}
                </span>
                <span className="text-sm text-gray-500">
                  Ou arraste e solte o arquivo aqui
                </span>
              </label>
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Processar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card className={isProcessing ? 'border-blue-200 bg-blue-50' : processedFiles.length > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
                <span className={`font-medium ${
                  isProcessing ? 'text-blue-700' : 
                  processedFiles.length > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {statusMessage}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {processedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Arquivos Processados
              </CardTitle>
              <CardDescription>
                {processedFiles.length} arquivo(s) gerado(s) com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {processedFiles.map((file, index) => (
                    <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-mono">{file}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button onClick={handleDownloadExcel} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Excel
                </Button>
                <Button onClick={handleDownloadZip} variant="outline" className="flex-1">
                  <Package className="mr-2 h-4 w-4" />
                  Baixar ZIP
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p>Selecione um arquivo PDF que contenha múltiplas notas fiscais</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p>Clique em "Processar PDF" para iniciar a separação automática</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p>Aguarde o processamento - cada nota será separada em um arquivo individual</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <p>Baixe os arquivos processados em Excel ou ZIP conforme necessário</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ProcessarPDFs