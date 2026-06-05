import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Loader } from 'lucide-react'
import { submitCheck } from '../lib/api'
import { saveCheck } from '../lib/storage'

const NATIONALITIES = [
  ['AU','Australia'],['AT','Austria'],['BE','Belgium'],['BR','Brazil'],
  ['CA','Canada'],['CN','China'],['HR','Croatia'],['CY','Cyprus'],
  ['CZ','Czech Republic'],['DK','Denmark'],['EG','Egypt'],['FI','Finland'],
  ['FR','France'],['DE','Germany'],['GR','Greece'],['HK','Hong Kong'],
  ['HU','Hungary'],['IN','India'],['ID','Indonesia'],['IE','Ireland'],
  ['IL','Israel'],['IT','Italy'],['JP','Japan'],['JO','Jordan'],
  ['KE','Kenya'],['KW','Kuwait'],['LB','Lebanon'],['LU','Luxembourg'],
  ['MY','Malaysia'],['MT','Malta'],['MX','Mexico'],['MA','Morocco'],
  ['NL','Netherlands'],['NZ','New Zealand'],['NG','Nigeria'],['NO','Norway'],
  ['PK','Pakistan'],['PA','Panama'],['PH','Philippines'],['PL','Poland'],
  ['PT','Portugal'],['QA','Qatar'],['RO','Romania'],['RU','Russia'],
  ['SA','Saudi Arabia'],['SG','Singapore'],['ZA','South Africa'],['ES','Spain'],
  ['SE','Sweden'],['CH','Switzerland'],['TW','Taiwan'],['TH','Thailand'],
  ['TR','Turkey'],['AE','United Arab Emirates'],['GB','United Kingdom'],
  ['US','United States'],['VN','Vietnam'],
]

const LAYERS = [
  { id: 'sanctions',     label: 'Sanctions & Watchlists', desc: 'OFAC, UN, EU, HMT + 40 more lists', required: true },
  { id: 'pep',           label: 'PEP Screening',          desc: 'Politically Exposed Persons' },
  { id: 'adverseMedia',  label: 'Adverse Media',          desc: 'News, FCA, SEC, UK Insolvency Register' },
  { id: 'corporate',     label: 'Corporate Intelligence', desc: 'Companies House, OpenCorporates, Disqualified Directors' },
  { id: 'crypto',        label: 'Crypto Wallet',          desc: 'On-chain risk screening (wallet address required)' },
]

export default function NewCheck() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', nationality: '', walletAddress: '' })
  const [layers, setLayers] = useState({ sanctions: true, pep: true, adverseMedia: true, corporate: false, crypto: false })

  function set(field) { return e => setForm(p => ({ ...p, [field]: e.target.value })) }
  function toggleLayer(id) { if (id !== 'sanctions') setLayers(p => ({ ...p, [id]: !p[id] })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.fullName.trim().length < 2) { setError('Full name must be at least 2 characters.'); return }
    setError(''); setLoading(true)
    try {
      const checkLayers = Object.entries(layers).filter(([, v]) => v).map(([k]) => k)
      const payload = {
        fullName: form.fullName.trim(), checkLayers,
        ...(form.dateOfBirth   && { dateOfBirth: form.dateOfBirth }),
        ...(form.nationality   && { nationality: form.nationality }),
        ...(form.walletAddress && { walletAddress: form.walletAddress.trim() }),
      }
      const report = await submitCheck(payload)
      saveCheck(report)
      navigate(`/checks/${report.checkId}`)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Screening failed — is the backend running on port 3001?')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: '#e6edf3', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>New Screening Check</h1>
        <p style={{ color: '#7d8590', fontSize: '13px', margin: 0 }}>Enter subject details and select layers to screen against.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)', borderRadius: '8px', padding: '12px 14px', color: '#ff4d4d', fontSize: '13px', marginBottom: '22px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Subject details card */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Subject Details</h2>

          <label style={S.label}>Full Name <span style={{ color: '#ff4d4d' }}>*</span></label>
          <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="e.g. John Smith" style={{ ...S.input, marginBottom: '16px' }} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={S.label}>Date of Birth <span style={S.optional}>optional</span></label>
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Nationality <span style={S.optional}>optional</span></label>
              <select value={form.nationality} onChange={set('nationality')} style={S.input}>
                <option value="">— Select country —</option>
                {NATIONALITIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <label style={S.label}>Crypto Wallet Address <span style={S.optional}>optional — required for crypto layer</span></label>
          <input type="text" value={form.walletAddress} onChange={set('walletAddress')} placeholder="0x... or bc1q..." style={{ ...S.input, fontFamily: 'monospace', fontSize: '13px' }} />
        </div>

        {/* Layer toggles */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Screening Layers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {LAYERS.map(layer => {
              const on = layers[layer.id]
              return (
                <div
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 14px', borderRadius: '8px',
                    border: `1px solid ${on ? 'rgba(0,229,160,0.22)' : '#21262d'}`,
                    backgroundColor: on ? 'rgba(0,229,160,0.04)' : 'transparent',
                    cursor: layer.required ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {layer.label}
                      {layer.required && <span style={{ fontSize: '10px', color: '#7d8590', backgroundColor: '#21262d', borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.05em' }}>REQUIRED</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4d5562' }}>{layer.desc}</div>
                  </div>
                  <Toggle on={on} disabled={layer.required} />
                </div>
              )
            })}
          </div>
        </div>

        <button type="submit" disabled={loading} style={{
          ...S.btnPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: loading ? 0.75 : 1, cursor: loading ? 'wait' : 'pointer',
        }}>
          {loading ? (
            <>
              <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
              Running screening check… (~8 seconds)
            </>
          ) : (
            <><Shield size={15} /> Run Screening Check</>
          )}
        </button>
      </form>
    </div>
  )
}

function Toggle({ on, disabled }) {
  return (
    <div style={{
      width: '38px', height: '21px', borderRadius: '10.5px', flexShrink: 0,
      backgroundColor: on ? '#00e5a0' : '#21262d',
      position: 'relative', transition: 'background 0.2s',
      opacity: disabled ? 0.45 : 1,
    }}>
      <div style={{
        position: 'absolute', top: '2.5px', left: on ? '19px' : '2.5px',
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: on ? '#080b10' : '#7d8590',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

const S = {
  card: { backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '10px', padding: '22px', marginBottom: '16px' },
  cardTitle: { color: '#e6edf3', fontSize: '14px', fontWeight: 600, margin: '0 0 18px' },
  label: { display: 'block', color: '#7d8590', fontSize: '12px', fontWeight: 500, marginBottom: '6px', letterSpacing: '0.03em' },
  optional: { color: '#4d5562', fontSize: '11px', marginLeft: '4px' },
  input: {
    width: '100%', backgroundColor: '#080b10', border: '1px solid #21262d',
    borderRadius: '6px', padding: '9px 11px', color: '#e6edf3', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', display: 'block',
  },
  btnPrimary: {
    width: '100%', backgroundColor: '#00e5a0', border: 'none', borderRadius: '7px',
    padding: '13px', color: '#080b10', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em',
  },
}
