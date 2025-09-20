'use client';

import React, { useState } from 'react';
import { useTheme } from '@affiliate-factory/themes';
import { HexColorPicker } from 'react-colorful';

export function ThemeCustomizer() {
  const { theme, customizations, setCustomizations } = useTheme();
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing'>('colors');
  
  const handleColorChange = (key: string, value: string) => {
    setCustomizations({
      ...customizations,
      colors: {
        ...customizations.colors,
        [key]: value,
      },
    });
  };

  const handleFontChange = (key: string, value: string) => {
    setCustomizations({
      ...customizations,
      typography: {
        ...customizations.typography,
        fontFamily: {
          ...customizations.typography?.fontFamily,
          [key]: value,
        },
      },
    });
  };

  const handleSpacingChange = (key: string, value: string) => {
    setCustomizations({
      ...customizations,
      spacing: {
        ...customizations.spacing,
        [key]: value,
      },
    });
  };

  const handleReset = () => {
    setCustomizations({});
  };

  const handleExport = () => {
    const exportData = {
      themeId: theme.id,
      customizations,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.id}-customizations.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Theme Customizer</h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['colors', 'typography', 'spacing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === 'colors' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries(theme.colors).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customizations.colors?.[key] || value}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="absolute right-2 top-2 w-6 h-6 rounded border border-gray-300">
                    <input
                      type="color"
                      value={customizations.colors?.[key] || value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <div 
                      className="w-full h-full rounded"
                      style={{ backgroundColor: customizations.colors?.[key] || value }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Font Families</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(theme.typography.fontFamily).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key} Font
                    </label>
                    <input
                      type="text"
                      value={customizations.typography?.fontFamily?.[key] || value}
                      onChange={(e) => handleFontChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Font Sizes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(theme.typography.fontSize).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={customizations.typography?.fontSize?.[key] || value}
                      onChange={(e) => {
                        setCustomizations({
                          ...customizations,
                          typography: {
                            ...customizations.typography,
                            fontSize: {
                              ...customizations.typography?.fontSize,
                              [key]: e.target.value,
                            },
                          },
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spacing' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(theme.spacing).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                </label>
                <input
                  type="text"
                  value={customizations.spacing?.[key] || value}
                  onChange={(e) => handleSpacingChange(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}