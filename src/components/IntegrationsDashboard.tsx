import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Zap, Shield, Users } from 'lucide-react';
import { providerConfig, getProvidersByCategory } from '../lib/providerConfig';
import { Provider } from '../types';
import StatsOverview from './StatsOverview';
import SearchAndFilter from './SearchAndFilter';
import CategorySection from './CategorySection';

const IntegrationsDashboard: React.FC = () => {
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>(providerConfig);
  
  const categorizedProviders = React.useMemo(() => {
    const categories = new Map<string, Provider[]>();
    
    filteredProviders.forEach(provider => {
      if (!categories.has(provider.category)) {
        categories.set(provider.category, []);
      }
      categories.get(provider.category)!.push(provider);
    });
    
    return categories;
  }, [filteredProviders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                Influence Mate
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Multi-Platform Authentication & Integration Manager
            </p>
            
            {/* Feature Highlights */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                Secure OAuth & API Key Management
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                One-Click Platform Connections
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                15+ Integration Categories
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-yellow-400" />
                AI-Ready Token Management
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <StatsOverview />

        {/* Search and Filter */}
        <SearchAndFilter 
          providers={providerConfig} 
          onFilter={setFilteredProviders} 
        />

        {/* Integration Categories */}
        <div className="space-y-12">
          {Array.from(categorizedProviders.entries()).map(([category, providers]) => (
            <CategorySection
              key={category}
              category={category}
              providers={providers}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredProviders.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-gray-400 text-lg mb-4">
              No platforms found matching your criteria
            </div>
            <p className="text-gray-500">
              Try adjusting your search or filter settings
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800/30 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p className="mb-2">
              Built with React, TypeScript, Tailwind CSS, and Framer Motion
            </p>
            <p className="text-sm">
              Secure, scalable, and ready for production deployment
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IntegrationsDashboard;