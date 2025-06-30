import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Provider } from '../types';

interface SearchAndFilterProps {
  providers: Provider[];
  onFilter: (filtered: Provider[]) => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({ providers, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthType, setSelectedAuthType] = useState('');

  const categories = Array.from(new Set(providers.map(p => p.category)));
  const authTypes = Array.from(new Set(providers.map(p => p.authType)));

  React.useEffect(() => {
    let filtered = providers;

    if (searchTerm) {
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(provider => provider.category === selectedCategory);
    }

    if (selectedAuthType) {
      filtered = filtered.filter(provider => provider.authType === selectedAuthType);
    }

    onFilter(filtered);
  }, [searchTerm, selectedCategory, selectedAuthType, providers, onFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedAuthType('');
  };

  const hasActiveFilters = searchTerm || selectedCategory || selectedAuthType;

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search platforms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        {/* Auth Type Filter */}
        <select
          value={selectedAuthType}
          onChange={(e) => setSelectedAuthType(e.target.value)}
          className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
        >
          <option value="">All Auth Types</option>
          {authTypes.map(authType => (
            <option key={authType} value={authType}>
              {authType === 'oauth' ? 'OAuth' : 'Manual Setup'}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchAndFilter;