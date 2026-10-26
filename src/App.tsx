import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import type { Screen } from './types'
import Sidebar from './components/Sidebar'
import TopNav from './components/TopNav'
import MobileBottomNav from './components/MobileBottomNav'
import Landing from './screens/Landing'
import Dashboard from './screens/Dashboard'
import InterviewSetup from './screens/InterviewSetup'
import InterviewRoom from './screens/InterviewRoom'
import Reports from './screens/Reports'
import AIReview from './screens/AIReview'
import ResumeAnalysis from './screens/ResumeAnalysis'
import Courses from './screens/Courses'
import ProfileScreen from './screens/ProfileScreen'
import AskYourDoubt from './screens/AskYourDoubt'
import CodingSQLPractice from './screens/CodingSQLPractice'

const PUBLIC_SCREENS: Screen[] = ['landing']

const FULLSCREEN_SCREENS: Screen[] = [
  'interview-room',
  'excel-assessment',
  'sql-assessment',
]

const titles: Partial<Record<Screen, string>> = {
  dashboard: 'Dashboard',
  'interview-setup': 'Interview Setup',
  'interview-room': 'AI Interview Room',
  reports: 'Reports & Analytics',
  'ai-review': 'AI Review',
  'live-proctoring': 'Live Proctoring',
  'coding-assessment': 'Coding & SQL Sandbox',
  'excel-assessment': 'Excel Assessment',
  'sql-assessment': 'SQL Assessment',
  'resume-analysis': 'Resume Analysis',
  chat: 'Ask your Doubt',
  courses: 'Course Library',
  settings: 'Settings',
  profile: 'Profile',
}

function ScreenContent({
  screen,
  onNavigate,
  onLogout,
}: {
  screen: Screen
  onNavigate: (s: Screen) => void
  onLogout: () => void
}) {
  switch (screen) {
    case 'dashboard':
      return <Dashboard onNavigate={onNavigate} />

    case 'interview-setup':
      return <InterviewSetup onNavigate={onNavigate} />

    case 'reports':
      return <Reports onNavigate={onNavigate} />

    case 'ai-review':
      return <AIReview onNavigate={onNavigate} />

    case 'resume-analysis':
      return <ResumeAnalysis />

    case 'chat':
      return <AskYourDoubt />

    case 'coding-assessment':
      return <CodingSQLPractice onNavigate={onNavigate} />

    case 'courses':
      return <Courses onNavigate={onNavigate} />

    case 'profile':
      return (
        <ProfileScreen
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      )

    case 'settings':
      return (
        <div style={{ padding: 28 }}>
          <h2
            style={{
              fontFamily: 'Outfit',
              fontWeight: 700,
              fontSize: 24,
              color: '#f0f0ff',
              marginBottom: 8,
            }}
          >
            Settings
          </h2>

          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 14,
            }}
          >
            Account and preferences coming soon.
          </p>
        </div>
      )

    default:
      return null
  }
}

function FullscreenShell({
  screen,
  onNavigate,
  title,
}: {
  screen: Screen
  onNavigate: (s: Screen) => void
  title: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#06060f',
      }}
    >
      <div
        style={{
          height: 48,
          background: 'rgba(6,6,15,0.95)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            IQ
          </div>

          <span
            style={{
              fontFamily: 'Outfit',
              fontWeight: 700,
              fontSize: 14,
              color: '#e8e8f0',
            }}
          >
            {title}
          </span>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'Inter',
          }}
        >
          ← Exit
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
        }}
      >
      
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('landing')

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) setScreen('landing')
    else if (screen === 'landing') setScreen(user.profileCompleted ? 'dashboard' : 'profile')
  }, [user, loading])

  const navigate = (s: Screen) => {
    if (!user && !PUBLIC_SCREENS.includes(s)) return setScreen('landing')
    setScreen(s)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    setScreen('landing')
  }

  if (loading) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter'}}>Loading VIVA…</div>

  if (PUBLIC_SCREENS.includes(screen)) {
    return <Landing onNavigate={navigate} />
  }

  if (screen === 'interview-room') {
    return <InterviewRoom onNavigate={navigate} />
  }

  if (FULLSCREEN_SCREENS.includes(screen)) {
    const label = titles[screen] || ''

    return (
      <FullscreenShell
        screen={screen}
        onNavigate={navigate}
        title={label}
      />
    )
  }

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .app-sidebar {
            transform: translateX(0) !important;
          }

          .sidebar-backdrop {
            display: none !important;
          }

          .app-main {
            margin-left: var(--sidebar-width) !important;
          }

          .app-main-content {
            padding-bottom: 0 !important;
          }

          /* Mobile bottom navigation hidden on desktop */
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .app-sidebar {
            display: none !important;
          }

          .sidebar-backdrop {
            display: none !important;
          }

          .app-main-content {
            padding-bottom:
              calc(
                72px +
                env(safe-area-inset-bottom, 0px)
              );
          }

          /* Bottom navigation only on mobile */
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}</style>

      <div
        className="sidebar-backdrop"
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 39,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: sidebarOpen ? 'block' : 'none',
        }}
      />

      <Sidebar
        current={screen}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div
        className="app-main"
        style={{
          marginLeft: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: 'var(--background)',
          transition: 'margin-left 0.25s ease',
        }}
      >
        <TopNav
          title={titles[screen] || ''}
          onNavigate={navigate}
          onMenuClick={() =>
            setSidebarOpen(o => !o)
          }
        />

        <main
          className="app-main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <ScreenContent
            screen={screen}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        </main>
      </div>

      <MobileBottomNav
        current={screen}
        onNavigate={navigate}
      />
    </>
  )
}