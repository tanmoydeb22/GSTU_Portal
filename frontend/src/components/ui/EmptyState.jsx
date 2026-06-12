import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  compact = false 
}) => {
  return (
    <div className={`relative flex flex-col items-center justify-center text-center overflow-hidden bg-white rounded-2xl border border-gray-100 ${compact ? 'py-8 px-4' : 'py-20 px-6 shadow-sm max-w-2xl mx-auto'}`}>
      
      {/* Decorative SVG Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center overflow-hidden">
        {/* Soft abstract blobs */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-64 h-64 bg-brand-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
          style={{ top: '10%', left: '20%' }}
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute w-72 h-72 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
          style={{ bottom: '10%', right: '15%' }}
        />
        
        {/* Abstract Grid Lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="empty-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-50/50" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#empty-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
        {/* Icon Container */}
        {Icon && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`relative flex items-center justify-center ${compact ? 'w-16 h-16 mb-4' : 'w-24 h-24 mb-6'}`}
          >
            {/* Outer rings */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 border border-brand-200 rounded-full"
            />
            <div className="absolute inset-2 bg-brand-50 rounded-full shadow-inner" />
            <div className="absolute inset-4 bg-white rounded-full shadow-sm" />
            
            {/* The Icon */}
            <motion.div 
              animate={{ y: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <Icon className={`text-brand-500 ${compact ? 'w-6 h-6' : 'w-10 h-10'}`} strokeWidth={1.5} />
            </motion.div>
          </motion.div>
        )}

        {/* Text Content */}
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`font-display font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl mb-2'}`}
        >
          {title}
        </motion.h3>
        
        {description && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-gray-500 ${compact ? 'text-xs mt-1' : 'text-sm'}`}
          >
            {description}
          </motion.p>
        )}

        {/* Optional Action */}
        {action && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mt-6 ${compact ? 'mt-4' : ''}`}
          >
            {action}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
