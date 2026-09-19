"use client"
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Shield, BarChart2 } from 'lucide-react'

type ConsentState = 'pending' | 'accepted' | 'declined'

export default function CookieBanner() {
  const t = useTranslations('CookieBanner')
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
          aria-label={t('aria')}
          aria-modal="false"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
          className="cookie-banner"
        >
          <div className="cookie-banner__header">
            <div className="cookie-banner__icon-wrap">
              <Cookie size={16} strokeWidth={2} />
            </div>
            <span className="cookie-banner__title">{t('title')}</span>
            <button
              onClick={handleDecline}
              aria-label={t('close')}
              className="cookie-banner__close"
            >
              <X size={14} />
            </button>
          </div>

          <p className="cookie-banner__body">
            {t('body')}
          </p>

          <button
            className="cookie-banner__details-toggle"
            onClick={() => setShowDetails(v => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? t('hide_details') : t('learn_more')} ↓
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
                    <strong>{t('essential')}</strong> — {t('essential_desc')}
                  </div>
                </div>
                <div className="cookie-banner__detail-row">
                  <BarChart2 size={12} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>{t('performance')}</strong> — {t('performance_desc')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="cookie-banner__actions">
            <button
              id="cookie-decline"
              onClick={handleDecline}
              className="btn-secondary cookie-banner__btn-sm"
            >
              {t('decline')}
            </button>
            <button
              id="cookie-accept"
              onClick={handleAccept}
              className="btn-primary cookie-banner__btn-sm"
            >
              {t('accept')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
