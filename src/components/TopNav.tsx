import type { Screen } from '../types'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Props {
  title: string
  onNavigate: (s: Screen) => void
  onMenuClick: () => void
}

export default function TopNav({ onNavigate }: Props) {
  const { user } = useAuth()
  const fullName = (user?.profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`).trim() || 'Candidate'
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase() || 'C'
  return (
    <header
      className="topnav-header"
      style={{
        height: 84,
        background: 'rgba(250, 249, 245, 0.97)',
        borderBottom: '1px solid rgba(23, 32, 51, 0.09)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 4px 18px rgba(23, 32, 51, 0.05)',
      }}
    >
      <style>{`
        /* Logo file is now cropped tight to its content — plain sizing works. */
        .topnav-logo-frame {
          height: 56px;
          width: 176px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .topnav-logo {
          display: block;
          height: 100%;
          width: auto;
          max-width: none;
          object-fit: contain;
          object-position: left center;
        }

        .topnav-action {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          border: 1px solid rgba(23, 32, 51, 0.09);
          background: #FFFFFF;
          color: #5B6478;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition:
            background 0.15s,
            border-color 0.15s;
        }

        .topnav-action:hover {
          background: #FAF9F5;
          border-color: rgba(51, 88, 232, 0.25);
        }

        .topnav-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            #3358E8 0%,
            #7B5CFA 100%
          );
          border: 2px solid #FFFFFF;
          box-shadow:
            0 4px 14px rgba(51, 88, 232, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #FFFFFF;
          cursor: pointer;
          flex-shrink: 0;
        }

        .topnav-signout {
          padding: 9px 14px;
          border-radius: 9px;
          border: 1px solid rgba(23, 32, 51, 0.11);
          background: #FFFFFF;
          color: #5B6478;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: Inter, sans-serif;
          transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s;
        }

        .topnav-signout:hover {
          background: #FAF9F5;
          border-color: rgba(51, 88, 232, 0.24);
          color: #3358E8;
        }

        @media (min-width: 768px) {
          /*
           * TopNav is mobile-only.
           * Desktop uses the left sidebar.
           */
          .topnav-header {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .topnav-logo-frame {
            height: 50px;
            width: 152px;
          }

          .topnav-action,
          .topnav-avatar {
            width: 38px;
            height: 38px;
          }

          .topnav-signout {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .topnav-logo-frame {
            height: 46px;
            width: 136px;
          }

          .topnav-right {
            gap: 6px !important;
          }
        }
      `}</style>

      {/* VIVA LOGO ONLY — no Dashboard/Profile/screen title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <div className="topnav-logo-frame">
          <img
            src="/viva-logo.png"
            alt="VIVA — Virtual Interview and Vocal Assessment"
            className="topnav-logo"
          />
        </div>
      </div>

      {/* Right side */}
      <div
        className="topnav-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          flexShrink: 0,
        }}
      >
        {/* Notifications */}
        <button
          className="topnav-action"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} strokeWidth={2} />

          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#7B5CFA',
              border: '2px solid #FAF9F5',
            }}
          />
        </button>

        {/* Profile */}
        <button
          onClick={() => onNavigate('profile')}
          aria-label="Open profile"
          className="topnav-avatar"
        >
          {initials}
        </button>

        {/* Sign out */}
        <button
          onClick={() => onNavigate('landing')}
          className="topnav-signout"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}