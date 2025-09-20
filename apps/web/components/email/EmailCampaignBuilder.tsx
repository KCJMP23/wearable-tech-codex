'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Textarea, 
  Select, 
  Card, 
  Badge,
  Modal,
  Switch,
  Notification,
  LoadingSpinner 
} from '@affiliate-factory/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PaperAirplaneIcon, 
  EyeIcon, 
  DocumentDuplicateIcon, 
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  BeakerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Campaign {
  id?: string;
  name: string;
  type: string;
  subject: string;
  preheader: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  htmlContent: string;
  textContent?: string;
  listIds: string[];
  segmentIds?: string[];
  tags?: string[];
  scheduledAt?: Date;
  status?: string;
  abTestConfig?: {
    enabled: boolean;
    testPercentage: number;
    variants: Array<{
      name: string;
      subject: string;
      htmlContent: string;
      percentage: number;
    }>;
  };
}

interface EmailList {
  id: string;
  name: string;
  subscriberCount: number;
}

interface Segment {
  id: string;
  name: string;
  subscriberCount: number;
}

interface Template {
  id: string;
  name: string;
  type: string;
  htmlContent: string;
  textContent?: string;
  thumbnail?: string;
}

interface EmailCampaignBuilderProps {
  campaignId?: string;
  onSave?: (campaign: Campaign) => void;
  onSend?: (campaignId: string) => void;
}

