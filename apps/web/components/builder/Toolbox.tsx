'use client';

import React from 'react';
import { useEditor, Element } from '@craftjs/core';
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

export function Toolbox() {
  const { connectors } = useEditor();

  const components = [
    { name: 'Text', icon: '📝', element: <Text /> },
    { name: 'Container', icon: '📦', element: <Container /> },
    { name: 'Button', icon: '🔘', element: <Button /> },
    { name: 'Image', icon: '🖼️', element: <Image /> },
    { name: 'Hero Section', icon: '🎯', element: <HeroSection /> },
    { name: 'Product Grid', icon: '🛍️', element: <ProductGrid /> },
    { name: 'Newsletter', icon: '📧', element: <NewsletterSignup /> },
    { name: 'Testimonials', icon: '⭐', element: <TestimonialSection /> },
    { name: 'FAQ', icon: '❓', element: <FAQSection /> },
  ];

  return (
    <div className="p-4 space-y-2">
      {components.map((component, index) => (
        <div
          key={index}
          ref={ref => connectors.create(ref, component.element)}
          className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 cursor-move hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{component.icon}</span>
            <span className="font-medium">{component.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}