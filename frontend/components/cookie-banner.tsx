"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Shield, BarChart2 } from 'lucide-react'

type ConsentState = 'pending' | 'accepted' | 'declined'

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent') as ConsentState | null
    setConsent(stored ?? 'pending')
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setConsent('accepted')
  }

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setConsent('declined')
  }

  const visible = consent === 'pending'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="false"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="cookie-banner"
        >
          {/* Top row */}
          <div className="cookie-banner__header">
            <div className="cookie-banner__icon-wrap">
              <Cookie size={16} strokeWidth={2} />
            </div>
            <span className="cookie-banner__title">Cookie Preferences</span>
            <button
              onClick={handleDecline}
              aria-label="Close cookie banner"
              className="cookie-banner__close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <p className="cookie-banner__body">
            We use cookies to improve your navigation experience, remember your preferences and analyze how you interact with our platform.
          </p>

          {/* Expandable details */}
          <button
            className="cookie-banner__details-toggle"
            onClick={() => setShowDetails(v => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide details' : 'Learn more'} ↓
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="cookie-banner__details"
              >
                <div className="cookie-banner__detail-row">
                  <Shield size={12} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Essential</strong> — Required for basic site features like theme persistence and session management.
                  </div>
                </div>
                <div className="cookie-banner__detail-row">
                  <BarChart2 size={12} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Performance</strong> — Helps us understand how users interact with the app to improve its speed and reliability.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="cookie-banner__actions">
            <button
              id="cookie-decline"
              onClick={handleDecline}
              className="btn-secondary cookie-banner__btn-sm"
            >
              Decline
            </button>
            <button
              id="cookie-accept"
              onClick={handleAccept}
              className="btn-primary cookie-banner__btn-sm"
            >
              Accept all
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
