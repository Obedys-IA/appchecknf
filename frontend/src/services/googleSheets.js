const API_URL = process.env.REACT_APP_API_URL || ''

export async function addRowToSheet(data) {
  try {
    const url = API_URL ? `${API_URL}/add-row` : `/add-row`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      console.error('Falha ao enviar ao Google Sheets:', err)
      return { success: false, error: err }
    }
    const json = await resp.json().catch(() => ({ success: true }))
    console.log('Linha adicionada ao Google Sheets com sucesso', json)
    return { success: true }
  } catch (e) {
    console.error('Erro ao enviar ao Google Sheets:', e)
    return { success: false, error: e }
  }
}

export async function updateRowInSheet(data) {
  try {
    const url = API_URL ? `${API_URL}/update-row` : `/update-row`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      console.error('Falha ao atualizar no Google Sheets:', err)
      return { success: false, error: err }
    }
    const json = await resp.json().catch(() => ({ success: true }))
    console.log('Linha atualizada no Google Sheets com sucesso', json)
    return { success: true }
  } catch (e) {
    console.error('Erro ao atualizar no Google Sheets:', e)
    return { success: false, error: e }
  }
}