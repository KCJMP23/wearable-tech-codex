'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card } from '@affiliate-factory/ui';
import { 
  Save, 
  RefreshCw, 
  Eye, 
  Code, 
  FileText, 
  Folder, 
  FolderOpen,
  Plus,
  Download,
  Upload,
  History,
  Search
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  is_custom?: boolean;
  last_modified?: string;
}

interface SiteStructure {
  theme: string;
  default_files: {
    components: string[];
    pages: string[];
    styles: string[];
    config: string[];
  };
  custom_files: Array<{
    file_path: string;
    file_type: string;
    updated_at: string;
  }>;
  custom_files_count: number;
}

export default function CodeEditorPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [siteStructure, setSiteStructure] = useState<SiteStructure | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['components', 'pages', 'styles']));

  useEffect(() => {
    loadSiteStructure();
  }, [tenantSlug]);

  useEffect(() => {
    setHasChanges(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  const loadSiteStructure = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/themes/code?tenant_id=${tenantSlug}`);
      const data = await response.json();

      if (response.ok) {
        setSiteStructure(data.site);
        buildFileTree(data.site);
      } else {
        console.error('Failed to load site structure:', data.error);
      }
    } catch (error) {
      console.error('Error loading site structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (structure: SiteStructure) => {
    const tree: FileNode[] = [
      {
        name: 'components',
        path: 'components',
        type: 'folder',
        children: structure.default_files.components.map(file => ({
          name: file,
          path: `components/${file}`,
          type: 'file' as const,
          is_custom: structure.custom_files.some(cf => cf.file_path === `components/${file}`),
        })),
      },
      {
        name: 'pages',
        path: 'pages',
        type: 'folder',
        children: structure.default_files.pages.map(file => ({
          name: file,
          path: `pages/${file}`,
          type: 'file' as const,
          is_custom: structure.custom_files.some(cf => cf.file_path === `pages/${file}`),
        })),
      },
      {
        name: 'styles',
        path: 'styles',
        type: 'folder',
        children: structure.default_files.styles.map(file => ({
          name: file,
          path: `styles/${file}`,
          type: 'file' as const,
          is_custom: structure.custom_files.some(cf => cf.file_path === `styles/${file}`),
        })),
      },
      {
        name: 'config',
        path: 'config',
        type: 'folder',
        children: structure.default_files.config.map(file => ({
          name: file,
          path: `config/${file}`,
          type: 'file' as const,
          is_custom: structure.custom_files.some(cf => cf.file_path === `config/${file}`),
        })),
      },
    ];

    // Add custom files that don't exist in default structure
    structure.custom_files.forEach(customFile => {
      const pathParts = customFile.file_path.split('/');
      if (pathParts.length === 1) {
        // Root level custom file
        tree.push({
          name: pathParts[0],
          path: customFile.file_path,
          type: 'file',
          is_custom: true,
          last_modified: customFile.updated_at,
        });
      }
    });

    setFileTree(tree);
  };

  const loadFileContent = async (filePath: string) => {
    try {
      const response = await fetch(`/api/themes/code?tenant_id=${tenantSlug}&file_path=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      if (response.ok) {
        setFileContent(data.file.content);
        setOriginalContent(data.file.content);
      } else {
        console.error('Failed to load file:', data.error);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      loadFileContent(file.path);
    }
  };

  const handleFolderToggle = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setSaving(true);
    try {
      const response = await fetch('/api/themes/code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantSlug,
          file_path: selectedFile.path,
          content: fileContent,
          backup: true,
        }),
      });

      if (response.ok) {
        setOriginalContent(fileContent);
        setHasChanges(false);
        // Update file tree to show as custom
        const updatedTree = updateFileTreeCustomStatus(fileTree, selectedFile.path, true);
        setFileTree(updatedTree);
      } else {
        console.error('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFileTreeCustomStatus = (tree: FileNode[], filePath: string, isCustom: boolean): FileNode[] => {
    return tree.map(node => {
      if (node.path === filePath) {
        return { ...node, is_custom: isCustom };
      }
      if (node.children) {
        return { ...node, children: updateFileTreeCustomStatus(node.children, filePath, isCustom) };
      }
      return node;
    });
  };

  const handleRevert = () => {
    setFileContent(originalContent);
  };

  const handleCreateFile = async () => {
    const fileName = prompt('Enter file name (e.g., CustomComponent.tsx):');
    if (!fileName) return;

    const filePath = `custom/${fileName}`;
    const content = getFileTemplate(fileName);

    try {
      const response = await fetch('/api/themes/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_file',
          tenant_id: tenantSlug,
          file_path: filePath,
          content,
          file_type: getFileType(fileName),
        }),
      });

      if (response.ok) {
        loadSiteStructure(); // Refresh the file tree
      } else {
        console.error('Failed to create file');
      }
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const getFileTemplate = (fileName: string): string => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      const componentName = fileName.replace(/\.(tsx|jsx)$/, '');
      return `import React from 'react';

interface ${componentName}Props {
  // Add your props here
}

export default function ${componentName}({}: ${componentName}Props) {
  return (
    <div className="custom-component">
      <h2>${componentName}</h2>
      <p>This is a custom component. Customize it to match your needs.</p>
    </div>
  );
}`;
    }

    if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
      return `/* Custom styles for ${fileName} */

.custom-component {
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: #f8f9fa;
}

.custom-component h2 {
  margin-bottom: 0.5rem;
  color: #333;
}`;
    }

    return `// Custom file: ${fileName}
// Add your code here`;
  };

  const getFileType = (fileName: string): string => {
    if (fileName.endsWith('.css') || fileName.endsWith('.scss')) return 'style';
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return 'component';
    if (fileName.includes('config')) return 'config';
    return 'component';
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes
      .filter(node => 
        !searchTerm || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.children && node.children.some(child => 
          child.name.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )
      .map(node => (
        <div key={node.path} style={{ marginLeft: `${level * 1}rem` }}>
          {node.type === 'folder' ? (
            <div>
              <button
                onClick={() => handleFolderToggle(node.path)}
                className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-100 rounded"
              >
                {expandedFolders.has(node.path) ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">{node.name}</span>
              </button>
              {expandedFolders.has(node.path) && node.children && (
                <div className="ml-4">
                  {renderFileTree(node.children, level + 1)}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleFileSelect(node)}
              className={`flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-100 rounded ${
                selectedFile?.path === node.path ? 'bg-blue-100 border-l-2 border-blue-500' : ''
              }`}
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{node.name}</span>
              {node.is_custom && (
                <span className="text-xs bg-green-100 text-green-800 px-1 rounded">Custom</span>
              )}
            </button>
          )}
        </div>
      ));
  };

  const getLanguageFromFileName = (fileName: string): string => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.jsx') || fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.scss')) return 'scss';
    if (fileName.endsWith('.json')) return 'json';
    return 'text';
  };

  return (
    <div className="h-screen flex">
      {/* File Explorer Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Site Code</h2>
            <Button onClick={handleCreateFile} size="sm" className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>New</span>
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Stats */}
          {siteStructure && (
            <div className="mt-3 text-xs text-gray-600">
              {siteStructure.custom_files_count} custom files
            </div>
          )}
        </div>

        <div className="p-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading files...</div>
          ) : (
            renderFileTree(fileTree)
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* Editor Header */}
            <div className="border-b border-gray-200 p-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <h3 className="font-medium">{selectedFile.name}</h3>
                    <p className="text-sm text-gray-500">{selectedFile.path}</p>
                  </div>
                  {selectedFile.is_custom && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Custom</span>
                  )}
                  {hasChanges && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Modified</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  {hasChanges && (
                    <Button
                      onClick={handleRevert}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Revert</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 relative">
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm border-none outline-none resize-none"
                placeholder="Loading file content..."
                style={{ 
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  lineHeight: '1.5',
                  tabSize: 2,
                }}
              />
            </div>

            {/* Editor Footer */}
            <div className="border-t border-gray-200 p-2 bg-gray-50 text-xs text-gray-600 flex justify-between">
              <div>
                Language: {getLanguageFromFileName(selectedFile.name)}
              </div>
              <div>
                Lines: {fileContent.split('\n').length} | 
                Characters: {fileContent.length}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No file selected</h3>
              <p className="text-gray-500">Choose a file from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}