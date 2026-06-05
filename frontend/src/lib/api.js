import axios from 'axios'

const client = axios.create({ baseURL: '/api', timeout: 30000 })

export async function submitCheck(subject) {
  const { data } = await client.post('/checks', subject)
  return data
}

export async function getSourceStatus() {
  const { data } = await client.get('/status/sources')
  return data
}
