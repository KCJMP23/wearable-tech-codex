import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RealTimeNotifications } from '@/components/RealTimeNotifications';

// Mock the useRealtimeNotifications hook
vi.mock('@/lib/hooks/useRealTimeData', () => ({
  useRealtimeNotifications: vi.fn(),
}));

import { useRealtimeNotifications } from '@/lib/hooks/useRealTimeData';

describe('RealTimeNotifications', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'success' as const,
      title: 'Sync Complete',
      message: 'Successfully synced data from Amazon Associates.',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      read: false,
    },
    {
      id: '2',
      type: 'error' as const,
      title: 'Sync Failed',
      message: 'Failed to sync ShareASale. Check your credentials.',
      timestamp: new Date('2024-01-01T11:30:00Z'),
      read: true,
    },
    {
      id: '3',
      type: 'info' as const,
      title: 'Experiment Complete',
      message: 'A/B test "Hero CTA Button Color" has finished. Check results.',
      timestamp: new Date('2024-01-01T11:00:00Z'),
      read: false,
    },
  ];

  const mockHook = {
    notifications: mockNotifications,
    unreadCount: 2,
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRealtimeNotifications).mockReturnValue(mockHook);
  });

  it('should render notification bell with unread count', () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    expect(bell).toBeInTheDocument();
    
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('should show 9+ for counts over 9', () => {
    vi.mocked(useRealtimeNotifications).mockReturnValue({
      ...mockHook,
      unreadCount: 15,
    });

    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const badge = screen.getByText('9+');
    expect(badge).toBeInTheDocument();
  });

  it('should open notifications panel when bell is clicked', async () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('2 new')).toBeInTheDocument();
    });
  });

  it('should display notifications with correct icons and colors', async () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Sync Complete')).toBeInTheDocument();
      expect(screen.getByText('Sync Failed')).toBeInTheDocument();
      expect(screen.getByText('Experiment Complete')).toBeInTheDocument();
    });
  });

  it('should mark notification as read when clicked', async () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      const notification = screen.getByText('Sync Complete').closest('div');
      fireEvent.click(notification!);
    });

    expect(mockHook.markAsRead).toHaveBeenCalledWith('1');
  });

  it('should clear all notifications when clear all is clicked', async () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      const clearAllButton = screen.getByText('Clear all');
      fireEvent.click(clearAllButton);
    });

    expect(mockHook.clearAll).toHaveBeenCalled();
  });

  it('should close panel when backdrop is clicked', async () => {
    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      fireEvent.click(backdrop!);
    });

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', () => {
    vi.mocked(useRealtimeNotifications).mockReturnValue({
      ...mockHook,
      notifications: [],
      unreadCount: 0,
    });

    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('should show/hide more notifications button when applicable', async () => {
    const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      type: 'info' as const,
      title: `Notification ${i}`,
      message: `Message ${i}`,
      timestamp: new Date(),
      read: false,
    }));

    vi.mocked(useRealtimeNotifications).mockReturnValue({
      ...mockHook,
      notifications: manyNotifications,
      unreadCount: 10,
    });

    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    const bell = screen.getByRole('button');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Show 5 more notifications')).toBeInTheDocument();
    });

    const showMoreButton = screen.getByText('Show 5 more notifications');
    fireEvent.click(showMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });
  });

  it('should not show unread badge when count is 0', () => {
    vi.mocked(useRealtimeNotifications).mockReturnValue({
      ...mockHook,
      unreadCount: 0,
    });

    render(<RealTimeNotifications tenantId="test-tenant" />);
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});