import React, { useState, useEffect, useRef } from 'react'
import useAuthStore from '../store/authStore'

// ─────────────────────────────────────────────────────────
//  Animated particle background
// ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`
        ctx.fill()

        p.x += p.dx
        p.y += p.dy

        if (p.x < 0 || p.x > w) p.dx *= -1
        if (p.y < 0 || p.y > h) p.dy *= -1
      })
      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────
//  Input component
// ─────────────────────────────────────────────────────────
function AuthInput({ id, label, type = 'text', value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={id}
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#8b949e',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          background: 'rgba(13, 17, 23, 0.8)',
          border: `1px solid ${focused ? '#7c3aed' : '#30363d'}`,
          borderRadius: '8px',
          padding: '11px 14px',
          color: '#e6edf3',
          fontSize: '14px',
          fontFamily: "'Inter', system-ui, sans-serif",
          outline: 'none',
          transition: 'all 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Main AuthScreen
// ─────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [mode, setMode] = useState('login')  // 'login' | 'register'

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const [localError, setLocalError] = useState('')
  const [bgAngle, setBgAngle] = useState(135)

  // Slowly animate the gradient
  useEffect(() => {
    const id = setInterval(() => {
      setBgAngle((a) => (a + 0.2) % 360)
    }, 50)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    clearError()
    setLocalError('')
  }, [mode])

  const displayError = localError || error

  const handleLogin = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!loginEmail.trim() || !loginPassword) {
      setLocalError('Please fill in all fields.')
      return
    }
    try {
      await login(loginEmail.trim(), loginPassword)
    } catch (err) {
      // error is shown from store
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!regName.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setLocalError('Please fill in all fields.')
      return
    }
    if (regPassword !== regConfirm) {
      setLocalError('Passwords do not match.')
      return
    }
    if (regPassword.length < 6) {
      setLocalError('Password must be at least 6 characters.')
      return
    }
    try {
      await register(regName.trim(), regEmail.trim(), regPassword)
    } catch (err) {
      // error is shown from store
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(${bgAngle}deg, #0d1117 0%, #1a0533 45%, #0d0d2b 70%, #0d1117 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <ParticleCanvas />

      {/* Grid overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(22, 27, 34, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'slideUpCard 0.4s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', justifyContent: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              color: 'white',
              boxShadow: '0 0 24px rgba(124,58,237,0.5)',
              flexShrink: 0,
            }}
          >
            LC
          </div>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a855f7, #58a6ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.5px',
            }}
          >
            LiveCode
          </span>
        </div>

        <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '13px', marginBottom: '28px' }}>
          {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your free account to get started.'}
        </p>

        {/* Toggle tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(13, 17, 23, 0.6)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
            border: '1px solid #21262d',
          }}
        >
          {['login', 'register'].map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'all 0.2s',
                background: mode === tab ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent',
                color: mode === tab ? 'white' : '#8b949e',
                boxShadow: mode === tab ? '0 4px 12px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {tab === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {displayError && (
          <div
            style={{
              background: 'rgba(247, 129, 102, 0.1)',
              border: '1px solid rgba(247, 129, 102, 0.35)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#f78166',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <AuthInput
              id="login-email"
              label="Email address"
              type="email"
              value={loginEmail}
              onChange={setLoginEmail}
              placeholder="you@example.com"
              autoFocus
            />
            <AuthInput
              id="login-password"
              label="Password"
              type="password"
              value={loginPassword}
              onChange={setLoginPassword}
              placeholder="••••••••"
            />
            <SubmitButton loading={isLoading} text="Sign In" loadingText="Signing in…" />
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AuthInput
              id="reg-name"
              label="Full name"
              value={regName}
              onChange={setRegName}
              placeholder="Ada Lovelace"
              autoFocus
            />
            <AuthInput
              id="reg-email"
              label="Email address"
              type="email"
              value={regEmail}
              onChange={setRegEmail}
              placeholder="you@example.com"
            />
            <AuthInput
              id="reg-password"
              label="Password"
              type="password"
              value={regPassword}
              onChange={setRegPassword}
              placeholder="Min. 6 characters"
            />
            <AuthInput
              id="reg-confirm"
              label="Confirm password"
              type="password"
              value={regConfirm}
              onChange={setRegConfirm}
              placeholder="Repeat password"
            />
            <SubmitButton loading={isLoading} text="Create Account" loadingText="Creating account…" />
          </form>
        )}

        <p style={{ textAlign: 'center', color: '#484f58', fontSize: '11px', marginTop: '24px' }}>
          Real-time collaborative code editing • Phase 5
        </p>
      </div>

      <style>{`
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #484f58; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #0d1117 inset !important;
          -webkit-text-fill-color: #e6edf3 !important;
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Submit button with spinner
// ─────────────────────────────────────────────────────────
function SubmitButton({ loading, text, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '13px',
        background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: "'Inter', system-ui, sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        transition: 'all 0.2s',
        boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.45)',
        marginTop: '4px',
        transform: 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!loading) e.target.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)'
      }}
    >
      {loading ? (
        <>
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
          {loadingText}
        </>
      ) : (
        text
      )}
    </button>
  )
}