export default function EmailCampaignBuilder({ 
  campaignId, 
  onSave, 
  onSend 
}: EmailCampaignBuilderProps) {
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    type: 'newsletter',
    subject: '',
    preheader: '',
    fromName: '',
    fromEmail: '',
    htmlContent: '',
    listIds: [],
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState(0);
  const [complianceIssues, setComplianceIssues] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch campaign data if editing
  const { data: existingCampaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const response = await fetch(`/api/email/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      const data = await response.json();
      return data.campaign;
    },
    enabled: !!campaignId,
  });

  // Fetch email lists
  const { data: emailLists = [] } = useQuery({
    queryKey: ['emailLists'],
    queryFn: async () => {
      const response = await fetch('/api/email/lists');
      if (!response.ok) throw new Error('Failed to fetch lists');
      const data = await response.json();
      return data.lists;
    },
  });

  // Fetch segments
  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const response = await fetch('/api/email/segments');
      if (!response.ok) throw new Error('Failed to fetch segments');
      const data = await response.json();
      return data.segments;
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await fetch('/api/email/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      return data.templates;
    },
  });

  // Save campaign mutation
  const saveCampaignMutation = useMutation({
    mutationFn: async (campaignData: Campaign) => {
      const url = campaignId 
        ? `/api/email/campaigns/${campaignId}` 
        : '/api/email/campaigns';
      const method = campaignId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save campaign');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      if (onSave) onSave(data.campaign);
      Notification.success('Campaign saved successfully');
    },
    onError: (error: Error) => {
      Notification.error(error.message);
    },
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, isTest, testEmail }: { 
      campaignId: string; 
      isTest?: boolean; 
      testEmail?: string 
    }) => {
      const response = await fetch(`/api/email/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sendType: isTest ? 'test' : 'live',
          testEmail 
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      if (variables.isTest) {
        Notification.success('Test email sent successfully');
      } else {
        Notification.success('Campaign sent successfully');
        if (onSend) onSend(variables.campaignId);
      }
    },
    onError: (error: Error) => {
      Notification.error(error.message);
    },
  });

  // Load existing campaign data
  useEffect(() => {
    if (existingCampaign) {
      setCampaign({
        ...existingCampaign,
        listIds: existingCampaign.list_ids || [],
        segmentIds: existingCampaign.segment_ids || [],
        htmlContent: existingCampaign.html_content || '',
        textContent: existingCampaign.text_content || '',
        scheduledAt: existingCampaign.scheduled_at ? new Date(existingCampaign.scheduled_at) : undefined,
        abTestConfig: existingCampaign.ab_test_config,
      });
    }
  }, [existingCampaign]);

  // Calculate estimated reach
  useEffect(() => {
    const calculateReach = async () => {
      if (campaign.listIds.length === 0 && (!campaign.segmentIds || campaign.segmentIds.length === 0)) {
        setEstimatedReach(0);
        return;
      }

      let reach = 0;
      
      // Add list subscribers
      campaign.listIds.forEach(listId => {
        const list = emailLists.find((l: EmailList) => l.id === listId);
        if (list) reach += list.subscriberCount;
      });

      // Add segment subscribers
      if (campaign.segmentIds) {
        campaign.segmentIds.forEach(segmentId => {
          const segment = segments.find((s: Segment) => s.id === segmentId);
          if (segment) reach += segment.subscriberCount;
        });
      }

      setEstimatedReach(reach);
    };

    calculateReach();
  }, [campaign.listIds, campaign.segmentIds, emailLists, segments]);

  // Validate compliance
  useEffect(() => {
    const issues: string[] = [];
    
    if (!campaign.htmlContent.toLowerCase().includes('unsubscribe')) {
      issues.push('Missing unsubscribe link');
    }
    
    if (!campaign.fromEmail || !campaign.fromName) {
      issues.push('Missing sender information');
    }
    
    if (campaign.subject.length > 100) {
      issues.push('Subject line too long (>100 characters)');
    }
    
    setComplianceIssues(issues);
  }, [campaign]);

  const handleSaveCampaign = () => {
    saveCampaignMutation.mutate(campaign);
  };

  const handleSendCampaign = () => {
    if (!campaignId) {
      Notification.error('Please save the campaign first');
      return;
    }
    sendCampaignMutation.mutate({ campaignId });
  };

  const handleTestSend = (testEmail: string) => {
    if (!campaignId) {
      Notification.error('Please save the campaign first');
      return;
    }
    sendCampaignMutation.mutate({ campaignId, isTest: true, testEmail });
  };

  const applyTemplate = (template: Template) => {
    setCampaign(prev => ({
      ...prev,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
    }));
  };

  const steps = [
    { id: 1, name: 'Campaign Details', icon: DocumentDuplicateIcon },
    { id: 2, name: 'Content', icon: PaperAirplaneIcon },
    { id: 3, name: 'Recipients', icon: UserGroupIcon },
    { id: 4, name: 'Review & Send', icon: ChartBarIcon },
  ];

  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {campaignId ? 'Edit Campaign' : 'Create Campaign'}
        </h1>
        <p className="text-gray-600 mt-2">
          Build and send email campaigns to your subscribers
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-center">
            {steps.map((step, index) => (
              <li key={step.id} className="relative">
                <div className="flex items-center">
                  <div
                    className={`
                      relative flex h-8 w-8 items-center justify-center rounded-full border-2
                      ${currentStep >= step.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-500'
                      }
                    `}
                  >
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="mx-4 h-0.5 w-16 bg-gray-300" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            {/* Step 1: Campaign Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Campaign Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Campaign Name"
                    value={campaign.name}
                    onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    required
                  />
                  
                  <Select
                    label="Campaign Type"
                    value={campaign.type}
                    onChange={(value) => setCampaign(prev => ({ ...prev, type: value }))}
                    options={[
                      { value: 'newsletter', label: 'Newsletter' },
                      { value: 'promotional', label: 'Promotional' },
                      { value: 'transactional', label: 'Transactional' },
                      { value: 'welcome', label: 'Welcome' },
                      { value: 'abandoned_cart', label: 'Abandoned Cart' },
                    ]}
                  />
                </div>

                <Input
                  label="Subject Line"
                  value={campaign.subject}
                  onChange={(e) => setCampaign(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject line"
                  required
                />

                <Input
                  label="Preheader Text"
                  value={campaign.preheader}
                  onChange={(e) => setCampaign(prev => ({ ...prev, preheader: e.target.value }))}
                  placeholder="Preview text that appears after subject line"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="From Name"
                    value={campaign.fromName}
                    onChange={(e) => setCampaign(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Your Name"
                    required
                  />
                  
                  <Input
                    label="From Email"
                    type="email"
                    value={campaign.fromEmail}
                    onChange={(e) => setCampaign(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <Input
                  label="Reply-To Email"
                  type="email"
                  value={campaign.replyTo || ''}
                  onChange={(e) => setCampaign(prev => ({ ...prev, replyTo: e.target.value }))}
                  placeholder="replies@example.com"
                />

                {/* A/B Testing */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">A/B Testing</h3>
                      <p className="text-sm text-gray-500">
                        Test different versions of your campaign
                      </p>
                    </div>
                    <Switch
                      checked={showABTest}
                      onChange={setShowABTest}
                    />
                  </div>

                  {showABTest && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        A/B testing allows you to test different subject lines or content
                        to see which performs better.
                      </p>
                      <Input
                        label="Test Percentage"
                        type="number"
                        min="10"
                        max="50"
                        value={campaign.abTestConfig?.testPercentage || 20}
                        onChange={(e) => setCampaign(prev => ({
                          ...prev,
                          abTestConfig: {
                            ...prev.abTestConfig,
                            enabled: true,
                            testPercentage: parseInt(e.target.value),
                            variants: prev.abTestConfig?.variants || [],
                          }
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Content */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Email Content</h2>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      icon={EyeIcon}
                    >
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Choose Template</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.map((template: Template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-3 cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => applyTemplate(template)}
                      >
                        {template.thumbnail ? (
                          <img 
                            src={template.thumbnail} 
                            alt={template.name}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center">
                            <DocumentDuplicateIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <p className="text-sm font-medium">{template.name}</p>
                        <Badge variant="secondary" size="sm">{template.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HTML Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Content
                  </label>
                  <Textarea
                    value={campaign.htmlContent}
                    onChange={(e) => setCampaign(prev => ({ ...prev, htmlContent: e.target.value }))}
                    placeholder="Enter your HTML content"
                    rows={10}
                    required
                  />
                </div>

                {/* Text Version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Version (Optional)
                  </label>
                  <Textarea
                    value={campaign.textContent || ''}
                    onChange={(e) => setCampaign(prev => ({ ...prev, textContent: e.target.value }))}
                    placeholder="Enter plain text version"
                    rows={6}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Recipients */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Select Recipients</h2>
                
                {/* Email Lists */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Email Lists</h3>
                  <div className="space-y-2">
                    {emailLists.map((list: EmailList) => (
                      <label key={list.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={campaign.listIds.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaign(prev => ({
                                ...prev,
                                listIds: [...prev.listIds, list.id]
                              }));
                            } else {
                              setCampaign(prev => ({
                                ...prev,
                                listIds: prev.listIds.filter(id => id !== list.id)
                              }));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-gray-500">
                            {list.subscriberCount.toLocaleString()} subscribers
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Segments */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Segments</h3>
                  <div className="space-y-2">
                    {segments.map((segment: Segment) => (
                      <label key={segment.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={campaign.segmentIds?.includes(segment.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaign(prev => ({
                                ...prev,
                                segmentIds: [...(prev.segmentIds || []), segment.id]
                              }));
                            } else {
                              setCampaign(prev => ({
                                ...prev,
                                segmentIds: (prev.segmentIds || []).filter(id => id !== segment.id)
                              }));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{segment.name}</p>
                          <p className="text-sm text-gray-500">
                            {segment.subscriberCount.toLocaleString()} subscribers
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Scheduling */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Schedule Delivery</h3>
                      <p className="text-sm text-gray-500">
                        Send now or schedule for later
                      </p>
                    </div>
                    <Switch
                      checked={isScheduling}
                      onChange={setIsScheduling}
                    />
                  </div>

                  {isScheduling && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <Input
                        label="Schedule Date & Time"
                        type="datetime-local"
                        value={campaign.scheduledAt ? campaign.scheduledAt.toISOString().slice(0, 16) : ''}
                        onChange={(e) => setCampaign(prev => ({
                          ...prev,
                          scheduledAt: e.target.value ? new Date(e.target.value) : undefined
                        }))}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review & Send */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Review & Send</h2>
                
                {/* Campaign Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Campaign Summary</h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-700">Name:</dt>
                      <dd>{campaign.name}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Type:</dt>
                      <dd className="capitalize">{campaign.type}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Subject:</dt>
                      <dd>{campaign.subject}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">From:</dt>
                      <dd>{campaign.fromName} &lt;{campaign.fromEmail}&gt;</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Recipients:</dt>
                      <dd>{estimatedReach.toLocaleString()} subscribers</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Delivery:</dt>
                      <dd>{isScheduling ? 'Scheduled' : 'Send Now'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Compliance Check */}
                {complianceIssues.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <h3 className="font-medium text-yellow-800">Compliance Issues</h3>
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {complianceIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Test Send */}
                <TestSendForm onSendTest={handleTestSend} />

                {/* Send Campaign */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Ready to Send?</h3>
                      <p className="text-sm text-gray-500">
                        This campaign will be sent to {estimatedReach.toLocaleString()} subscribers
                      </p>
                    </div>
                    <Button
                      onClick={handleSendCampaign}
                      loading={sendCampaignMutation.isPending}
                      disabled={complianceIssues.length > 0 || estimatedReach === 0}
                      icon={PaperAirplaneIcon}
                    >
                      {isScheduling ? 'Schedule Campaign' : 'Send Campaign'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              <div className="space-x-3">
                <Button
                  variant="outline"
                  onClick={handleSaveCampaign}
                  loading={saveCampaignMutation.isPending}
                  icon={DocumentDuplicateIcon}
                >
                  Save Draft
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                    disabled={
                      (currentStep === 1 && (!campaign.name || !campaign.subject || !campaign.fromEmail)) ||
                      (currentStep === 2 && !campaign.htmlContent) ||
                      (currentStep === 3 && campaign.listIds.length === 0 && (!campaign.segmentIds || campaign.segmentIds.length === 0))
                    }
                  >
                    Next
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estimated Reach */}
          <Card className="p-4">
            <div className="flex items-center mb-2">
              <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-medium">Estimated Reach</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {estimatedReach.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">subscribers</p>
          </Card>

          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setShowPreview(true)}
                icon={EyeIcon}
              >
                Preview Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                icon={BeakerIcon}
                disabled={!campaignId}
              >
                Send Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                icon={ChartBarIcon}
                disabled={!campaignId}
              >
                View Analytics
              </Button>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Tips for Success</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Keep subject lines under 50 characters</li>
              <li>• Use personalization in your content</li>
              <li>• Test on different devices</li>
              <li>• Include a clear call-to-action</li>
              <li>• Ensure unsubscribe link is visible</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <EmailPreviewModal
          campaign={campaign}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Test Send Component
function TestSendForm({ onSendTest }: { onSendTest: (email: string) => void }) {
  const [testEmail, setTestEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSendTest = () => {
    if (testEmail) {
      onSendTest(testEmail);
      setTestEmail('');
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-blue-800">Send Test Email</h3>
          <p className="text-sm text-blue-600">
            Send a test version to verify everything looks correct
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          icon={BeakerIcon}
        >
          Send Test
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex gap-3">
            <Input
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              type="email"
              required
            />
            <Button onClick={handleSendTest} disabled={!testEmail}>
              Send
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Email Preview Modal
function EmailPreviewModal({ 
  campaign, 
  onClose 
}: { 
  campaign: Campaign; 
  onClose: () => void; 
}) {
  return (
    <Modal open={true} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Email Preview</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        
        <div className="border rounded-lg">
          {/* Email Header */}
          <div className="bg-gray-50 p-4 border-b">
            <div className="text-sm">
              <p><strong>From:</strong> {campaign.fromName} &lt;{campaign.fromEmail}&gt;</p>
              <p><strong>Subject:</strong> {campaign.subject}</p>
              {campaign.preheader && (
                <p className="text-gray-600">{campaign.preheader}</p>
              )}
            </div>
          </div>
          
          {/* Email Content */}
          <div 
            className="p-4"
            dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
          />
        </div>
      </div>
    </Modal>
  );
}