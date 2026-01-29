'use client';

import { useState, useRef } from 'react';
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  X,
  Code,
  FileCode,
  BookOpen,
  Sparkles,
  Rocket,
  Zap,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import JSZip from 'jszip';
import { useWorkflow } from '@/lib/hooks/use-workflow';
import { cn } from '@/lib/utils/cn';
import type { Agent } from '@/lib/api/types';

interface WorkflowPanelProps {
  agent: Agent;
}

type ResultTab = 'code' | 'tests' | 'docs';

export function WorkflowPanel({ agent }: WorkflowPanelProps) {
  const [task, setTask] = useState('');
  const [activeTab, setActiveTab] = useState<ResultTab>('code');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const { execute, isExecuting, result, error, progress, reset } = useWorkflow(
    agent.agent_id
  );

  const handleSubmit = () => {
    if (!task.trim() || isExecuting) return;
    execute({ task: task.trim() });
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = async (content: string, filename: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadAsZip = async () => {
    if (!result?.result) return;

    const zip = new JSZip();
    const codebase = (result.result as any).codebase || {};

    Object.entries(codebase).forEach(([filename, content]) => {
      zip.file(filename, content as string);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resultData = result?.result as any;
  const hasResult = result && result.status === 'completed' && resultData;

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-white/5 bg-gradient-to-r from-orange-50 dark:from-orange-900/20 to-transparent">
        <div className="flex items-center gap-4">
          <Link
            href="/workflows"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-xl blur-lg opacity-30 dark:opacity-50" />
            <div className="relative p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl">
              <Rocket className="w-6 h-6 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {agent.description || 'Execute workflow tasks'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-slideUp">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-gradient-to-br dark:from-orange-500/20 dark:to-amber-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Task input card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

            <div className="relative bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 transition-all duration-300 group-focus-within:border-orange-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Describe your task</span>
              </div>

              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="What would you like to build? Be as detailed as possible..."
                disabled={isExecuting}
                rows={6}
                className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none text-sm leading-relaxed"
              />

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Attach Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />

                <button
                  onClick={handleSubmit}
                  disabled={!task.trim() || isExecuting}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300',
                    task.trim() && !isExecuting
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  )}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Execute Workflow
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Progress */}
          {isExecuting && progress && (
            <div className="bg-white dark:bg-white/5 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-6 animate-slideUp">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur animate-pulse" />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white animate-pulse" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white font-medium">Processing your request</span>
                    <span className="text-blue-600 dark:text-blue-300 font-mono text-sm">{progress.progress}%</span>
                  </div>
                  <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-1">{progress.message}</p>
                </div>
              </div>

              {/* Animated progress bar */}
              <div className="relative w-full h-3 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>

              {/* Step indicators */}
              <div className="flex justify-between mt-4 text-xs text-gray-400 dark:text-gray-500">
                <span className={progress.progress >= 0 ? 'text-blue-600 dark:text-blue-400' : ''}>Analyzing</span>
                <span className={progress.progress >= 33 ? 'text-blue-600 dark:text-blue-400' : ''}>Generating</span>
                <span className={progress.progress >= 66 ? 'text-blue-600 dark:text-blue-400' : ''}>Reviewing</span>
                <span className={progress.progress >= 100 ? 'text-blue-600 dark:text-blue-400' : ''}>Complete</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 animate-slideUp">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-300">Execution Failed</h3>
                  <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-1">
                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                  </p>
                  <button
                    onClick={reset}
                    className="mt-4 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success result */}
          {hasResult && (
            <div className="bg-white dark:bg-white/5 border border-green-200 dark:border-green-500/30 rounded-2xl overflow-hidden animate-slideUp">
              {/* Success header */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 dark:from-green-500/10 to-emerald-50 dark:to-emerald-500/10 border-b border-green-200 dark:border-green-500/20">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-xl blur opacity-30 dark:opacity-50" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow Complete!</h3>
                    <p className="text-sm text-green-600/80 dark:text-green-300/80">Your project has been generated successfully</p>
                  </div>
                </div>
                <button
                  onClick={downloadAsZip}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                  Download ZIP
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-white/10">
                {[
                  { id: 'code' as ResultTab, icon: Code, label: 'Code' },
                  { id: 'tests' as ResultTab, icon: FileCode, label: 'Tests' },
                  { id: 'docs' as ResultTab, icon: BookOpen, label: 'Docs' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative',
                      activeTab === tab.id
                        ? 'text-green-600 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6 max-h-[500px] overflow-auto">
                {activeTab === 'code' && resultData.codebase && (
                  <div className="space-y-3">
                    {Object.entries(resultData.codebase).map(([filename, content]) => (
                      <details key={filename} className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-green-500 dark:text-green-400" />
                            <span className="text-sm text-gray-900 dark:text-white font-medium">{filename}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(content as string, filename);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                          >
                            {copiedFile === filename ? (
                              <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </summary>
                        <pre className="mt-2 p-4 bg-gray-900 dark:bg-black/30 rounded-xl text-xs text-gray-300 overflow-x-auto font-mono leading-relaxed">
                          {content as string}
                        </pre>
                      </details>
                    ))}
                  </div>
                )}

                {activeTab === 'tests' && (
                  <div className="text-sm">
                    {resultData.test_results ? (
                      <pre className="p-4 bg-gray-900 dark:bg-black/30 rounded-xl text-xs text-gray-300 overflow-x-auto font-mono">
                        {JSON.stringify(resultData.test_results, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-12">
                        <FileCode className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No test results available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'docs' && (
                  <div className="text-sm">
                    {resultData.documentation ? (
                      <div className="prose prose-gray dark:prose-invert max-w-none">
                        <pre className="p-4 bg-gray-900 dark:bg-black/30 rounded-xl text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
                          {typeof resultData.documentation === 'string'
                            ? resultData.documentation
                            : JSON.stringify(resultData.documentation, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No documentation available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
