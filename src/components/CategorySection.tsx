import React from 'react';
import { motion } from 'framer-motion';
import { Provider } from '../types';
import IntegrationCard from './IntegrationCard';

interface CategorySectionProps {
  category: string;
  providers: Provider[];
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, providers }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-12"
    >
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
        {category}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {providers.map((provider) => (
          <IntegrationCard key={provider.key} provider={provider} />
        ))}
      </div>
    </motion.div>
  );
};

export default CategorySection;