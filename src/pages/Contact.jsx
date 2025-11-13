import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer, Card, Button } from '../cleverpixel-design-system/src';

export default function Contact() {
  const [result, setResult] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target);
    formData.append("access_key", "ee96c239-0d68-44f8-bc82-47014c18a7cb");

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      setResult("Form Submitted Successfully");
      event.target.reset();
    } else {
      setResult("Error submitting form. Please try again.");
    }
  };

  return (
    <div className="w-screen min-h-screen">
      <Header 
        navItems={[
          { href: '/', label: 'Home' },
          { href: '#work', label: 'Work' },
          { href: '#about', label: 'About' },
        ]}
        onContactClick={() => navigate('/contact')}
      />
      
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-10 pb-16">
        <section className="rounded-3xl bg-white shadow-md border border-slate-200 px-4 py-5 md:px-6 md:py-7">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
              Get in Touch
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl">
              Have a question or want to work together? Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition"
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
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition"
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
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cp-blue)] focus:border-transparent transition resize-y"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="bg-[var(--cp-ink)] hover:opacity-90 text-white"
              >
                Submit Form
              </Button>
              {result && (
                <span className={`text-sm font-medium ${
                  result === "Form Submitted Successfully" 
                    ? "text-[var(--cp-green)]" 
                    : result === "Sending...."
                    ? "text-slate-600"
                    : "text-[var(--cp-red)]"
                }`}>
                  {result}
                </span>
              )}
            </div>
          </form>
        </section>
      </main>
      
      <Footer 
        links={[
          { href: '/', label: 'Home' },
          { href: '/contact', label: 'Contact' },
        ]}
        copyrightText="Crafted with playful precision"
      />
    </div>
  );
}

