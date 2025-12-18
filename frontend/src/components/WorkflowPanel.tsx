import React, { useState, useEffect, useRef } from 'react';
import { Agent, WorkflowResponse, WorkflowProgress, UploadedFile } from '../types';
import { apiClient } from '../api/client';
import { uploadFile, validateFile, formatFileSize } from '../api/files';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Play,
  Loader,
  CheckCircle,
  XCircle,
  FileCode,
  ChevronRight,
  ChevronDown,
  Download,
  Copy,
  Check,
  FolderOpen,
  File,
  Clock,
  Upload,
  FileText,
  X,
  Paperclip
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface WorkflowPanelProps {
  agent: Agent;
}

export function WorkflowPanel({ agent }: WorkflowPanelProps) {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResponse | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'docs' | 'tests' | 'reviews'>('code');
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  // Document Intelligence specific state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [conversationId] = useState(() => `workflow_${crypto.randomUUID()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to check if this is a document intelligence workflow
  const isDocumentWorkflow = agent.agent_id === 'document_intelligence';

  // Reset state when agent changes
  useEffect(() => {
    setTask('');
    setResult(null);
    setSelectedFile(null);
    setExpandedFiles(new Set());
    setActiveTab('code');
    setElapsedTime(0);
    setTaskId(null);
    setProgress(null);
    setUploadedFiles([]);
  }, [agent.agent_id]);

  // Timer for elapsed time during execution
  useEffect(() => {
    if (loading) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  // Poll for progress while loading
  useEffect(() => {
    if (loading && taskId) {
      const pollProgress = async () => {
        try {
          const progressData = await apiClient.getWorkflowProgress(taskId);
          setProgress(progressData);
        } catch (error) {
          console.error('Failed to fetch progress:', error);
        }
      };

      // Initial fetch
      pollProgress();

      // Poll every 2 seconds
      progressPollRef.current = setInterval(pollProgress, 2000);
    } else {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    }

    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, [loading, taskId]);

  const handleExecute = async () => {
    if (!task.trim() || loading) return;
    // Document workflow requires files
    if (isDocumentWorkflow && uploadedFiles.length === 0) return;

    // Generate unique task ID for progress tracking
    const newTaskId = crypto.randomUUID();
    setTaskId(newTaskId);
    setLoading(true);
    setResult(null);
    setElapsedTime(0);
    setProgress(null);

    try {
      const response = await apiClient.executeWorkflow(agent.agent_id, {
        task,
        task_id: newTaskId,
        // For document workflows, include file_ids and conversation_id
        ...(isDocumentWorkflow && {
          file_ids: uploadedFiles.map(f => f.file_id),
          conversation_id: conversationId
        }),
        parameters: {
          recursion_limit: isDocumentWorkflow ? 50 : 100,
          temperature: isDocumentWorkflow ? 0.2 : 0.0
        }
      });
      setResult(response);

      // Auto-select first file if codebase exists (for developer workflow)
      if (response.result?.codebase) {
        const files = Object.keys(response.result.codebase);
        if (files.length > 0) {
          setSelectedFile(files[0]);
          setExpandedFiles(new Set(files));
        }
      }
    } catch (error) {
      setResult({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Workflow execution failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // File upload handler for document workflows
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        console.error('File validation failed:', validation.error);
        continue;
      }

      try {
        const uploaded = await uploadFile(conversationId, file);
        setUploadedFiles(prev => [...prev, uploaded]);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    setUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId));
  };

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsZip = async () => {
    if (!result?.result) return;

    const zip = new JSZip();

    // Add code files
    if (result.result.codebase) {
      const codeFolder = zip.folder('src');
      Object.entries(result.result.codebase).forEach(([filename, content]) => {
        codeFolder?.file(filename, content as string);
      });
    }

    // Add documentation files
    if (result.result.documentation) {
      const docsFolder = zip.folder('docs');
      Object.entries(result.result.documentation).forEach(([filename, content]) => {
        docsFolder?.file(filename, content as string);
      });
    }

    // Add code reviews
    if (result.result.code_reviews) {
      const reviewsFolder = zip.folder('reviews');
      Object.entries(result.result.code_reviews).forEach(([filename, content]) => {
        reviewsFolder?.file(`${filename}_review.md`, content as string);
      });
    }

    // Add test results summary
    if (result.result.test_results) {
      const testSummary = Object.entries(result.result.test_results)
        .map(([file, passed]) => `${passed ? '✓' : '✗'} ${file}`)
        .join('\n');
      zip.file('test_results.txt', testSummary);
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_project_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get current tab's files
  const getFilesForTab = () => {
    if (!result?.result) return {};
    switch (activeTab) {
      case 'code':
        return result.result.codebase || {};
      case 'docs':
        return result.result.documentation || {};
      case 'tests':
        // Convert test_results to displayable format
        const testFiles: Record<string, string> = {};
        if (result.result.test_results) {
          Object.entries(result.result.test_results).forEach(([file, passed]) => {
            testFiles[file] = passed ? '✓ Test passed' : '✗ Test failed';
          });
        }
        return testFiles;
      case 'reviews':
        return result.result.code_reviews || {};
      default:
        return {};
    }
  };

  const currentFiles = getFilesForTab();
  const fileList = Object.keys(currentFiles);
  const selectedContent = selectedFile ? currentFiles[selectedFile] : null;

  // Get file extension for syntax highlighting hint
  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext || 'txt';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20" style={{ padding: '24px 28px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">{agent.name}</h2>
            <p className="text-sm text-gray-400" style={{ marginTop: '6px' }}>{agent.description}</p>
          </div>
          {result && (
            <div className={cn(
              'flex items-center rounded-full text-sm',
              result.status === 'completed'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            )} style={{ gap: '10px', padding: '10px 18px' }}>
              {result.status === 'completed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="capitalize">{result.status}</span>
              {result.execution_time && (
                <span className="text-xs opacity-70" style={{ marginLeft: '6px' }}>
                  ({result.execution_time.toFixed(1)}s)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input */}
        <div className="border-r border-white/10 flex flex-col bg-black/10" style={{ width: '440px' }}>
          <div className="flex-1 flex flex-col" style={{ padding: '24px' }}>
            {/* Document Upload Section (for document intelligence) */}
            {isDocumentWorkflow && (
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-sm font-medium text-gray-300" style={{ marginBottom: '14px' }}>
                  Documents
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl text-center cursor-pointer transition-all",
                    uploading
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/20 hover:border-purple-500/50 hover:bg-white/5"
                  )}
                  style={{ padding: '28px' }}
                >
                  {uploading ? (
                    <Loader className="w-8 h-8 mx-auto text-purple-400 animate-spin" style={{ marginBottom: '12px' }} />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-gray-400" style={{ marginBottom: '12px' }} />
                  )}
                  <p className="text-sm text-gray-400">
                    {uploading ? 'Uploading...' : 'Click to upload documents'}
                  </p>
                  <p className="text-xs text-gray-500" style={{ marginTop: '8px' }}>
                    PDF, DOCX, TXT, MD, Images
                  </p>
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.file_id}
                        className="flex items-center bg-white/5 rounded-lg text-sm"
                        style={{ gap: '12px', padding: '12px 14px' }}
                      >
                        <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-gray-300 truncate flex-1">{file.filename}</span>
                        <span className="text-gray-500 text-xs">{formatFileSize(file.file_size)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.file_id);
                          }}
                          className="hover:bg-white/10 rounded"
                          style={{ padding: '6px' }}
                        >
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-300" style={{ marginBottom: '14px' }}>
              {isDocumentWorkflow ? 'What would you like to do with these documents?' : 'Task Description'}
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={
                agent.agent_id === 'developer_workflow'
                  ? "Describe the project you want to generate...\n\nExample: Create a FastAPI todo application with SQLite database, CRUD operations, and Pydantic models for validation."
                  : isDocumentWorkflow
                  ? "Describe what you want to do with the documents...\n\nExamples:\n- Summarize these documents\n- Extract key information about [topic]\n- Compare and highlight differences\n- Create a table of important data points"
                  : "Describe what you want to do..."
              }
              disabled={loading}
              className={cn(
                "bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none transition-all text-sm leading-relaxed",
                isDocumentWorkflow ? "flex-1" : "flex-1"
              )}
              style={{ padding: '16px 18px', minHeight: isDocumentWorkflow ? '140px' : '220px' }}
            />

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={!task.trim() || loading || (isDocumentWorkflow && uploadedFiles.length === 0)}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center font-medium"
              style={{ marginTop: '20px', padding: '16px 24px', gap: '12px' }}
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>{isDocumentWorkflow ? 'Analyze Documents' : 'Execute Workflow'}</span>
                </>
              )}
            </button>

            {/* Progress/Timer */}
            {loading && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl" style={{ marginTop: '20px', padding: '18px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
                  <span className="text-sm text-purple-300 truncate flex-1" style={{ marginRight: '16px' }}>
                    {progress?.message || 'Starting workflow...'}
                  </span>
                  <span className="text-sm text-purple-400 flex items-center flex-shrink-0" style={{ gap: '8px' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(elapsedTime)}
                  </span>
                </div>
                <div className="bg-purple-900/50 rounded-full overflow-hidden" style={{ height: '10px' }}>
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress?.progress || 5}%` }}
                  />
                </div>
                {progress && progress.progress > 0 && (
                  <div className="text-xs text-purple-400/70 text-right" style={{ marginTop: '10px' }}>
                    {Math.round(progress.progress)}%
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {result?.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl" style={{ marginTop: '20px', padding: '18px' }}>
                <p className="text-sm text-red-300">{result.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!result?.result ? (
            <div className="flex-1 flex items-center justify-center" style={{ padding: '40px' }}>
              <div className="text-center" style={{ maxWidth: '380px' }}>
                <div className="mx-auto rounded-2xl bg-white/5 flex items-center justify-center" style={{ width: '72px', height: '72px', marginBottom: '20px' }}>
                  <FileCode className="text-gray-500" style={{ width: '36px', height: '36px' }} />
                </div>
                <h3 className="text-lg text-gray-400" style={{ marginBottom: '12px' }}>No Results Yet</h3>
                <p className="text-sm text-gray-500">
                  {isDocumentWorkflow
                    ? 'Upload documents and describe what you want to do to see results here'
                    : 'Enter a task description and execute the workflow to see results here'
                  }
                </p>
              </div>
            </div>
          ) : isDocumentWorkflow && result.result.content ? (
            /* Document Intelligence Output - Markdown/JSON Display */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div className="flex items-center justify-between border-b border-white/10 bg-black/20" style={{ padding: '16px 24px', flexShrink: 0 }}>
                <div className="flex items-center" style={{ gap: '12px' }}>
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white font-medium">Analysis Result</span>
                  <span className="text-xs text-gray-500 bg-white/5 rounded" style={{ padding: '4px 10px' }}>
                    {result.result.format || 'markdown'}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(result.result.content)}
                  className="flex items-center text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
                  style={{ gap: '8px', padding: '8px 12px' }}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-black/20" style={{ flex: 1, overflow: 'auto', padding: '28px', minHeight: 0 }}>
                {result.result.format === 'json' ? (
                  <pre className="text-sm text-gray-300 font-mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {typeof result.result.content === 'string'
                      ? result.result.content
                      : JSON.stringify(result.result.content, null, 2)
                    }
                  </pre>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.result.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Developer Workflow Output - Tabs and File Browser */}
              {/* Tabs */}
              <div className="flex items-center border-b border-white/10" style={{ gap: '10px', padding: '18px 24px' }}>
                {[
                  { id: 'code', label: 'Code', count: Object.keys(result.result.codebase || {}).length },
                  { id: 'docs', label: 'Documentation', count: Object.keys(result.result.documentation || {}).length },
                  { id: 'tests', label: 'Tests', count: Object.keys(result.result.test_results || {}).length },
                  { id: 'reviews', label: 'Reviews', count: Object.keys(result.result.code_reviews || {}).length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSelectedFile(null);
                    }}
                    className={cn(
                      'rounded-lg text-sm transition-all flex items-center',
                      activeTab === tab.id
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                    )}
                    style={{ padding: '10px 16px', gap: '10px' }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={cn(
                        'rounded text-xs',
                        activeTab === tab.id
                          ? 'bg-purple-500/30 text-purple-200'
                          : 'bg-white/10 text-gray-500'
                      )} style={{ padding: '4px 10px' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}

                {/* Download Button */}
                {Object.keys(result.result.codebase || {}).length > 0 && (
                  <button
                    onClick={downloadAsZip}
                    className="ml-auto rounded-lg text-sm text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-all flex items-center"
                    style={{ padding: '10px 16px', gap: '10px' }}
                  >
                    <Download className="w-4 h-4" />
                    Download ZIP
                  </button>
                )}
              </div>

              {/* File Browser + Code View */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* File List */}
                <div className="border-r border-white/10 bg-black/20" style={{ width: '280px', overflow: 'auto' }}>
                  <div style={{ padding: '16px' }}>
                    {fileList.length === 0 ? (
                      <p className="text-sm text-gray-500" style={{ padding: '16px 14px' }}>No files in this section</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {fileList.map((filename) => (
                          <button
                            key={filename}
                            onClick={() => setSelectedFile(filename)}
                            className={cn(
                              'w-full flex items-center rounded-lg text-left transition-all text-sm',
                              selectedFile === filename
                                ? 'bg-purple-500/20 text-white'
                                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                            )}
                            style={{ gap: '14px', padding: '12px 14px' }}
                          >
                            <File className={cn(
                              'w-4 h-4 flex-shrink-0',
                              selectedFile === filename ? 'text-purple-400' : 'text-gray-500'
                            )} />
                            <span className="truncate">{filename}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Code View */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {selectedFile && selectedContent ? (
                    <>
                      {/* File Header */}
                      <div className="flex items-center justify-between bg-black/30 border-b border-white/10" style={{ padding: '14px 24px', flexShrink: 0 }}>
                        <div className="flex items-center" style={{ gap: '14px' }}>
                          <FileCode className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-white font-medium">{selectedFile}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedContent)}
                          className="flex items-center text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          style={{ gap: '10px', padding: '8px 14px' }}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Code Content */}
                      <div className="bg-black/40" style={{ flex: 1, overflow: 'auto', padding: '24px 28px', minHeight: 0 }}>
                        <pre className="text-sm text-gray-300 font-mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                          <code>{selectedContent}</code>
                        </pre>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-gray-500">Select a file to view its contents</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
