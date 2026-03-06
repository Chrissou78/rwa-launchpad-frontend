'use client';

import Link from 'next/link';
import { CalendarIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: 'future-of-real-estate-tokenization',
    title: 'The Future of Real Estate Tokenization in 2026',
    excerpt: 'Discover how blockchain technology is revolutionizing property ownership and creating new investment opportunities for everyday investors. We explore the latest trends and what to expect in the coming years.',
    category: 'Tokenization',
    date: '2026-02-20',
    readTime: '8 min read',
    featured: true
  },
  {
    id: 'understanding-kyc-requirements',
    title: 'Understanding KYC Requirements for Crypto Investments',
    excerpt: 'A comprehensive guide to KYC verification levels and why identity verification matters for your investment security and regulatory compliance.',
    category: 'Compliance',
    date: '2026-02-15',
    readTime: '5 min read'
  },
  {
    id: 'fractional-ownership-guide',
    title: 'Fractional Ownership: Democratizing Premium Investments',
    excerpt: 'Learn how tokenization makes high-value assets like commercial real estate and fine art accessible to investors with smaller portfolios.',
    category: 'Investment',
    date: '2026-02-10',
    readTime: '6 min read'
  },
  {
    id: 'smart-contracts-asset-management',
    title: 'How Smart Contracts Are Transforming Asset Management',
    excerpt: 'Explore how automated smart contracts handle dividends, voting rights, and transfers without intermediaries.',
    category: 'Technology',
    date: '2026-02-05',
    readTime: '7 min read'
  },
  {
    id: 'regulatory-landscape-2026',
    title: 'The Evolving Regulatory Landscape for Security Tokens',
    excerpt: 'An overview of global regulations affecting tokenized securities and what investors need to know to stay compliant.',
    category: 'Compliance',
    date: '2026-01-28',
    readTime: '10 min read'
  },
  {
    id: 'building-diversified-portfolio',
    title: 'Building a Diversified Portfolio with Tokenized Assets',
    excerpt: 'Strategies for balancing your investment portfolio with tokenized real estate, commodities, and other alternative assets.',
    category: 'Investment',
    date: '2026-01-20',
    readTime: '6 min read'
  },
];

const categories = ['All', ...Array.from(new Set(blogPosts.map(post => post.category)))];

export default function BlogPage() {
  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            RWA <span className="text-purple-400">Blog</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Insights, updates, and educational content about tokenization, blockchain, and real-world asset investing.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="mb-16">
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl overflow-hidden border border-purple-500/20">
              <div className="grid md:grid-cols-2 gap-8 p-8">
                <div className="relative h-64 md:h-full min-h-[280px] rounded-xl overflow-hidden bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-purple-300 text-sm">Featured Article</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-purple-400 text-sm font-medium bg-purple-400/10 px-3 py-1 rounded-full">
                      {featuredPost.category}
                    </span>
                    <span className="text-yellow-400 text-sm font-medium">Featured</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-300 mb-6 line-clamp-3">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {featuredPost.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <Link
                    href={`/blog/${featuredPost.id}`}
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium group"
                  >
                    Read Article
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularPosts.map((post) => (
            <article
              key={post.id}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-all group"
            >
              <div className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-600/50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <span className="text-purple-400 text-xs font-medium uppercase tracking-wider">
                  {post.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-2 mb-3 group-hover:text-purple-300 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {post.date}
                  </span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 text-center bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Stay Updated</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Subscribe to our newsletter for the latest insights on tokenization and RWA investing.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}