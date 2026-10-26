import type { Screen } from '../types'
import {
  Home,
  BarChart3,
  Mic,
  User,
  MessageCircleQuestion,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  current: Screen
  onNavigate: (s: Screen) => void
}

const HOME_SCREENS: Screen[] = [
  'dashboard',
]

const REPORTS_SCREENS: Screen[] = [
  'reports',
]

const INTERVIEW_SCREENS: Screen[] = [
  'interview-setup',
  'interview-room',
]

const CHAT_SCREENS: Screen[] = [
  'chat',
  'ai-review',
]

const PROFILE_SCREENS: Screen[] = [
  'profile',
  'resume-analysis',
  'coding-assessment',
  'excel-assessment',
  'sql-assessment',
  'settings',
]

function SideItem({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      style={{
        width: 58,
        height: 54,
        padding: 0,
        margin: 0,

        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',

        border: 'none',
        outline: 'none',
        background: 'transparent',

        cursor: 'pointer',
        flexShrink: 0,

        color: active ? '#172033' : '#8A8790',
      }}
    >
      <Icon
        size={25}
        strokeWidth={active ? 2.4 : 1.9}
        color={active ? '#172033' : '#8A8790'}
      />

      <span
        style={{
          marginTop: 3,
          fontSize: 9.5,
          lineHeight: 1,
          fontWeight: active ? 700 : 500,
          fontFamily: 'Inter, sans-serif',
          color: 'inherit',
        }}
      >
        {label}
      </span>
    </button>
  )
}

export default function MobileBottomNav({
  current,
  onNavigate,
}: Props) {
  const homeActive =
    HOME_SCREENS.includes(current)

  const reportsActive =
    REPORTS_SCREENS.includes(current)

  const interviewActive =
    INTERVIEW_SCREENS.includes(current)

  const chatActive =
    CHAT_SCREENS.includes(current)

  const profileActive =
    PROFILE_SCREENS.includes(current)

  return (
    <>
      <style>{`

        /*
         * MOBILE BOTTOM NAV
         *
         * IMPORTANT:
         * position fixed + inset values prevent the
         * navigation from moving with page content.
         */

        .mobile-bottom-nav {
          display: none;
        }

        @media (max-width: 767px) {

          .mobile-bottom-nav {
            position: fixed !important;

            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            top: auto !important;

            width: 100vw !important;

            display: flex !important;

            z-index: 99999 !important;

            box-sizing: border-box !important;

            transform: translateZ(0);
            -webkit-transform: translateZ(0);

            isolation: isolate;
          }

          /*
           * Give the page enough bottom space so content
           * doesn't disappear underneath the navigation.
           */
          .app-main-content {
            padding-bottom:
              calc(
                82px +
                env(safe-area-inset-bottom, 0px)
              ) !important;
          }

          /*
           * Prevent horizontal overflow.
           */
          html,
          body,
          #root {
            max-width: 100%;
            overflow-x: hidden;
          }
        }

      `}</style>

      <nav
        className="mobile-bottom-nav"
        aria-label="Primary navigation"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,

          width: '100vw',

          minHeight: 70,

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',

          paddingTop: 5,
          paddingLeft: 8,
          paddingRight: 8,
          paddingBottom:
            'calc(5px + env(safe-area-inset-bottom, 0px))',

          background: '#FAF9F5',

          borderTop:
            '1px solid rgba(23,32,51,0.09)',

          boxShadow:
            '0 -4px 18px rgba(23,32,51,0.06)',

          boxSizing: 'border-box',

          zIndex: 99999,
        }}
      >

        {/* HOME */}

        <SideItem
          label="Home"
          active={homeActive}
          icon={Home}
          onClick={() =>
            onNavigate('dashboard')
          }
        />


        {/* REPORTS */}

        <SideItem
          label="Reports"
          active={reportsActive}
          icon={BarChart3}
          onClick={() =>
            onNavigate('reports')
          }
        />


        {/* CENTER INTERVIEW BUTTON */}

        <div
          style={{
            width: 60,
            height: 60,

            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            flexShrink: 0,

            transform: 'translateY(-12px)',
          }}
        >
          <button
            type="button"
            onClick={() =>
              onNavigate('interview-setup')
            }
            aria-label="Start interview"
            aria-current={
              interviewActive
                ? 'page'
                : undefined
            }
            style={{
              width: 56,
              height: 56,

              padding: 0,

              borderRadius: '50%',

              border:
                '3px solid #FAF9F5',

              background:
                'linear-gradient(135deg, #3358E8 0%, #7B5CFA 100%)',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              cursor: 'pointer',

              boxShadow:
                interviewActive
                  ? '0 7px 24px rgba(51,88,232,0.42)'
                  : '0 5px 18px rgba(51,88,232,0.28)',
            }}
          >
            <Mic
              size={24}
              strokeWidth={2.2}
              color="#FFFFFF"
            />
          </button>
        </div>


        {/* CHAT */}

        <SideItem
          label="Doubts"
          active={chatActive}
          icon={MessageCircleQuestion}
          onClick={() =>
            onNavigate('chat')
          }
        />


        {/* PROFILE */}

        <SideItem
          label="Profile"
          active={profileActive}
          icon={User}
          onClick={() =>
            onNavigate('profile')
          }
        />

      </nav>
    </>
  )
}