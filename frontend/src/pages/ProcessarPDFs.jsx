import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Upload, FileText, Download, Package } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { API_URL } from '../config/api'

const ProcessarPDFs = () => {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)


  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
      .filter(f => (f.type || '').toLowerCase().includes('pdf'))
    setSelectedFiles(files)
    setStatusMessage('')
    setProcessedFiles([])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const dtFiles = Array.from(event.dataTransfer?.files || [])
      .filter(f => (f.type || '').toLowerCase().includes('pdf'))
    if (dtFiles.length === 0) {
      setStatusMessage('Por favor, solte arquivos PDF válidos.')
      return
    }
    setSelectedFiles(dtFiles)
    setStatusMessage('')
    setProcessedFiles([])
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  const handlePaste = (event) => {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && (file.type || '').toLowerCase().includes('pdf')) {
          setSelectedFiles(prev => [file, ...prev])
          setStatusMessage('')
          setProcessedFiles([])
          break
        }
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setStatusMessage('Por favor, selecione ao menos um arquivo PDF.')
      return
    }

    setIsProcessing(true)
    setStatusMessage('Processando arquivo(s)...')
    setProcessedFiles([])

    const endpoint = selectedFiles.length > 1 ? 'processar-multiplos' : 'processar'
    const formData = new FormData()
    if (endpoint === 'processar') {
      // Backend espera campo 'file' para upload.single('file')
      formData.append('file', selectedFiles[0])
    } else {
      // Backend espera campo 'files' para upload.array('files')
      selectedFiles.forEach(f => formData.append('files', f))
    }

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (selectedFiles.length > 1) {
          const resumoList = (result.resultados || []).map(r => (
            `${r.arquivo}: ${r.registrosSalvos || 0} registro(s), ${(r.duplicatas || []).length} duplicata(s), ${(r.validacoes || []).length} validação(ões)`
          ))
          setProcessedFiles(resumoList)
          setStatusMessage(result.message || `Processamento concluído! ${result.totalRegistrosSalvos || 0} registro(s) salvos.`)
        } else {
          // Resposta do endpoint legado /processar (um arquivo)
          setProcessedFiles([`${selectedFiles[0].name}: ${result.message} - Sucessos: ${result.resumo?.sucessos || 0}, Duplicatas: ${result.resumo?.duplicatas || 0}, Validações: ${result.resumo?.validacoes || 0}`])
          setStatusMessage(result.message || 'Processamento concluído!')
        }
      } else {
        // Fallback: se o backend ainda não tiver /processar-multiplos, tenta enviar cada arquivo para /processar
        if (response.status === 404 && selectedFiles.length > 1) {
          const resultadosFallback = []
          let sucessosTotal = 0
          for (const f of selectedFiles) {
            const fd = new FormData()
            fd.append('file', f)
            try {
              const resp = await fetch(`${API_URL}/processar`, { method: 'POST', body: fd })
              if (resp.ok) {
                const json = await resp.json()
                resultadosFallback.push(`${f.name}: ${json.message} - Sucessos: ${json.resumo?.sucessos || 0}, Duplicatas: ${json.resumo?.duplicatas || 0}, Validações: ${json.resumo?.validacoes || 0}`)
                sucessosTotal += json.resumo?.sucessos || 0
              } else {
                const txt = await resp.text()
                resultadosFallback.push(`${f.name}: Erro ${resp.status} - ${txt}`)
              }
            } catch (e) {
              resultadosFallback.push(`${f.name}: Falha na comunicação - ${e.message}`)
            }
          }
          setProcessedFiles(resultadosFallback)
          setStatusMessage(`Processamento concluído com fallback! Sucessos: ${sucessosTotal}`)
        } else {
          const errorText = await response.text()
          setStatusMessage(`Erro no processamento: ${errorText}`)
        }
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
    <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <PageHeader
        title="Processar PDFs"
        subtitle="Faça upload de PDFs com múltiplas notas fiscais para separação automática"
        icon={<Upload className="h-6 w-6 text-green-600" />}
      />

      <div className="grid gap-6">
        {/* Upload Section */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>
              Selecione um arquivo PDF contendo múltiplas notas fiscais
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onPaste={handlePaste}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
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
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} arquivo(s) selecionado(s)` 
                    : 'Clique para selecionar arquivos PDF'}
                </span>
                <span className="text-sm text-gray-500">
                  Ou arraste e solte os arquivos aqui, ou cole (Ctrl+V)
                </span>
              </label>
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || isProcessing}
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
                  Processar PDF(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card className={`${isProcessing ? 'border-blue-200 bg-blue-50' : processedFiles.length > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} card`}>
            <CardContent className="p-6 pt-6">
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
          <Card className="card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Arquivos Processados
              </CardTitle>
              <CardDescription>
                {processedFiles.length} arquivo(s) gerado(s) com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {processedFiles.map((file, index) => (
                    <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-mono whitespace-normal break-all">{file}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4 pt-4 border-t flex-wrap">
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
        <Card className="card">
          <CardHeader>
            <CardTitle>Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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