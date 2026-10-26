// components/MeetingIcons.tsx
// Clean line-style icons for the interview/meeting room, matching the
// visual weight of Google Meet / Microsoft Teams controls.
// Pure inline SVG — no external images, no emoji, fully recolorable via `color`.

interface IconProps {
    size?: number
    color?: string
}

export function MicIcon({ size = 20, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
            <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M8.5 21h7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function MicOffIcon({ size = 20, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 9v2a3 3 0 0 0 4.6 2.55" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M15 6.5V5a3 3 0 0 0-5.9-.8" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M5 11a7 7 0 0 0 10.6 6" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M19 11a7 7 0 0 1-.34 2.15" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M8.5 21h7" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function VideoIcon({ size = 20, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="6" width="14" height="12" rx="3" fill={color} />
            <path d="M16 10.5l5.2-3a1 1 0 0 1 1.5.87v9.26a1 1 0 0 1-1.5.87l-5.2-3z" fill={color} />
        </svg>
    )
}

export function VideoOffIcon({ size = 20, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8.5A2.5 2.5 0 0 1 4.5 6h6A2.5 2.5 0 0 1 13 8.5v.7l-1.5-.9m1.5 4.9v1.3A2.5 2.5 0 0 1 10.5 18h-6A2.5 2.5 0 0 1 2 15.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M16 10.5l5.2-3a1 1 0 0 1 1.5.87v9.26a1 1 0 0 1-1.5.87L16 15.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function ScreenShareIcon({ size = 20, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="13" rx="2" stroke={color} strokeWidth="2" fill="none" />
            <path d="M8 21h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 8v5m0-5l-2.5 2.5M12 8l2.5 2.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function LeaveCallIcon({ size = 22, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M3.5 12.5c2.6-2.4 5.6-3.6 8.5-3.6s5.9 1.2 8.5 3.6c.5.45.5 1.2.05 1.68l-2.1 2.24a1.1 1.1 0 0 1-1.5.1l-2.2-1.75a1.1 1.1 0 0 1-.4-1.03l.27-1.8a10.2 10.2 0 0 0-4.64 0l.27 1.8c.07.4-.08.8-.4 1.03l-2.2 1.75a1.1 1.1 0 0 1-1.5-.1l-2.1-2.24a1.15 1.15 0 0 1 .05-1.68z"
                fill={color}
            />
        </svg>
    )
}

export function BotAvatarIcon({ size = 44, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="16" height="12" rx="4" stroke={color} strokeWidth="1.6" fill="none" />
            <path d="M12 8V4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="3" r="1.4" fill={color} />
            <circle cx="9" cy="14" r="1.6" fill={color} />
            <circle cx="15" cy="14" r="1.6" fill={color} />
            <path d="M9.5 17.5c.8.6 1.7.9 2.5.9s1.7-.3 2.5-.9" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M2 13h2M20 13h2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

export function UserAvatarIcon({ size = 56, color = '#fff' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" fill={color} />
            <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" fill={color} />
        </svg>
    )
}

export function CameraOffGlyph({ size = 40, color = 'rgba(255,255,255,0.35)' }: IconProps) {
    return <VideoOffIcon size={size} color={color} />
}
