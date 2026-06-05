import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { submitCheck } from '../lib/api'
import { saveCheck } from '../lib/storage'

const NATIONALITIES = [
  ['AU','Australia'],['AT','Austria'],['BE','Belgium'],['BR','Brazil'],
  ['CA','Canada'],['CN','China'],['DK','Denmark'],['EG','Egypt'],
  ['FI','Finland'],['FR','France'],['DE','Germany'],['GR','Greece'],
  ['HK','Hong Kong'],['IN','India'],['ID','Indonesia'],['IE','Ireland'],
  ['IL','Israel'],['IT','Italy'],['JP','Japan'],['KE','Kenya'],
  ['KW','Kuwait'],['LB','Lebanon'],['LU','Luxembourg'],['MY','Malaysia'],
  ['MX','Mexico'],['MA','Morocco'],['NL','Netherlands'],['NZ','New Zealand'],
  ['NG','Nigeria'],['NO','Norway'],['PK','Pakistan'],['PH','Philippines'],
  ['PL','Poland'],['PT','Portugal'],['QA','Qatar'],['RO','Romania'],
  ['RU','Russia'],['SA','Saudi Arabia'],['SG','Singapore'],['ZA','South Africa'],
  ['ES','Spain'],['SE','Sweden'],['CH','Switzerland'],['TW','Taiwan'],
  ['TH','Thailand'],['TR','Turkey'],['AE','United Arab Emirates'],
  ['GB','United Kingdom'],['US','United States'],['VN','Vietnam'],
]

const LAYERS = [
  { id: 'sanctions',    label: 'Sanctions & Watchlists', sub: 'OFAC · UN · EU · HMT · 40+ lists', required: true },
  { id: 'pep',          label: 'PEP Screening',          sub: 'Politically exposed persons' },
  { id: 'adverseMedia', label: 'Adverse Media',          sub: 'News · FCA · SEC · insolvency records' },
  { id: 'corporate',    label: 'Corporate Intelligence', sub: 'Companies House · OpenCorporates' },
  { id: 'crypto',       label: 'Crypto Wallet',          sub: 'On-chain risk (wallet address required)' },
]

export default function NewCheck() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const prefillLayers = location.state?.layers

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: prefill?.fullName || '',
    dateOfBirth: prefill?.dateOfBirth || '',
    nationality: prefill?.nationality || '',
    walletAddress: prefill?.walletAddress || '',
  })
  const [layers, setLayers] = useState({
    sanctions: true,
    pep: prefillLayers ? prefillLayers.includes('pep') : true,
    adverseMedia: prefillLayers ? prefillLayers.includes('adverseMedia') : true,
    corporate: prefillLayers ? prefillLayers.includes('corporate') : false,
    crypto: prefillLayers ? prefillLayers.includes('crypto') : false,
  })

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.fullName.trim().length < 2) { setError('Full name must be at least 2 characters.'); return }
    setError(''); setLoading(true)
    try {
      const checkLayers = Object.entries(layers).filter(([, v]) => v).map(([k]) => k)
      const report = await submitCheck({
        fullName: form.fullName.trim(), checkLayers,
        ...(form.dateOfBirth   && { dateOfBirth: form.dateOfBirth }),
        ...(form.nationality   && { nationality: form.nationality }),
        ...(form.walletAddress && { walletAddress: form.walletAddress.trim() }),
      })
      saveCheck(report)
      navigate(`/checks/${report.checkId}`)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Pipeline error - is the backend running on port 3001?')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 3 }}>
          New Screening Check
        </h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>Enter subject details and select which layers to run.</p>
      </div>

      {prefill && (
        <div style={{ padding: '9px 14px', background: 'rgba(123,104,238,0.06)', border: '1px solid rgba(123,104,238,0.2)', borderRadius: 6, color: 'var(--accent)', fontSize: 12, marginBottom: 16 }}>
          Editing previous check for <strong>{prefill.fullName}</strong> - modify fields below and rerun. A new report will be created.
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.18)', borderRadius: 6, color: 'var(--red)', fontSize: 12, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Subject */}
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Subject details</h2>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Full name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="e.g. John Smith" style={S.input} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={S.label}>Date of birth <Opt /></label>
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Nationality <Opt /></label>
              <select value={form.nationality} onChange={set('nationality')} style={{ ...S.input, appearance: 'none' }}>
                <option value="">Select country</option>
                {NATIONALITIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={S.label}>Crypto wallet address <Opt /></label>
            <input type="text" value={form.walletAddress} onChange={set('walletAddress')} placeholder="0x... or bc1q..." style={{ ...S.input, fontFamily: 'monospace' }} />
          </div>
        </section>

        {/* Layers */}
        <section style={{ ...S.section, marginBottom: 24 }}>
          <h2 style={S.sectionTitle}>Screening layers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {LAYERS.map(layer => {
              const on = layers[layer.id]
              return (
                <div key={layer.id}
                  onClick={() => { if (!layer.required) setLayers(p => ({ ...p, [layer.id]: !p[layer.id] })) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: 7, cursor: layer.required ? 'default' : 'pointer',
                    border: `1px solid ${on ? 'rgba(123,104,238,0.3)' : 'var(--border)'}`,
                    background: on ? 'rgba(123,104,238,0.05)' : 'var(--raised)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--tx)' : 'var(--tx-2)', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {layer.label}
                      {layer.required && <span style={{ fontSize: 10, color: 'var(--tx-3)', fontWeight: 400 }}>required</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>{layer.sub}</div>
                  </div>
                  {/* Toggle pill */}
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
                    background: on ? 'var(--accent)' : 'var(--border)',
                    opacity: layer.required ? 0.5 : 1,
                    transition: 'background 0.18s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, left: on ? 19 : 3,
                      width: 14, height: 14, borderRadius: 7,
                      background: on ? '#fff' : '#6e7681',
                      transition: 'left 0.18s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: 7, border: 'none',
          background: loading ? 'var(--raised)' : 'var(--accent)',
          color: loading ? 'var(--tx-3)' : '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
        }}>
          {loading
            ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Running screening check…</>
            : 'Run screening check →'
          }
        </button>
      </form>
    </div>
  )
}

function Opt() {
  return <span style={{ fontSize: 11, color: 'var(--tx-3)', fontWeight: 400, marginLeft: 4 }}>optional</span>
}

const S = {
  section: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 },
  input: { display: 'block', width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '9px 11px', color: 'var(--tx)', fontSize: 13, outline: 'none' },
}
