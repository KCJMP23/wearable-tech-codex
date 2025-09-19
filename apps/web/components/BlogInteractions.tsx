'use client';

import { useState } from 'react';
import { ShareIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

export function ShareButton() {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
    >
      <ShareIcon className="h-4 w-4" />
      <span>Share</span>
    </button>
  );
}

export function SaveButton() {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <button
      onClick={() => setIsSaved(!isSaved)}
      className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
    >
      <BookmarkIcon className="h-4 w-4" />
      <span>{isSaved ? 'Saved' : 'Save'}</span>
    </button>
  );
}

export function ArticleRating() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this article</h3>
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              star <= (hoveredRating || rating)
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600">
        {rating > 0
          ? `You rated this article ${rating} out of 5 stars`
          : 'Help us improve our content by rating this article'}
      </p>
    </div>
  );
}

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  if (subscribed) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white mb-12">
        <h2 className="text-2xl font-bold mb-4">Thanks for Subscribing!</h2>
        <p className="opacity-90">
          You'll receive our latest reviews and exclusive deals in your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white mb-12">
      <h2 className="text-2xl font-bold mb-4">Stay Updated with Our Latest Reviews</h2>
      <p className="mb-6 opacity-90">
        Get expert insights and exclusive deals delivered to your inbox weekly.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="submit"
          className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}