'use client';

import React, { useState } from 'react';
import { Editor, Frame, Element, useNode } from '@craftjs/core';
import { Layers } from '@craftjs/layers';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Text, 
  Container, 
  Button, 
  Image, 
  ProductGrid, 
  NewsletterSignup,
  HeroSection,
  TestimonialSection,
  FAQSection
} from './components';
import { Toolbox } from './Toolbox';
import { Settings } from './Settings';
import lz from 'lzutf8';

interface PageBuilderProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  readonly?: boolean;
}

export function PageBuilder({ initialContent, onSave, readonly = false }: PageBuilderProps) {
  const [json, setJson] = useState<string | null>(null);

  const handleSave = () => {
    const json = query.serialize();
    const compressed = lz.encode(lz.compress(json));
    onSave?.(compressed);
    setJson(json);
  };

  const handleLoad = (data: string) => {
    const decompressed = lz.decompress(lz.decode(data));
    const json = JSON.parse(decompressed);
    actions.deserialize(json);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-100">
        <Editor 
          resolver={{
            Text,
            Container,
            Button,
            Image,
            ProductGrid,
            NewsletterSignup,
            HeroSection,
            TestimonialSection,
            FAQSection
          }}
          enabled={!readonly}
        >
          {/* Toolbox - Left Sidebar */}
          {!readonly && (
            <div className="w-64 bg-white shadow-lg overflow-y-auto">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Components</h2>
              </div>
              <Toolbox />
            </div>
          )}

          {/* Canvas - Center */}
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto bg-white shadow-xl">
              <Frame>
                <Element is={Container} padding={20} background="#fff" canvas>
                  {initialContent ? (
                    <Element is="div" dangerouslySetInnerHTML={{ __html: initialContent }} />
                  ) : (
                    <>
                      <Text text="Start building your page!" fontSize={24} />
                      <Text text="Drag components from the left sidebar" fontSize={16} />
                    </>
                  )}
                </Element>
              </Frame>
            </div>
            
            {/* Save/Load Controls */}
            {!readonly && (
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Page
                </button>
                <button
                  onClick={() => {
                    const data = prompt('Paste your page data:');
                    if (data) handleLoad(data);
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Load Page
                </button>
              </div>
            )}
          </div>

          {/* Settings - Right Sidebar */}
          {!readonly && (
            <div className="w-80 bg-white shadow-lg overflow-y-auto">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Properties</h2>
              </div>
              <Settings />
            </div>
          )}

          {/* Layers Panel */}
          {!readonly && (
            <div className="fixed bottom-0 left-64 right-80 h-48 bg-white border-t shadow-lg overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-bold">Layers</h3>
              </div>
              <Layers />
            </div>
          )}
        </Editor>
      </div>
    </DndProvider>
  );
}