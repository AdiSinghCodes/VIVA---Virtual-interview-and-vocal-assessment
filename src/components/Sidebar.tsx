import type { Screen } from '../types'
import { useAuth } from '../context/AuthContext'
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  Mic,
  BarChart3,
  FileText,
  MessageCircleQuestion,
  Code2,
  X,
} from 'lucide-react'

const candidateNav: {
  id: Screen
  label: string
  icon: LucideIcon
}[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'interview-setup', label: 'Interview', icon: Mic },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'resume-analysis', label: 'Resume Analysis', icon: FileText },
  { id: 'chat', label: 'Ask your Doubt', icon: MessageCircleQuestion },
  { id: 'coding-assessment', label: 'Coding & SQL', icon: Code2 },
]



interface Props {
  current: Screen
  onNavigate: (s: Screen) => void
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

function NavItem({
  id,
  label,
  icon: Icon,
  current,
  onNavigate,
}: {
  id: Screen
  label: string
  icon: LucideIcon
  current: Screen
  onNavigate: (s: Screen) => void
}) {
  const active = current === id

  return (
    <button
      onClick={() => onNavigate(id)}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        margin: '2px 0',
        borderRadius: 10,
        border: 'none',
        background: active
          ? 'rgba(51,88,232,0.10)'
          : 'transparent',
        color: active ? '#3358E8' : '#5B6478',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        fontFamily: 'Inter',
        borderLeft: active
          ? '3px solid #3358E8'
          : '3px solid transparent',
        transition:
          'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      <span
        style={{
          width: 23,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2.25 : 2}
        />
      </span>

      {label}
    </button>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#8A93A5',
        letterSpacing: '0.09em',
        padding: '20px 14px 7px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  )
}

export default function Sidebar({
  current,
  onNavigate,
  isOpen,
  onClose,
  onLogout,
}: Props) {
  const { user } = useAuth()
  const fullName = (user?.profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`).trim() || 'Candidate'
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase() || 'C'
  return (
    <aside
      className="app-sidebar"
      style={{
        width: '320px',
        height: '100vh',
        background: '#FAF9F5',
        borderRight:
          '1px solid rgba(23,32,51,0.09)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
        overflowY: 'auto',
        boxShadow:
          '4px 0 22px rgba(23,32,51,0.04)',
        transform: isOpen
          ? 'translateX(0)'
          : 'translateX(-100%)',
        transition:
          'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <style>{`
        .app-sidebar {
          width: 320px !important;
        }

        .sidebar-logo {
          width: 220px;
          height: 125px;
          object-fit: contain;
          object-position: left center;
          display: block;
          transform: scale(1.15);
          transform-origin: left center;
        }

        .sidebar-profile:hover {
          background: rgba(51,88,232,0.06) !important;
        }

        .sidebar-close-btn:hover {
          background: #FFFFFF !important;
          border-color: rgba(51,88,232,0.20) !important;
          color: #3358E8 !important;
        }

        @media (min-width: 768px) {
          .sidebar-close-btn {
            display: none !important;
          }

          .app-main {
            margin-left: 320px !important;
          }

          .app-main > header {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .app-sidebar {
            display: none !important;
          }
        }
      `}</style>

      {/* VIVA logo */}
      <div
        style={{
          minHeight: 125,
          padding: '10px 20px',
          borderBottom:
            '1px solid rgba(23,32,51,0.09)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          aria-label="Go to home"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src="/viva-logo.png"
            alt="VIVA — Virtual Interview and Vocal Assessment"
            className="sidebar-logo"
          />
        </button>

        <button
          onClick={onClose}
          className="sidebar-close-btn"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border:
              '1px solid rgba(23,32,51,0.10)',
            background: 'rgba(255,255,255,0.65)',
            color: '#5B6478',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Close sidebar"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Main navigation */}
      <nav
        style={{
          flex: 1,
          padding: '8px 12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <SectionLabel label="Candidate" />

        {candidateNav.map(item => (
          <NavItem
            key={item.id}
            {...item}
            current={current}
            onNavigate={onNavigate}
          />
        ))}


      </nav>

      {/* User profile */}
      <div
        style={{
          padding: '12px 12px 14px',
          borderTop:
            '1px solid rgba(23,32,51,0.09)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onNavigate('profile')}
          aria-label="Open profile"
          className="sidebar-profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            width: '100%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 10,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #3358E8 0%, #7B5CFA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
              boxShadow:
                '0 4px 12px rgba(51,88,232,0.18)',
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#172033',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fullName}
            </div>

            <div
              style={{
                fontSize: 11,
                color: '#7B8497',
                marginTop: 2,
              }}
            >
              Candidate
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}