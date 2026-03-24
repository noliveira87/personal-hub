import { Link } from 'react-router-dom';
import { FileText, Briefcase, Shield, BarChart3 } from 'lucide-react';

const Index = () => {
  const apps = [
    {
      title: 'Contracts',
      description: 'Manage your contracts and subscriptions',
      icon: FileText,
      link: '/contracts',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Portfolio',
      description: 'Track your investments and assets',
      icon: Briefcase,
      link: '/portfolio',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Warranties',
      description: 'Keep track of product warranties',
      icon: Shield,
      link: '/warranties',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Insights',
      description: 'Analytics and spending insights',
      icon: BarChart3,
      link: '/insights',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-block mb-6">
            <img src="/d12.png" alt="D12 Logo" className="h-24 w-24 mx-auto mb-4 drop-shadow-lg" />
            <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              D12
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Personal Hub
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your contracts, track investments, monitor warranties, and gain insights into your spending.
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {apps.map((app, index) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.link}
                to={app.link}
                className="group animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="relative h-full overflow-hidden rounded-2xl border bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 p-8 shadow-sm hover:shadow-lg hover:border-primary/50">
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${app.color} mb-4 text-white shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <h2 className="text-2xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {app.title}
                    </h2>
                    
                    <p className="text-muted-foreground mb-4 group-hover:text-foreground/80 transition-colors">
                      {app.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span>Open</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '500ms' }}>
          <p>Built with React, TypeScript & Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
