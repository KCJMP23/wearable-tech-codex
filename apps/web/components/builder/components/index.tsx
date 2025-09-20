'use client';

import React from 'react';
import { useNode, UserComponent } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';

// Text Component
export const Text: UserComponent<{ text: string; fontSize?: number; color?: string }> = ({ 
  text = 'Click to edit', 
  fontSize = 16,
  color = '#000' 
}) => {
  const { connectors: { connect, drag }, isActive, actions: { setProp } } = useNode();
  const [editable, setEditable] = React.useState(false);

  return (
    <div
      ref={ref => connect(drag(ref))}
      onClick={() => setEditable(true)}
      className={`${isActive ? 'ring-2 ring-blue-500' : ''} cursor-pointer`}
    >
      <ContentEditable
        html={text}
        disabled={!editable}
        onChange={e => setProp(props => props.text = e.target.value)}
        onBlur={() => setEditable(false)}
        style={{ fontSize: `${fontSize}px`, color }}
      />
    </div>
  );
};

Text.craft = {
  props: {
    text: 'Edit me',
    fontSize: 16,
    color: '#000',
  },
  related: {
    settings: TextSettings,
  },
};

function TextSettings() {
  const { actions: { setProp }, props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Text</label>
        <textarea
          value={props.text}
          onChange={e => setProp(props => props.text = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Font Size</label>
        <input
          type="number"
          value={props.fontSize}
          onChange={e => setProp(props => props.fontSize = parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Color</label>
        <input
          type="color"
          value={props.color}
          onChange={e => setProp(props => props.color = e.target.value)}
          className="w-full h-10 border rounded"
        />
      </div>
    </div>
  );
}

// Container Component
export const Container: UserComponent<{ 
  background?: string; 
  padding?: number;
  children?: React.ReactNode;
}> = ({ background = '#fff', padding = 10, children }) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      style={{ background, padding: `${padding}px` }}
      className="min-h-[100px] border-2 border-dashed border-gray-300"
    >
      {children}
    </div>
  );
};

Container.craft = {
  props: {
    background: '#fff',
    padding: 10,
  },
  related: {
    settings: ContainerSettings,
  },
};

function ContainerSettings() {
  const { actions: { setProp }, props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Background</label>
        <input
          type="color"
          value={props.background}
          onChange={e => setProp(props => props.background = e.target.value)}
          className="w-full h-10 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Padding</label>
        <input
          type="number"
          value={props.padding}
          onChange={e => setProp(props => props.padding = parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
    </div>
  );
}

// Button Component
export const Button: UserComponent<{ 
  text: string; 
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}> = ({ text = 'Click me', variant = 'primary', size = 'md' }) => {
  const { connectors: { connect, drag } } = useNode();
  
  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      ref={ref => connect(drag(ref))}
      className={`${variants[variant]} ${sizes[size]} rounded transition-colors`}
    >
      {text}
    </button>
  );
};

Button.craft = {
  props: {
    text: 'Button',
    variant: 'primary',
    size: 'md',
  },
  related: {
    settings: ButtonSettings,
  },
};

function ButtonSettings() {
  const { actions: { setProp }, props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Text</label>
        <input
          value={props.text}
          onChange={e => setProp(props => props.text = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Variant</label>
        <select
          value={props.variant}
          onChange={e => setProp(props => props.variant = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Size</label>
        <select
          value={props.size}
          onChange={e => setProp(props => props.size = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </div>
    </div>
  );
}

// Image Component
export const Image: UserComponent<{ 
  src: string; 
  alt?: string;
  width?: string;
  height?: string;
}> = ({ src = 'https://via.placeholder.com/300', alt = '', width = '100%', height = 'auto' }) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <img
      ref={ref => connect(drag(ref))}
      src={src}
      alt={alt}
      style={{ width, height }}
      className="object-cover"
    />
  );
};

Image.craft = {
  props: {
    src: 'https://via.placeholder.com/300',
    alt: 'Image',
    width: '100%',
    height: 'auto',
  },
  related: {
    settings: ImageSettings,
  },
};

function ImageSettings() {
  const { actions: { setProp }, props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input
          value={props.src}
          onChange={e => setProp(props => props.src = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Alt Text</label>
        <input
          value={props.alt}
          onChange={e => setProp(props => props.alt = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Width</label>
        <input
          value={props.width}
          onChange={e => setProp(props => props.width = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Height</label>
        <input
          value={props.height}
          onChange={e => setProp(props => props.height = e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
    </div>
  );
}

// Product Grid Component
export const ProductGrid: UserComponent<{ columns?: number }> = ({ columns = 3 }) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      className={`grid grid-cols-${columns} gap-4 p-4`}
    >
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
          <div className="bg-gray-200 h-48 rounded mb-4"></div>
          <h3 className="font-bold mb-2">Product {i + 1}</h3>
          <p className="text-gray-600 mb-2">Product description</p>
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">$99.99</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              View Deal
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

ProductGrid.craft = {
  props: {
    columns: 3,
  },
};

// Newsletter Signup Component
export const NewsletterSignup: UserComponent = () => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      className="bg-gray-100 p-8 rounded-lg"
    >
      <h2 className="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
      <p className="mb-6">Get the latest deals and updates delivered to your inbox!</p>
      <div className="flex gap-4">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-4 py-2 border rounded"
        />
        <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Subscribe
        </button>
      </div>
    </div>
  );
};

// Hero Section Component
export const HeroSection: UserComponent<{ 
  title?: string; 
  subtitle?: string;
  buttonText?: string;
}> = ({ 
  title = 'Welcome to Our Site', 
  subtitle = 'Discover amazing products and deals',
  buttonText = 'Shop Now'
}) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-16 rounded-lg"
    >
      <h1 className="text-5xl font-bold mb-4">{title}</h1>
      <p className="text-xl mb-8">{subtitle}</p>
      <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
        {buttonText}
      </button>
    </div>
  );
};

HeroSection.craft = {
  props: {
    title: 'Welcome to Our Site',
    subtitle: 'Discover amazing products and deals',
    buttonText: 'Shop Now',
  },
};

// Testimonial Section Component
export const TestimonialSection: UserComponent = () => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      className="p-8"
    >
      <h2 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h2>
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <p className="italic mb-4">"This is an amazing product! Highly recommend."</p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
              <div>
                <p className="font-bold">Customer {i}</p>
                <p className="text-sm text-gray-600">Verified Buyer</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// FAQ Section Component
export const FAQSection: UserComponent = () => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      ref={ref => connect(drag(ref))}
      className="p-8"
    >
      <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">Question {i}?</h3>
            <p className="text-gray-600">Answer to question {i} goes here.</p>
          </div>
        ))}
      </div>
    </div>
  );
};