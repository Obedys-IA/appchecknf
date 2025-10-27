# Script para testar upload de arquivo PDF
$filePath = "uploads\TESTE2.pdf"
$uri = "http://localhost:3001/processar"

# Verificar se o arquivo existe
if (Test-Path $filePath) {
    Write-Host "Arquivo encontrado: $filePath"
    
    # Criar boundary para multipart/form-data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Ler o arquivo
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileName = [System.IO.Path]::GetFileName($filePath)
    
    # Criar o corpo da requisição multipart
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/pdf$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary--$LF"
    ) -join $LF
    
    try {
        # Fazer a requisição
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary"
        Write-Host "Resposta do servidor:"
        $response | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "Erro na requisição: $($_.Exception.Message)"
    }
} else {
    Write-Host "Arquivo não encontrado: $filePath"
}