'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import {
  Send,
  Mail,
  MessageSquare,
  Building2,
  User,
  Phone,
  Globe,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Linkedin,
  Twitter,
  ArrowRight,
  Briefcase,
  Zap,
  Users,
  TrendingUp,
  HelpCircle
} from 'lucide-react';

export default function ContactPage() {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    subject: '',
    lookingFor: [] as string[],
    message: '',
    preferredContact: 'email',
    budget: '',
    timeline: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjects = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'tokenisation', label: 'Asset Tokenisation' },
    { value: 'crowdfunding', label: 'Crowdfunding / Fundraising' },
    { value: 'technical', label: 'Technical Solution' },
    { value: 'partnership', label: 'Partnership Opportunity' },
    { value: 'support', label: 'Platform Support' },
    { value: 'other', label: 'Other' }
  ];

  const lookingForOptions = [
    { value: 'technical', label: 'Technical Solution', icon: <Zap className="w-4 h-4" /> },
    { value: 'marketing', label: 'Marketing & GTM', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'partnerships', label: 'Partnerships & Contacts', icon: <Users className="w-4 h-4" /> },
    { value: 'team', label: 'Team Building', icon: <User className="w-4 h-4" /> },
    { value: 'funding', label: 'Funding', icon: <Briefcase className="w-4 h-4" /> },
    { value: 'consulting', label: 'Consulting / Advisory', icon: <HelpCircle className="w-4 h-4" /> }
  ];

  const budgetRanges = [
    { value: 'under_10k', label: 'Under $10,000' },
    { value: '10k_50k', label: '$10,000 - $50,000' },
    { value: '50k_100k', label: '$50,000 - $100,000' },
    { value: '100k_500k', label: '$100,000 - $500,000' },
    { value: 'over_500k', label: 'Over $500,000' },
    { value: 'not_sure', label: 'Not sure yet' }
  ];

  const timelines = [
    { value: 'asap', label: 'As soon as possible' },
    { value: '1_month', label: 'Within 1 month' },
    { value: '1_3_months', label: '1-3 months' },
    { value: '3_6_months', label: '3-6 months' },
    { value: '6_plus', label: '6+ months' },
    { value: 'exploring', label: 'Just exploring' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLookingForToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(value)
        ? prev.lookingFor.filter(v => v !== value)
        : [...prev.lookingFor, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Send to backend / email service
    console.log('Contact form submitted:', { ...formData, walletAddress: address });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Let's Talk
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Have a project in mind? Questions about tokenisation? 
            We're here to help you navigate the world of real-world assets.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Message Sent!</h2>
                <p className="text-gray-400 mb-6">
                  Thank you for reaching out. Our team will review your message and get back to you within 24-48 hours.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        company: '',
                        phone: '',
                        website: '',
                        subject: '',
                        lookingFor: [],
                        message: '',
                        preferredContact: 'email',
                        budget: '',
                        timeline: ''
                      });
                    }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    Send Another Message
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-400" />
                    Your Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Company / Organization</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                        placeholder="Your Company Ltd."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                </div>

                {/* What are you looking for */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2 text-purple-400" />
                    What Are You Looking For?
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">Select all that apply</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {lookingForOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleLookingForToggle(option.value)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                          formData.lookingFor.includes(option.value)
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {option.icon}
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Details */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-green-400" />
                    Project Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Subject *</label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition"
                      >
                        <option value="">Select a subject...</option>
                        {subjects.map((subject) => (
                          <option key={subject.value} value={subject.value}>
                            {subject.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Budget Range</label>
                        <select
                          name="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition"
                        >
                          <option value="">Select budget range...</option>
                          {budgetRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Timeline</label>
                        <select
                          name="timeline"
                          value={formData.timeline}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition"
                        >
                          <option value="">Select timeline...</option>
                          {timelines.map((timeline) => (
                            <option key={timeline.value} value={timeline.value}>
                              {timeline.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Your Message *</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition resize-none"
                        placeholder="Tell us about your project, goals, and how we can help..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Preferred Contact Method</label>
                      <div className="flex gap-4">
                        {['email', 'phone', 'video'].map((method) => (
                          <label key={method} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="preferredContact"
                              value={method}
                              checked={formData.preferredContact === method}
                              onChange={handleChange}
                              className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-300 capitalize">{method === 'video' ? 'Video Call' : method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Address (if connected) */}
                {address && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Connected Wallet:</span>
                      <span className="text-white font-mono">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <a href="mailto:contact@rwaexperts.com" className="text-white hover:text-blue-400 transition">
                      contact@rwaexperts.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Telegram</div>
                    <a href="https://t.me/rwaexperts" target="_blank" rel="noopener noreferrer" className="text-white hover:text-green-400 transition">
                      @rwaexperts
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <span className="text-white">Global / Remote</span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="text-sm text-gray-500 mb-3">Follow Us</div>
                <div className="flex gap-3">
                  <a
                    href="https://linkedin.com/company/rwaexperts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-blue-600 rounded-lg text-gray-400 hover:text-white transition"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="https://twitter.com/rwaexperts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-blue-400 rounded-lg text-gray-400 hover:text-white transition"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-yellow-400" />
                Response Time
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                We typically respond to inquiries within 24-48 hours during business days.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">General Inquiries</span>
                  <span className="text-white">24-48 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Technical Support</span>
                  <span className="text-white">12-24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Partnership Requests</span>
                  <span className="text-white">48-72 hours</span>
                </div>
              </div>
            </div>

            {/* Schedule a Call */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                Schedule a Call
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Prefer a direct conversation? Book a 30-minute consultation with our team.
              </p>
              <a
                href="https://calendly.com/rwaexperts"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg transition"
              >
                Book a Meeting
              </a>
            </div>

            {/* FAQ Link */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Have Questions?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Check our FAQ section for answers to common questions about tokenisation and our platform.
              </p>
              <Link
                href="/faq"
                className="inline-flex items-center text-blue-400 hover:text-blue-300 transition text-sm"
              >
                View FAQ <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
