import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { Screen } from '../types'

interface Props {
  onNavigate: (s: Screen) => void
}

export default function Landing({ onNavigate }: Props) {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [checked, setChecked] = useState(false)
  const [form, setForm] = useState({firstName:'',lastName:'',email:'',password:'',companyName:''})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, signup } = useAuth()

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = authMode === 'login'
        ? await login(form.email, form.password)
        : await signup(form)
      setAuthOpen(false)
      window.scrollTo({top:0,left:0,behavior:'auto'})
      onNavigate(authMode === 'register' || !u.profileCompleted ? 'profile' : 'dashboard')
    } catch (err:any) {
      setError(err.message || 'Authentication failed.')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="iq2-root">
      <style>{`
        .iq2-root {
          --bg: #FAF9F5;
          --surface: #FFFFFF;
          --text: #172033;
          --text-muted: #5B6478;
          --border: rgba(23, 32, 51, 0.09);
          --blue: #3358E8;
          --blue-dark: #223FBE;
          --grad: linear-gradient(135deg, #3358E8 0%, #7B5CFA 100%);
          --dark-panel: #10142A;
          --dark-panel-2: #171B33;

          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            Helvetica,
            Arial,
            sans-serif;
        }

        .iq2-root * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        button,
        input,
        textarea,
        select {
          touch-action: manipulation;
        }

        .iq2-display {
          font-family: 'Outfit', -apple-system, sans-serif;
        }

        /* =========================
           NAVBAR
        ========================= */

        .iq2-navbar {
          position: relative;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;

          height: 108px;

          display: flex;
          align-items: center;

          background: rgba(250, 249, 245, 0.96);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(23, 32, 51, 0.10);

          overflow: hidden;
        }

        .iq2-nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 28px;
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: space-between;

          position: relative;
          z-index: 2;
        }

        .iq2-nav-brand {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          height: 100%;
          flex-shrink: 0;
        }

        .iq2-nav-brand img {
          height: 88px;
          width: auto;
          max-width: 330px;

          object-fit: contain;
          object-position: left center;

          display: block;
          flex-shrink: 0;

          filter: drop-shadow(
            0 8px 18px rgba(0, 0, 0, 0.14)
          );
        }

        .iq2-btn-login {
          min-height: 48px;
          padding: 12px 24px;
          border-radius: 10px;

          font-size: 15px;
          font-weight: 700;

          background: transparent;
          border: 1px solid rgba(23, 32, 51, 0.16);
          color: var(--text);

          cursor: pointer;

          transition:
            background 0.2s,
            border-color 0.2s;
        }

        .iq2-btn-login:hover {
          background: rgba(23, 32, 51, 0.06);
          border-color: rgba(23, 32, 51, 0.24);
        }

        .iq2-btn-signup {
          min-height: 48px;
          padding: 12px 28px;
          border-radius: 10px;

          font-size: 15px;
          font-weight: 700;

          background:
            linear-gradient(
              135deg,
              #7B5CFA 0%,
              #4F7CFF 100%
            );

          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);

          cursor: pointer;

          box-shadow:
            0 8px 22px rgba(51, 88, 232, 0.24);

          transition: box-shadow 0.15s;
        }

        .iq2-btn-signup:hover {
          box-shadow:
            0 12px 28px rgba(51, 88, 232, 0.34);
        }

        /* =========================
           HERO
        ========================= */

        .iq2-hero {
          position: relative;
          padding: 152px 28px 120px;
          overflow: hidden;
          isolation: isolate;
        }

        .iq2-hero-inner {
          max-width: 1180px;
          margin: 0 auto;

          display: grid;
          grid-template-columns: 45% 55%;
          gap: 48px;

          align-items: center;
        }

        .iq2-h1 {
          font-weight: 700;
          font-size: clamp(38px, 4.6vw, 62px);
          line-height: 1.06;
          letter-spacing: -0.02em;

          color: var(--text);

          margin: 0 0 24px;
        }

        .iq2-h1 .accent {
          background: var(--grad);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .iq2-hero-desc {
          font-size: 17px;
          line-height: 1.7;

          color: var(--text-muted);

          max-width: 460px;
          margin: 0 0 36px;
        }

        .iq2-hero-ctas {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;

          margin-bottom: 14px;
        }

        .iq2-cta-primary {
          padding: 14px 28px;
          border-radius: 10px;

          font-size: 15px;
          font-weight: 600;

          background: var(--grad);
          color: #fff;

          border: none;
          cursor: pointer;

          box-shadow:
            0 8px 24px rgba(51, 88, 232, 0.28);

          transition: box-shadow 0.15s;
        }

        .iq2-cta-primary:hover {
          transform: translateY(-2px);

          box-shadow:
            0 12px 28px rgba(51, 88, 232, 0.36);
        }

        .iq2-cta-secondary {
          padding: 14px 26px;
          border-radius: 10px;

          font-size: 15px;
          font-weight: 600;

          background: var(--surface);
          color: var(--text);

          border: 1px solid var(--border);

          cursor: pointer;

          transition:
            border-color 0.15s,
            background 0.15s;
        }

        .iq2-cta-secondary:hover {
          border-color: rgba(23, 32, 51, 0.22);
          background: #fff;
        }

        /* =========================
           PRODUCT MOCKUP
        ========================= */

        .iq2-mock-wrap {
          background: var(--surface);
          border-radius: 20px;
          padding: 10px;

          border: 1px solid var(--border);

          box-shadow:
            0 30px 70px -20px
            rgba(23, 32, 51, 0.22);
        }

        .iq2-mock {
          border-radius: 14px;
          overflow: hidden;

          background: var(--dark-panel);

          display: flex;
          flex-direction: column;

          min-height: 420px;
        }

        .iq2-mock-bar {
          padding: 12px 16px;

          display: flex;
          align-items: center;
          gap: 10px;

          border-bottom:
            1px solid rgba(255, 255, 255, 0.08);
        }

        .iq2-mock-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          opacity: 0.85;
        }

        .iq2-mock-title {
          flex: 1;

          text-align: center;

          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }

        .iq2-mock-live {
          font-size: 11px;
          color: #4ADE80;

          display: flex;
          align-items: center;
          gap: 5px;

          font-weight: 600;
        }

        .iq2-mock-live .pulse {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #4ADE80;

          display: inline-block;
        }

        .iq2-mock-body {
          display: grid;
          grid-template-columns: 1.5fr 1fr;

          flex: 1;

          gap: 1px;

          background:
            rgba(255, 255, 255, 0.06);
        }

        .iq2-mock-video {
          position: relative;

          background:
            linear-gradient(
              160deg,
              #1b2145,
              #0d1128
            );

          display: flex;
          align-items: flex-end;

          padding: 16px;

          min-height: 260px;
        }

        .iq2-mock-video img {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          opacity: 0.55;
        }

        .iq2-mock-video-label {
          position: relative;
          z-index: 1;

          font-size: 12px;
          color: #fff;
          font-weight: 600;

          background:
            rgba(0, 0, 0, 0.35);

          padding: 6px 10px;

          border-radius: 8px;

          backdrop-filter: blur(4px);
        }

        .iq2-mock-side {
          background: var(--dark-panel-2);

          padding: 18px;

          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .iq2-mock-ai {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .iq2-mock-ai-avatar {
          width: 38px;
          height: 38px;

          border-radius: 10px;

          background: var(--grad);

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 16px;

          box-shadow:
            0 0 20px rgba(123, 92, 250, 0.4);
        }

        .iq2-mock-ai-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
        }

        .iq2-mock-ai-role {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.45);
        }

        .iq2-mock-question {
          background:
            rgba(255, 255, 255, 0.05);

          border:
            1px solid rgba(255, 255, 255, 0.08);

          border-radius: 10px;

          padding: 12px;

          font-size: 12px;
          line-height: 1.6;

          color: rgba(255, 255, 255, 0.8);
        }

        .iq2-mock-wave {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 26px;
        }

        .iq2-mock-wave span {
          width: 3px;

          background: #7B5CFA;

          border-radius: 2px;

          opacity: 0.85;
        }

        .iq2-mock-timer {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);

          margin-top: auto;
        }

        .iq2-mock-footer {
          padding: 12px 16px;

          border-top:
            1px solid rgba(255, 255, 255, 0.08);

          display: flex;
          align-items: center;
          gap: 14px;
        }

        .iq2-mock-ctrl {
          width: 30px;
          height: 30px;

          border-radius: 8px;

          background:
            rgba(255, 255, 255, 0.08);

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 13px;
        }

        .iq2-mock-score {
          margin-left: auto;

          font-size: 11.5px;
          color: #7B9BFF;
          font-weight: 600;
        }

        /* =========================
           AUTH MODAL
        ========================= */

        .iq2-modal-backdrop {
          position: fixed;
          inset: 0;

          z-index: 1000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 24px;

          background:
            rgba(16, 20, 42, 0.48);

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .iq2-auth-modal {
          width: min(100%, 500px);

          max-height:
            calc(100vh - 48px);

          overflow-y: auto;

          background: #fff;

          border:
            1px solid rgba(23, 32, 51, 0.10);

          border-radius: 22px;

          box-shadow:
            0 30px 90px
            rgba(16, 20, 42, 0.28);

          padding: 32px;

          position: relative;
        }

        .iq2-auth-close {
          position: absolute;

          top: 16px;
          right: 16px;

          width: 34px;
          height: 34px;

          border-radius: 50%;

          border:
            1px solid rgba(23, 32, 51, 0.10);

          background: #FAF9F5;
          color: #172033;

          cursor: pointer;

          font-size: 18px;
          line-height: 1;
        }

        .iq2-auth-close:hover {
          background: #fff;

          border-color:
            rgba(23, 32, 51, 0.22);
        }

        .iq2-auth-logo {
          width: 230px;
          height: 120px;

          object-fit: contain;
          object-position: left center;

          margin: -8px 0 18px;

          display: block;

          filter:
            drop-shadow(
              0 10px 22px
              rgba(51, 88, 232, 0.14)
            );
        }

        .iq2-auth-title {
          margin: 0 42px 9px 0;

          color: #172033;

          font-family:
            Outfit,
            -apple-system,
            sans-serif;

          font-size: 28px;

          line-height: 1.15;

          letter-spacing: -0.02em;

          font-weight: 800;
        }

        .iq2-auth-subtitle {
          margin: 0 0 24px;

          color: #5B6478;

          font-size: 14px;
          line-height: 1.6;
        }

        .iq2-auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .iq2-auth-form label {
          display: flex;
          flex-direction: column;

          gap: 6px;

          color: #5B6478;

          font-size: 13px;
          font-weight: 600;
        }

        .iq2-auth-form input {
          width: 100%;

          padding: 12px 13px;

          border-radius: 10px;

          border:
            1px solid rgba(23, 32, 51, 0.12);

          background: #FAF9F5;

          color: #172033;

          font-size: 14px;

          outline: none;

          font-family: inherit;
        }

        .iq2-auth-form input:focus {
          border-color:
            rgba(51, 88, 232, 0.55);

          box-shadow:
            0 0 0 3px
            rgba(51, 88, 232, 0.08);
        }

        .iq2-auth-submit {
          margin-top: 4px;

          width: 100%;

          padding: 13px;

          border: 0;

          border-radius: 10px;

          background: var(--grad);

          color: #fff;

          font-size: 15px;
          font-weight: 700;

          cursor: pointer;

          box-shadow:
            0 8px 24px
            rgba(51, 88, 232, 0.24);
        }

        .iq2-auth-submit:hover {
          box-shadow:
            0 12px 30px
            rgba(51, 88, 232, 0.32);
        }

        .iq2-auth-switch {
          margin-top: 20px;

          text-align: center;

          color: #5B6478;

          font-size: 13px;
        }

        .iq2-auth-switch button {
          border: 0;

          background: transparent;

          color: #3358E8;

          cursor: pointer;

          font: inherit;

          font-weight: 700;
        }

        .iq2-auth-check {
          display: flex !important;
          flex-direction: row !important;

          align-items: flex-start;

          gap: 9px;

          color: #5B6478;

          font-size: 12px;

          line-height: 1.5;
        }

        .iq2-auth-check input {
          width: auto;

          margin-top: 2px;

          accent-color: #3358E8;
        }

        /* =========================
           TABLET
        ========================= */

        @media (max-width: 900px) {
          .iq2-hero-inner {
            grid-template-columns: 1fr;
          }
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 640px) {
          .iq2-navbar {
            height: 70px;
          }

          .iq2-nav-inner {
            padding: 0 18px;
          }

          .iq2-nav-brand img {
            height: 56px !important;
            max-width: 260px !important;
          }

          .iq2-btn-login {
            min-height: 42px;
            padding: 9px 15px;
            font-size: 14px;
          }

          .iq2-btn-signup {
            min-height: 42px;
            padding: 9px 17px;
            font-size: 14px;
          }

          .iq2-hero {
            padding: 96px 20px 64px;
          }

          .iq2-hero-desc {
            max-width: 100%;
          }

          .iq2-hero-ctas {
            flex-direction: column;
            align-items: stretch;
          }

          .iq2-hero-ctas .iq2-cta-primary,
          .iq2-hero-ctas .iq2-cta-secondary {
            width: 100%;
            text-align: center;
          }

          .iq2-mock-body {
            grid-template-columns: 1fr;
          }

          /* Smaller mobile auth popup */
          .iq2-modal-backdrop {
            padding: 10px;
            align-items: center;
          }

          .iq2-auth-modal {
            width: min(100%, 360px);
            max-height: calc(100dvh - 20px);
            padding: 22px 18px;
            border-radius: 16px;
          }

          .iq2-auth-logo {
            width: 170px;
            height: 78px;
            margin: -4px 0 10px;
          }

          .iq2-auth-title {
            font-size: 23px;
            margin-bottom: 7px;
          }

          .iq2-auth-subtitle {
            font-size: 13px;
            line-height: 1.45;
            margin-bottom: 17px;
          }

          .iq2-auth-form {
            gap: 11px;
          }

          /*
           * 16px prevents iOS Safari from
           * automatically zooming when inputs
           * receive focus.
           */
          .iq2-auth-form input {
            padding: 11px 12px;
            font-size: 16px;
          }

          .iq2-auth-submit {
            padding: 12px;
          }

          .iq2-auth-switch {
            margin-top: 14px;
          }
        }

        /* =========================
           SMALL PHONES
        ========================= */

        @media (max-width: 420px) {
          .iq2-nav-inner {
            padding: 0 12px;
          }

          .iq2-nav-brand img {
            height: 56px !important;
            max-width: 220px !important;
          }

          .iq2-btn-login {
            padding: 8px 11px;
          }

          .iq2-btn-signup {
            padding: 8px 13px;
          }

          .iq2-modal-backdrop {
            padding: 8px;
          }

          .iq2-auth-modal {
            width: min(100%, 350px);
            padding: 20px 16px;
          }

          .iq2-auth-logo {
            width: 155px;
            height: 70px;
          }
        }
      `}</style>

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="iq2-navbar">
        <div className="iq2-nav-inner">

          {/* VIVA Logo */}
          <div className="iq2-nav-brand">
            <img
              src="/viva-logo.png"
              alt="Viva — Virtual Interview and Vocal Assessment"
            />
          </div>

          {/* Auth buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={() => openAuth('login')}
              className="iq2-btn-login"
            >
              Login
            </button>

            <button
              onClick={() => openAuth('register')}
              className="iq2-btn-signup"
            >
              Sign Up
            </button>
          </div>

        </div>
      </nav>

      {/* =========================
          HERO
      ========================= */}

      <section className="iq2-hero">
        <div className="iq2-hero-inner">

          {/* Hero left */}
          <div>
            <h1 className="iq2-display iq2-h1">
              Interviews that listen to
              <br />
              more than your
              <br />
              <span className="accent">
                words
              </span>
            </h1>

            <p className="iq2-hero-desc">
              Viva runs structured, AI-guided interviews
              and analyzes tone, pace, and clarity
              alongside every answer — giving your team
              a clearer, more complete read on each
              candidate.
            </p>

            <div className="iq2-hero-ctas">
              <button
                onClick={() => openAuth('register')}
                className="iq2-cta-primary"
              >
                Start for Free →
              </button>

              <button
                onClick={() => openAuth('login')}
                className="iq2-cta-secondary"
              >
                Login
              </button>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-muted)',
              }}
            >
              Free to get started · No credit card required
            </div>
          </div>

          {/* Product mockup */}
          <div className="iq2-mock-wrap">
            <div className="iq2-mock">

              <div className="iq2-mock-bar">
                <div
                  style={{
                    display: 'flex',
                    gap: 5,
                  }}
                >
                  {[
                    '#ef4444',
                    '#f59e0b',
                    '#4ADE80',
                  ].map(c => (
                    <div
                      key={c}
                      className="iq2-mock-dot"
                      style={{
                        background: c,
                      }}
                    />
                  ))}
                </div>

                <span className="iq2-mock-title">
                  Vocal Assessment — 00:14:32
                </span>

                <span className="iq2-mock-live">
                  <span className="pulse" />
                  LIVE
                </span>
              </div>

              <div className="iq2-mock-body">

                <div className="iq2-mock-video">
                  <img
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=400&fit=crop&auto=format"
                    alt="Candidate on video call"
                  />

                  <span className="iq2-mock-video-label">
                    Candidate — Jordan M.
                  </span>
                </div>

                <div className="iq2-mock-side">

                  <div className="iq2-mock-ai">
                    <div className="iq2-mock-ai-avatar">
                      🎙️
                    </div>

                    <div>
                      <div className="iq2-mock-ai-name">
                        VIVA
                      </div>

                      <div className="iq2-mock-ai-role">
                        Virtual Interviewer
                      </div>
                    </div>
                  </div>

                  <div className="iq2-mock-question">
                    "Walk me through a time you had
                    to explain something technical to
                    a non-technical audience."
                  </div>

                  <div className="iq2-mock-wave">
                    {[6, 12, 9, 16, 10, 14, 7, 11, 8].map(
                      (h, i) => (
                        <span
                          key={i}
                          style={{
                            height: h,
                          }}
                        />
                      )
                    )}
                  </div>

                  <div className="iq2-mock-timer">
                    Vocal clarity: 92 · Pace: steady
                  </div>

                </div>
              </div>

              <div className="iq2-mock-footer">
                <div className="iq2-mock-ctrl">
                  🎤
                </div>

                <div className="iq2-mock-ctrl">
                  📷
                </div>

                <div
                  className="iq2-mock-ctrl"
                  style={{
                    background:
                      'rgba(239,68,68,0.25)',
                  }}
                >
                  ⏻
                </div>

                <span className="iq2-mock-score">
                  Live score: 87%
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =========================
          AUTH MODAL
      ========================= */}

      {authOpen && (
        <div
          className="iq2-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="iq2-auth-title"
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setAuthOpen(false)
            }
          }}
        >
          <div className="iq2-auth-modal">

            <button
              type="button"
              className="iq2-auth-close"
              aria-label="Close"
              onClick={() => setAuthOpen(false)}
            >
              ×
            </button>

            {/* VIVA logo */}
            <img
              src="/viva-logo.png"
              alt="VIVA"
              className="iq2-auth-logo"
            />

            <h2
              id="iq2-auth-title"
              className="iq2-auth-title"
            >
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p className="iq2-auth-subtitle">
              {authMode === 'login'
                ? 'Sign in to continue to your VIVA interview dashboard.'
                : 'Start practicing smarter with AI-powered interview assessments.'}
            </p>

            {/* Email/password authentication only */}
            <form
              className="iq2-auth-form"
              onSubmit={handleAuthSubmit}
            >

              {authMode === 'register' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: 10,
                  }}
                >
                  <label>
                    First name
                    <input
                      type="text"
                      placeholder="Alex" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}
                    />
                  </label>

                  <label>
                    Last name
                    <input
                      type="text"
                      placeholder="Kim" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}
                    />
                  </label>
                </div>
              )}

              <label>
                Email address
                <input
                  type="email"
                  placeholder="alex@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  placeholder="••••••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                  required
                />
              </label>

              {authMode === 'register' && (
                <>
                  <label>
                    Company name
                    <input
                      type="text"
                      placeholder="Acme Corp" value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})}
                    />
                  </label>

                  <label className="iq2-auth-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setChecked(
                          e.target.checked
                        )
                      }
                      required
                    />

                    <span>
                      I agree to the Terms of
                      Service and Privacy Policy.
                    </span>
                  </label>
                </>
              )}

              {authMode === 'login' && (
                <div
                  style={{
                    textAlign: 'right',
                    marginTop: -4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      border: 0,
                      background: 'transparent',
                      color: '#3358E8',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <div style={{color:'#b42318',background:'#fff0f0',padding:10,borderRadius:8,fontSize:12}}>{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="iq2-auth-submit"
              >
                {authMode === 'login'
                  ? 'Sign in →'
                  : 'Create account →'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setError('')
                  setSubmitting(true)
                  try {
                    await login('demo@viva.ai', 'demo123')
                    setAuthOpen(false)
                    window.scrollTo({top:0,left:0,behavior:'auto'})
                    onNavigate('dashboard')
                  } catch (err: any) {
                    setError(err.message || 'Demo login failed')
                  } finally { setSubmitting(false) }
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid rgba(51, 88, 232, 0.3)',
                  background: 'rgba(51, 88, 232, 0.06)',
                  color: '#3358E8',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                ⚡ Instant Demo Overview (Zero Setup)
              </button>

            </form>

            {/* Switch login/register */}
            <div className="iq2-auth-switch">
              {authMode === 'login' ? (
                <>
                  Don't have an account?{' '}

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setChecked(false)
                    }}
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}

                  <button
                    type="button"
                    onClick={() =>
                      setAuthMode('login')
                    }
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}