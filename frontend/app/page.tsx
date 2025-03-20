import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="mr-2 w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold">
            FD
          </div>
          <span className="text-xl font-bold">Funnel<span className="accent">Doctor</span></span>
        </div>
        
        <div className="navbar-menu">
          <a href="#" className="navbar-item active">Home</a>
          <a href="#" className="navbar-item">Features</a>
          <a href="#" className="navbar-item">Resources</a>
          <a href="#" className="navbar-item">Pricing</a>
          <a href="#" className="navbar-item">Contact</a>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/auth/login" className="text-text-secondary hover:text-primary transition-colors duration-200">Se connecter</Link>
          <Link href="/dashboard" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="badge">NEW</div>
        <h1 className="hero-title">
          The #1 YouTube <span className="accent">Funnel Analytics Tool</span>
        </h1>
        <p className="hero-subtitle">
          Track leads from YouTube to sales, identify leaks, and close more deals. All from a simple, intuitive dashboard.
        </p>
        
        <div className="cta-buttons">
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Get started
          </Link>
          <a href="#" className="btn btn-outline btn-lg">
            See demo
          </a>
        </div>
        
        <div className="url-preview">
          <div className="url-icon">FD</div>
          <span className="url-text">doctor.li/FunnelDemo</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How FunnelDoctor Works</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">Track your entire sales funnel from YouTube views to closed deals, with detailed analytics at every step.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center p-8 animated-card delay-1">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Generate UTM Links</h3>
              <p className="text-text-secondary">Create trackable links with unique IDs to place in your YouTube descriptions.</p>
            </div>
            
            <div className="card text-center p-8 animated-card delay-2">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Track Every Step</h3>
              <p className="text-text-secondary">Follow leads from video view to landing page, email capture, appointment, and sale.</p>
            </div>
            
            <div className="card text-center p-8 animated-card delay-3">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Analyze Conversions</h3>
              <p className="text-text-secondary">See exactly where leads drop off and optimize your funnel for higher conversion rates.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-text-primary py-12 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="mr-2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary font-bold">
                  FD
                </div>
                <span className="text-xl font-bold">FunnelDoctor</span>
              </div>
              <p className="text-gray-400">Track, analyze, and optimize your YouTube sales funnel.</p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            &copy; {new Date().getFullYear()} FunnelDoctor. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
