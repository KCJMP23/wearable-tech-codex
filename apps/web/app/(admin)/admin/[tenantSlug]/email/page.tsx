'use client';

import { useState } from 'react';
import { Plus, Mail, Users, BarChart, Settings } from 'lucide-react';
import { Button } from '@affiliate-factory/ui';

interface EmailStats {
  totalSubscribers: number;
  activeCampaigns: number;
  totalSent: number;
  openRate: number;
  clickRate: number;
}

export default function EmailDashboard() {
  const [stats] = useState<EmailStats>({
    totalSubscribers: 12543,
    activeCampaigns: 3,
    totalSent: 48291,
    openRate: 24.8,
    clickRate: 3.2,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-gray-600">Manage your email campaigns, subscribers, and automations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubscribers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Mail className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <BarChart className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Open Rate</p>
            <p className="text-2xl font-bold text-gray-900">{stats.openRate}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Click Rate</p>
            <p className="text-2xl font-bold text-gray-900">{stats.clickRate}%</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border hover:border-blue-500 cursor-pointer transition-colors">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Campaigns</h3>
              <p className="text-sm text-gray-600">Create and manage email campaigns</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border hover:border-green-500 cursor-pointer transition-colors">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Subscribers</h3>
              <p className="text-sm text-gray-600">Manage your subscriber lists</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border hover:border-purple-500 cursor-pointer transition-colors">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <BarChart className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Automations</h3>
              <p className="text-sm text-gray-600">Set up automated email workflows</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border hover:border-orange-500 cursor-pointer transition-colors">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Templates</h3>
              <p className="text-sm text-gray-600">Design email templates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium text-gray-900">Recent Campaigns</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-4">Create your first email campaign to get started.</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}