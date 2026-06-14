import { useState } from 'react'
import { signIn, signOut } from '../data/auth.js'

export default function AuthModal({ user, isReviewer, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      onClose()
    } catch (err) {
      setError(err.message || 'Error de autenticación')
      setLoading(false)
    }
  }

  async function handleLogout() {
    setError('')
    try {
      await signOut()
      onClose()
    } catch (err) {
      setError(err.message || 'Error al cerrar sesión')
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Modo autoridad</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="drawer-body">
          {user ? (
            <>
              <p className="detail-meta">
                <b>Conectado como:</b> {user.email}
              </p>
              {isReviewer ? (
                <p style={{ color: '#22c55e', fontSize: 13, marginTop: 8 }}>
                  ✅ Rol verificado: revisor
                </p>
              ) : (
                <div className="warn">
                  ⚠ Tu cuenta no tiene rol de revisor. Contacta al administrador.
                </div>
              )}
              <button className="btn btn-danger btn-block" onClick={handleLogout} style={{ marginTop: 16 }}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <form onSubmit={handleLogin}>
              {error && <div className="warn">{error}</div>}

              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="revisor@municipalidad.gob.pe"
                />
              </div>

              <div className="field">
                <label>Contraseña</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Autenticando…' : 'Iniciar sesión'}
              </button>

              <div className="help" style={{ marginTop: 12 }}>
                Sólo cuentas con rol de revisor pueden cambiar el estado de incidencias.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
