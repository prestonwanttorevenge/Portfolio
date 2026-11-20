import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, Send, X } from 'lucide-react';
import { profileData } from '../data';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [botcheck, setBotcheck] = useState(false);
  const [status, setStatus] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accessKey = profileData.web3formsAccessKey?.trim() ?? '';

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setStatus('idle');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botcheck) return;

    if (!accessKey) {
      setStatus('error');
      setErrorMsg(
        'Contact form is not configured yet (missing Web3Forms Access Key). Please use direct email below.'
      );
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New portfolio message from ${name.trim()}`,
          from_name: 'Portfolio Contact',
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          botcheck: false,
        }),
      });

      const data = (await res.json()) as { success?: boolean; message?: string };

      if (res.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.message || 'Failed to send message. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error while sending message. Please try again or email directly.');
    }
  };

  return (
    <div
      className="contact-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="contact-modal">
        <div className="contact-header">
          <div>
            <span className="contact-tag">CONTACT_FORM</span>
            <h2 id="contact-modal-title" className="contact-title">
              Send a message
            </h2>
          </div>
          <button
            type="button"
            className="contact-close"
            onClick={onClose}
            aria-label="Close contact form"
          >
            <X size={16} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="contact-success">
            <CheckCircle2 size={32} className="contact-success-icon" />
            <h3>Message sent</h3>
            <p>
              Thanks <strong>{name}</strong>, your message has been delivered to{' '}
              <code>{profileData.email}</code>.
            </p>
            <div className="contact-actions">
              <button type="button" className="ctrl-btn" onClick={handleReset}>
                Send another
              </button>
              <button type="button" className="ctrl-btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <input
              type="checkbox"
              name="botcheck"
              checked={botcheck}
              onChange={(e) => setBotcheck(e.target.checked)}
              tabIndex={-1}
              autoComplete="off"
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <label className="contact-field">
              <span>Name</span>
              <input
                ref={nameInputRef}
                type="text"
                name="name"
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === 'submitting'}
              />
            </label>

            <label className="contact-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
              />
            </label>

            <label className="contact-field">
              <span>Message</span>
              <textarea
                name="message"
                required
                rows={4}
                placeholder="Tell me about your project, role, or idea..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === 'submitting'}
              />
            </label>

            {status === 'error' && (
              <div className="contact-error" role="alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="contact-footer">
              <a className="contact-direct" href={`mailto:${profileData.email}`}>
                <Mail size={13} />
                <span>{profileData.email}</span>
              </a>

              <button
                type="submit"
                className="contact-submit"
                disabled={status === 'submitting'}
              >
                <Send size={14} />
                <span>{status === 'submitting' ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
