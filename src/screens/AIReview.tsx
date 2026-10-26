import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (s: Screen) => void
}

interface Message {
  id: number
  role: 'viva' | 'user'
  text: string
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'viva',
    text: "Hi Alex! I'm VIVA. I can review your interview performance, explain your scores, and help you prepare for your next interview.",
  },
  {
    id: 2,
    role: 'user',
    text: 'Can you review my latest interview?',
  },
  {
    id: 3,
    role: 'viva',
    text: 'Sure. Your latest interview was strong overall. Your communication and confidence stood out, while your technical answers could be more structured.',
  },
]

const quickQuestions = [
  'What should I improve?',
  'Why was my score low?',
  'How can I prepare better?',
  'What were my strengths?',
]

export default function AIReview({ onNavigate }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = messagesRef.current

    if (!element) return

    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isTyping])

  const sendMessage = (message?: string) => {
    const text = (message ?? input).trim()

    if (!text || isTyping) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: 'viva',
        text: getVivaResponse(text),
      }

      setMessages(prev => [...prev, reply])
      setIsTyping(false)
    }, 700)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const handleInput = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(event.target.value)

    const textarea = event.target

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 90)}px`
  }

  return (
    <div className="ai-review-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .ai-review-page {
          width: 100%;
          min-height: 100%;
          background: #FAF9F5;
          color: #172033;
          font-family: Inter, sans-serif;
          padding: 14px 20px 18px;

          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        .ai-review-container {
          width: 100%;
          max-width: 1280px;
          height: calc(100vh - 90px);
          min-height: 0;
          margin: 0 auto;

          display: flex;
          flex-direction: column;
        }

        /* --------------------------------
           Page heading
        -------------------------------- */

        .ai-review-heading {
          flex-shrink: 0;
          margin-bottom: 9px;
        }

        .ai-review-eyebrow {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #3358E8;
          margin-bottom: 3px;
        }

        .ai-review-title {
          margin: 0;
          font-family: Outfit, Inter, sans-serif;
          font-size: 25px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #172033;
        }

        .ai-review-subtitle {
          margin: 3px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.4;
        }

        /* --------------------------------
           Main layout
        -------------------------------- */

        .ai-review-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 290px;
          gap: 14px;

          flex: 1;
          min-height: 0;
          align-items: stretch;
        }

        /* --------------------------------
           Chat
        -------------------------------- */

        .chat-main {
          width: 100%;
          height: 100%;
          min-height: 0;

          background: #FFFFFF;
          border: 1px solid rgba(23, 32, 51, 0.09);
          border-radius: 15px;

          display: flex;
          flex-direction: column;

          overflow: hidden;

          box-shadow:
            0 4px 20px rgba(23, 32, 51, 0.045);
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;

          padding: 10px 13px;

          border-bottom: 1px solid rgba(23, 32, 51, 0.07);

          flex-shrink: 0;
        }

        .chat-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;

          background:
            linear-gradient(
              135deg,
              #3358E8 0%,
              #7B5CFA 100%
            );

          display: flex;
          align-items: center;
          justify-content: center;

          color: #FFFFFF;
          font-size: 13px;
          font-weight: 800;

          box-shadow:
            0 4px 12px rgba(51, 88, 232, 0.18);

          flex-shrink: 0;
        }

        .chat-header-name {
          font-size: 13px;
          font-weight: 700;
          color: #172033;
        }

        .chat-header-status {
          display: flex;
          align-items: center;
          gap: 5px;

          margin-top: 2px;

          font-size: 10px;
          color: #7B8497;
        }

        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #35A56A;
        }

        /* --------------------------------
           Messages
        -------------------------------- */

        .chat-messages {
          flex: 0 1 auto;
          min-height: 0;

          overflow-y: auto;

          padding: 13px 17px 3px;

          display: flex;
          flex-direction: column;
          gap: 8px;

          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;

          scrollbar-width: thin;
        }

        .chat-message-row {
          width: 100%;
          display: flex;
        }

        .chat-message-row.viva {
          justify-content: flex-start;
        }

        .chat-message-row.user {
          justify-content: flex-end;
        }

        .chat-message {
          max-width: 76%;

          padding: 9px 11px;

          border-radius: 12px;

          font-size: 13px;
          line-height: 1.5;

          word-break: break-word;
        }

        .chat-message.viva {
          background: #F4F5F8;
          color: #293246;
          border-bottom-left-radius: 4px;
        }

        .chat-message.user {
          background: #3358E8;
          color: #FFFFFF;
          border-bottom-right-radius: 4px;
        }

        .message-label {
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 3px;
          opacity: 0.7;
        }

        /* --------------------------------
           Typing
        -------------------------------- */

        .typing-row {
          display: flex;
          justify-content: flex-start;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 4px;

          padding: 10px 12px;

          background: #F4F5F8;
          border-radius: 12px;
          border-bottom-left-radius: 4px;
        }

        .typing span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #8A93A5;

          animation: typing 1.2s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }

          30% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }

        /* --------------------------------
           Composer
           Directly below previous message
        -------------------------------- */

        .chat-input-area {
          flex: 0 0 auto;
          padding: 4px 9px 8px;
          background: #FFFFFF;
        }

        .chat-input-wrap {
          display: flex;
          align-items: flex-end;
          gap: 7px;

          min-height: 44px;

          padding: 4px 5px 4px 11px;

          border: 1px solid rgba(23, 32, 51, 0.12);
          border-radius: 12px;

          background: #FAF9F5;

          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }

        .chat-input-wrap:focus-within {
          border-color: rgba(51, 88, 232, 0.45);

          box-shadow:
            0 0 0 3px rgba(51, 88, 232, 0.07);
        }

        .chat-input {
          flex: 1;
          min-width: 0;

          border: none;
          outline: none;
          resize: none;

          background: transparent;
          color: #172033;

          font-family: Inter, sans-serif;

          /*
           * Keep 16px on mobile so iOS doesn't
           * zoom the page when the input is focused.
           */
          font-size: 16px !important;
          line-height: 1.4;

          max-height: 90px;

          padding: 5px 0;
        }

        .chat-input::placeholder {
          color: #9AA1AE;
        }

        .chat-send {
          width: 35px;
          height: 35px;

          border: none;
          border-radius: 9px;

          background: #3358E8;
          color: #FFFFFF;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;

          flex-shrink: 0;

          transition:
            transform 0.12s,
            background 0.12s,
            opacity 0.12s;
        }

        .chat-send:hover:not(:disabled) {
          background: #2949C7;
          transform: translateY(-1px);
        }

        .chat-send:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .chat-send-icon {
          font-size: 17px;
          line-height: 1;
        }

        .chat-helper {
          text-align: center;
          margin-top: 3px;

          font-size: 9px;
          color: #9AA1AE;
        }

        /* --------------------------------
           Side panel
        -------------------------------- */

        .chat-side {
          display: flex;
          flex-direction: column;
          gap: 10px;

          min-width: 0;
        }

        .side-card {
          background: #FFFFFF;

          border: 1px solid rgba(23, 32, 51, 0.09);
          border-radius: 13px;

          padding: 13px;

          box-shadow:
            0 3px 14px rgba(23, 32, 51, 0.035);
        }

        .side-card-title {
          font-size: 12px;
          font-weight: 700;
          color: #172033;

          margin-bottom: 9px;
        }

        .side-card-text {
          font-size: 11px;
          line-height: 1.5;
          color: #727B8D;
        }

        .quick-question {
          width: 100%;

          padding: 8px 9px;

          border: 1px solid rgba(23, 32, 51, 0.08);
          border-radius: 8px;

          background: #FAF9F5;

          color: #4E586B;

          text-align: left;

          font-family: Inter, sans-serif;
          font-size: 11px;

          cursor: pointer;

          transition:
            background 0.12s,
            border-color 0.12s;
        }

        .quick-question:hover {
          background: rgba(51, 88, 232, 0.06);
          border-color: rgba(51, 88, 232, 0.16);
          color: #3358E8;
        }

        .quick-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .review-button {
          width: 100%;

          padding: 10px 12px;

          border: none;
          border-radius: 9px;

          background: #3358E8;
          color: #FFFFFF;

          font-family: Inter, sans-serif;
          font-size: 12px;
          font-weight: 700;

          cursor: pointer;
        }

        .review-button:hover {
          background: #2949C7;
        }

        /* --------------------------------
           Tablet
        -------------------------------- */

        @media (max-width: 950px) {
          .ai-review-layout {
            grid-template-columns: 1fr;
          }

          .chat-side {
            display: none;
          }

          .chat-message {
            max-width: 82%;
          }
        }

        /* --------------------------------
           Mobile
        -------------------------------- */

        @media (max-width: 767px) {
          .ai-review-page {
            width: 100%;
            min-height: calc(
              100dvh -
              var(--topnav-height, 76px) -
              72px
            );

            height: calc(
              100dvh -
              var(--topnav-height, 76px) -
              72px
            );

            padding:
              7px
              7px
              calc(
                76px +
                env(safe-area-inset-bottom, 0px)
              );

            overflow: hidden;
          }

          .ai-review-container {
            width: 100%;
            height: 100%;
            max-width: none;
          }

          .ai-review-heading {
            margin-bottom: 6px;
          }

          .ai-review-eyebrow {
            font-size: 8px;
            margin-bottom: 2px;
          }

          .ai-review-title {
            font-size: 21px;
          }

          .ai-review-subtitle {
            font-size: 10.5px;
            line-height: 1.35;
            margin-top: 2px;
          }

          .ai-review-layout {
            display: block;

            width: 100%;
            height: 100%;

            min-height: 0;
          }

          .chat-main {
            width: 100%;
            height: 100%;
            min-height: 0;
            max-height: none;

            border-radius: 12px;
          }

          .chat-header {
            padding: 8px 10px;
          }

          .chat-avatar {
            width: 31px;
            height: 31px;
            border-radius: 8px;
            font-size: 12px;
          }

          .chat-header-name {
            font-size: 12px;
          }

          .chat-header-status {
            font-size: 9px;
          }

          .chat-messages {
            padding: 9px 8px 2px;
            gap: 6px;

            /*
             * Do not force the messages to consume
             * the entire screen when there are only
             * a few messages.
             */
            flex: 0 1 auto;
          }

          .chat-message {
            max-width: 90%;

            padding: 8px 9px;

            font-size: 13px;
            line-height: 1.45;
          }

          .message-label {
            font-size: 8px;
          }

          .chat-input-area {
            padding: 3px 5px 5px;
          }

          .chat-input-wrap {
            min-height: 44px;
            padding: 4px 5px 4px 10px;
            border-radius: 11px;
          }

          .chat-input {
            font-size: 16px !important;
            line-height: 1.35;
            max-height: 75px;
          }

          .chat-send {
            width: 34px;
            height: 34px;
            border-radius: 8px;
          }

          .chat-helper {
            display: none;
          }

          .chat-side {
            display: none;
          }
        }

        /* --------------------------------
           Small phones
        -------------------------------- */

        @media (max-width: 420px) {
          .ai-review-page {
            padding-left: 5px;
            padding-right: 5px;
          }

          .ai-review-title {
            font-size: 20px;
          }

          .ai-review-subtitle {
            font-size: 10px;
          }

          .chat-messages {
            padding-left: 7px;
            padding-right: 7px;
          }

          .chat-message {
            max-width: 92%;
          }
        }
      `}</style>

      <div className="ai-review-container">

        {/* Page heading */}
        <div className="ai-review-heading">
          <div className="ai-review-eyebrow">
            AI REVIEW
          </div>

          <h1 className="ai-review-title">
            Chat with VIVA
          </h1>

          <p className="ai-review-subtitle">
            Ask about your interviews, scores, strengths and areas to improve.
          </p>
        </div>

        <div className="ai-review-layout">

          {/* Main chat */}
          <section className="chat-main">

            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-avatar">
                V
              </div>

              <div>
                <div className="chat-header-name">
                  VIVA
                </div>

                <div className="chat-header-status">
                  <span className="online-dot" />
                  Interview assistant
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesRef}
              className="chat-messages"
            >
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`chat-message-row ${message.role}`}
                >
                  <div
                    className={`chat-message ${message.role}`}
                  >
                    <div className="message-label">
                      {message.role === 'viva'
                        ? 'VIVA'
                        : 'You'}
                    </div>

                    {message.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="typing-row">
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            {/* Input directly after messages */}
            <div className="chat-input-area">
              <div className="chat-input-wrap">

                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask VIVA anything..."
                  rows={1}
                  aria-label="Message VIVA"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="on"
                  spellCheck
                />

                <button
                  className="chat-send"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  aria-label="Send message"
                >
                  <span className="chat-send-icon">
                    ↑
                  </span>
                </button>
              </div>

              <div className="chat-helper">
                Press Enter to send · Shift + Enter for a new line
              </div>
            </div>
          </section>

          {/* Desktop side panel */}
          <aside className="chat-side">

            <div className="side-card">
              <div className="side-card-title">
                Review your interview
              </div>

              <div className="side-card-text">
                Ask VIVA about your latest interview
                performance, scores and feedback.
              </div>
            </div>

            <div className="side-card">
              <div className="side-card-title">
                Quick questions
              </div>

              <div className="quick-list">
                {quickQuestions.map(question => (
                  <button
                    key={question}
                    className="quick-question"
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="side-card">
              <div className="side-card-title">
                Interview review
              </div>

              <div className="side-card-text">
                Want a complete review of your latest
                interview?
              </div>

              <button
                className="review-button"
                onClick={() =>
                  onNavigate('reports')
                }
                style={{ marginTop: 10 }}
              >
                View interview report
              </button>
            </div>

          </aside>
        </div>
      </div>
    </div>
  )
}

function getVivaResponse(question: string): string {
  const text = question.toLowerCase()

  if (
    text.includes('improve') ||
    text.includes('weak') ||
    text.includes('better')
  ) {
    return 'Focus first on structuring your technical answers. Start with your approach, explain why you chose it, and finish with the result. This will make your answers clearer and more convincing.'
  }

  if (
    text.includes('score') ||
    text.includes('low')
  ) {
    return 'Your score was mainly affected by answer structure and depth. Your communication was good, but some technical answers needed more specific examples and clearer reasoning.'
  }

  if (
    text.includes('strength') ||
    text.includes('good')
  ) {
    return 'Your strongest areas were communication, confidence and staying engaged during the conversation. You also explained your experience naturally.'
  }

  if (
    text.includes('prepare') ||
    text.includes('preparation')
  ) {
    return 'For your next interview, spend some time practising structured technical answers and prepare two or three strong examples from your previous work.'
  }

  return 'Based on your interview history, I would focus on making your answers more structured and specific. If you want, ask me about your strengths, weaknesses, score, or preparation plan.'
}