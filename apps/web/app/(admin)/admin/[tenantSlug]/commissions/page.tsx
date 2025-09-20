'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card } from '@affiliate-factory/ui';

interface Commission {
  id: string;
  order_number: string;
  customer_name: string;
  affiliate_id: string;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  validated_at?: string;
  paid_at?: string;
  payout_method?: string;
  payout_reference?: string;
  validation_notes?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs',
  validated: 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs',
  paid: 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs',
  cancelled: 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs',
};

export default function CommissionsPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalCommissions: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });

  // Fetch commissions
  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenant_id: tenantSlug,
        limit: '100',
        offset: '0',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/commissions?${params}`);
      const data = await response.json();

      if (response.ok) {
        setCommissions(data.commissions);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch commissions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [tenantSlug, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSelectCommission = (commissionId: string) => {
    setSelectedCommissions(prev => 
      prev.includes(commissionId)
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    );
  };

  const handleSelectAll = () => {
    const eligibleCommissions = commissions
      .filter(c => c.status === 'pending' || c.status === 'validated')
      .map(c => c.id);
    
    setSelectedCommissions(prev => 
      prev.length === eligibleCommissions.length ? [] : eligibleCommissions
    );
  };

  const handleValidateCommissions = async () => {
    try {
      const response = await fetch('/api/commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate_commissions',
          commission_ids: selectedCommissions,
          notes: 'Bulk validation',
        }),
      });

      if (response.ok) {
        setSelectedCommissions([]);
        fetchCommissions();
      } else {
        console.error('Failed to validate commissions');
      }
    } catch (error) {
      console.error('Error validating commissions:', error);
    }
  };

  const handleProcessPayout = async () => {
    try {
      const response = await fetch('/api/commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_payout',
          commission_ids: selectedCommissions,
          payout_method: 'bank_transfer',
          notes: 'Bulk payout processing',
        }),
      });

      if (response.ok) {
        setSelectedCommissions([]);
        fetchCommissions();
      } else {
        console.error('Failed to process payout');
      }
    } catch (error) {
      console.error('Error processing payout:', error);
    }
  };

  const eligibleForValidation = selectedCommissions.filter(id => {
    const commission = commissions.find(c => c.id === id);
    return commission?.status === 'pending';
  });

  const eligibleForPayout = selectedCommissions.filter(id => {
    const commission = commissions.find(c => c.id === id);
    return commission?.status === 'validated';
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission Management</h1>
          <p className="text-gray-600">
            Track and manage affiliate commissions and payouts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Commissions</div>
          <div className="text-2xl font-bold">{stats.totalCommissions.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Pending Amount</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Paid Amount</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.paidAmount)}</div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center md:justify-between">
          <div className="flex space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="validated">Validated</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {selectedCommissions.length > 0 && (
            <div className="flex space-x-2">
              {eligibleForValidation.length > 0 && (
                <Button
                  onClick={handleValidateCommissions}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Validate {eligibleForValidation.length} Commissions
                </Button>
              )}
              {eligibleForPayout.length > 0 && (
                <Button
                  onClick={handleProcessPayout}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Process Payout {eligibleForPayout.length} Commissions
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Commissions Table */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Commissions</h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedCommissions.length === commissions.filter(c => c.status === 'pending' || c.status === 'validated').length
                ? 'Deselect All'
                : 'Select All Eligible'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading commissions...</div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8">No commissions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedCommissions.length > 0}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4">Order #</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Affiliate</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Rate</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedCommissions.includes(commission.id)}
                          onChange={() => handleSelectCommission(commission.id)}
                          disabled={commission.status === 'paid' || commission.status === 'cancelled'}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{commission.order_number}</td>
                      <td className="py-3 px-4">{commission.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-sm">{commission.affiliate_id?.slice(0, 8)}...</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(commission.commission_amount)}</td>
                      <td className="py-3 px-4">{(commission.commission_rate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4">
                        <span className={statusColors[commission.status as keyof typeof statusColors]}>
                          {commission.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatDate(commission.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}