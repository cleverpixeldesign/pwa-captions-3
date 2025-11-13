import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer, Card, Button } from '../cleverpixel-design-system/src';
import InstallButton from '../components/InstallButton';

export default function Contact() {
  const [result, setResult] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setResult("Sending....");
    
    try {
      const formData = new FormData(event.target);
      // Use environment variable for API key (fallback for development)
      const apiKey = import.meta.env.VITE_WEB3FORMS_KEY || "ee96c239-0d68-44f8-bc82-47014c18a7cb";
      formData.append("access_key", apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setIsSuccess(true);
        setResult("Form Submitted Successfully");
        event.target.reset();
      } else {
        setResult("Error submitting form. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setResult("Request timed out. Please try again.");
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setResult("Network error. Please check your connection.");
      } else {
        setResult("Error submitting form. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setIsSuccess(false);
    setResult("");
    setIsSubmitting(false);
  };

  return (
    <div className="w-screen min-h-screen">
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--cp-blue)] focus:text-white focus:rounded-md focus:font-semibold"
      >
        Skip to main content
      </a>
      
      <Header 
        navItems={[
          { href: '/', label: 'Home' },
        ]}
        onContactClick={() => navigate('/contact')}
      />
      
      <InstallButton />
      
      <main id="main-content" className="max-w-3xl mx-auto px-4 md:px-6 pt-10 pb-16">
        {isSuccess ? (
          <section className="rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7">
            <div className="text-center py-8 md:py-12">
              {/* Success Icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <svg
                  className="h-10 w-10 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Success Message */}
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
                Message Sent Successfully!
              </h2>
              <p className="text-base md:text-lg text-slate-600 mb-8 max-w-md mx-auto">
                Thanks for reaching out! We've received your message and will get back to you as soon as possible.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={handleSubmitAnother}
                  variant="primary"
                  className="bg-[var(--cp-ink)] hover:opacity-90 text-white w-full sm:w-auto"
                >
                  Send Another Message
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Get in Touch
              </h1>
              <p className="text-sm md:text-base text-slate-600 max-w-xl">
                Have a question or feedback? Send a message to connect!
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" noValidate aria-label="Contact form">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Tell us what's on your mind..."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  aria-label={isSubmitting ? "Submitting form" : "Submit contact form"}
                  className="bg-[var(--cp-ink)] hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto min-h-[44px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Submit Form"
                  )}
                </Button>
                {result && !isSubmitting && result !== "Form Submitted Successfully" && (
                  <span 
                    className="text-sm font-medium text-[var(--cp-red)]"
                    role="alert"
                    aria-live="assertive"
                  >
                    {result}
                  </span>
                )}
              </div>
            </form>
          </section>
        )}
      </main>
      
      <Footer 
        links={[
          { href: '/', label: 'Home' },
          { href: '/contact', label: 'Contact' },
          { href: 'https://buymeacoffee.com/michellereeves', label: '☕ Buy Me a Coffee', target: '_blank', rel: 'noopener noreferrer' },
        ]}
        copyrightText="Crafted with playful precision"
      />
    </div>
  );
}

