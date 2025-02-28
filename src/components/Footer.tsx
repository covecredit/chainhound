import React from 'react';
import { Github, Home, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm mb-2 md:mb-0">
            © {new Date().getFullYear()} ChainHound
          </div>
          <div className="flex space-x-4">
            <a 
              href="https://github.com/covecredit/chainhound" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition"
            >
              <Github className="h-5 w-5" />
            </a>
            <a 
              href="https://hacker.house" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition"
            >
              <Home className="h-5 w-5" />
            </a>
            <a 
              href="mailto:info@hacker.house" 
              className="text-gray-300 hover:text-white transition"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;