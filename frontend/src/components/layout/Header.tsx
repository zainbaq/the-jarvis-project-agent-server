// Header component - top navigation bar

import { Link } from 'react-router-dom';
import { APP_NAME } from '../../lib/constants';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">J</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                {APP_NAME}
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              to="/agents"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Agents
            </Link>
            <Link
              to="/chat"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Chat
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
