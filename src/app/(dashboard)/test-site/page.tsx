'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import {
  Sparkles,
  Download,
  Save,
  AlertTriangle,
  Play,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  CheckCircle2,
  Trash2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TestResult {
  id: string;
  provider: 'NANOBANA' | 'VEO';
  prompt: string;
  parameters: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  output_type: 'IMAGE' | 'VIDEO';
  output_url: string | null;
  error_message: string | null;
  processing_time: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function TestSitePage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  // Generator input states
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<'NANOBANA' | 'VEO'>('NANOBANA');
  const [resolution, setResolution] = useState<'1024x1024' | '768x1024' | '1024x768'>('1024x1024');
  const [style, setStyle] = useState<string>('None');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<'5s' | '10s'>('5s');

  // Generation status states
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // History states
  const [history, setHistory] = useState<TestResult[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 6;

  // Actions state
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Refs for tracking async updates and DOM
  const generatingIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const outputAreaRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync ref with state
  useEffect(() => {
    generatingIdRef.current = generatingId;
  }, [generatingId]);

  // Fetch history list
  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const res = await authFetch(`/api/test-site/history?page=${page}&limit=${historyLimit}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.results || []);
        setHistoryTotal(data.total || 0);
        setHistoryPage(data.page || 1);
      }
    } catch (error) {
      console.error('Failed to fetch prompt history:', error);
    }
  }, [authFetch]);

  // Fetch single result details
  const fetchResultDetails = useCallback(async (id: string, selectAsCurrent = true) => {
    try {
      const res = await authFetch(`/api/test-site/prompts/${id}`);
      if (res.ok) {
        const data = await res.json() as TestResult;
        if (selectAsCurrent) {
          setCurrentResult(data);
          if (data.status !== 'PENDING' && data.status !== 'PROCESSING') {
            setGeneratingId(null);
          }
        }
        // Also refresh history so changes are synced in list
        fetchHistory(historyPage);
      }
    } catch (error) {
      console.error('Failed to fetch prompt details:', error);
    }
  }, [authFetch, fetchHistory, historyPage]);

  // Load initial history
  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  // WebSocket updates listener
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-channel', 'test-site');

    const handleUpdate = (data: { action: string; resultId: string }) => {
      // Refresh generation list
      fetchHistory(historyPage);

      // If the update targets our active generation, refresh it
      if (generatingIdRef.current === data.resultId) {
        fetchResultDetails(data.resultId, true);
      }
    };

    socket.on('test-site:update', handleUpdate);

    return () => {
      socket.off('test-site:update', handleUpdate);
      socket.emit('leave-channel', 'test-site');
    };
  }, [socket, fetchHistory, fetchResultDetails, historyPage]);

  // Timer effect for pending/processing tasks
  useEffect(() => {
    if (generatingId) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
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
  }, [generatingId]);

  // Backup Polling for pending task
  useEffect(() => {
    if (!generatingId) return;

    const interval = setInterval(() => {
      fetchResultDetails(generatingId, true);
    }, 2500);

    return () => clearInterval(interval);
  }, [generatingId, fetchResultDetails]);

  // Submit new generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setCurrentResult(null);
    setGeneratingId(null);

    const parameters = provider === 'NANOBANA'
      ? { resolution, style: style === 'None' ? undefined : style }
      : { duration, aspect_ratio: aspectRatio };

    try {
      const res = await authFetch('/api/test-site/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          parameters
        })
      });

      if (res.ok) {
        const data = await res.json() as TestResult;
        setCurrentResult(data);
        setGeneratingId(data.id);
        fetchHistory(1); // Back to page 1 to show pending task
        
        // Scroll to output area
        setTimeout(() => {
          outputAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit prompt.', 'error');
      }
    } catch {
      showToast('Error connecting to server.', 'error');
    }
  };

  // Browser download action
  const handleDownload = () => {
    if (!currentResult || !currentResult.output_url) return;

    const outputUrl = currentResult.output_url;
    const isImage = currentResult.output_type === 'IMAGE';
    const timestamp = Date.now();

    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = isImage ? `imagen-${timestamp}.png` : `veo-${timestamp}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download started.', 'success');
  };

  // Save to files server option
  const handleSaveToFiles = async () => {
    if (!currentResult || !currentResult.output_url) return;

    if (!currentResult.output_url.startsWith('data:')) {
      showToast('File is already saved to uploads folder.', 'success');
      return;
    }

    setIsSavingLocal(true);
    try {
      const res = await authFetch(`/api/test-site/prompts/${currentResult.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json() as TestResult;
        setCurrentResult(data);
        showToast('Saved to public/uploads/test-site/ successfully!', 'success');
        fetchHistory(historyPage);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save to server uploads.', 'error');
      }
    } catch {
      showToast('Error saving file.', 'error');
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Delete past generation
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prompt result?')) return;

    try {
      const res = await authFetch(`/api/test-site/prompts/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Prompt result deleted.');
        if (currentResult?.id === id) {
          setCurrentResult(null);
        }
        fetchHistory(historyPage);
      } else {
        showToast('Failed to delete history item.', 'error');
      }
    } catch {
      showToast('Connection error during deletion.', 'error');
    }
  };

  // Click history item to preview
  const handleSelectHistoryItem = (item: TestResult) => {
    setCurrentResult(item);
    setPrompt(item.prompt);
    setProvider(item.provider);
    
    // Parse params back to state
    if (item.provider === 'NANOBANA') {
      const params = item.parameters || {};
      if (params.resolution) setResolution(params.resolution);
      setStyle(params.style || 'None');
    } else {
      const params = item.parameters || {};
      if (params.duration) setDuration(params.duration);
      if (params.aspect_ratio) setAspectRatio(params.aspect_ratio);
    }

    if (item.status === 'PENDING' || item.status === 'PROCESSING') {
      setGeneratingId(item.id);
    } else {
      setGeneratingId(null);
    }

    setTimeout(() => {
      outputAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Helper styles
  const STYLE_OPTIONS = ['None', 'Photorealistic', 'Anime', 'Digital Art', 'Oil Painting', 'Sketch'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-500 text-foreground">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-apple shadow-lg flex items-center gap-2 border text-sm ${
              toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Site (AI Generation)</h1>
        <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
          Create mock concept visuals using Google Imagen 3 (Nanobana) and demo videos using Google Veo.
        </p>
      </div>

      {/* TOP: Provider selector + Prompt input + Generate button */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border shadow-sm overflow-hidden bg-white dark:bg-neutral-900">
          <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <span className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="text-apple-blue dark:text-blue-400" size={18} />
              Generative Playground
            </span>
            <Badge variant="default" className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40">
              Nanobana & Veo Connected
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Side: Inputs */}
                <div className="md:col-span-2 space-y-4">
                  {/* Select Provider */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                      Select Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProvider('NANOBANA');
                          setCurrentResult(null);
                          setGeneratingId(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-apple border transition-all ${
                          provider === 'NANOBANA'
                            ? 'bg-apple-blue/10 border-apple-blue text-apple-blue dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-400'
                            : 'bg-apple-gray dark:bg-neutral-800 border-border text-foreground hover:bg-border/30'
                        }`}
                      >
                        <ImageIcon size={16} />
                        Imagen (Image Gen)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProvider('VEO');
                          setCurrentResult(null);
                          setGeneratingId(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-apple border transition-all ${
                          provider === 'VEO'
                            ? 'bg-apple-blue/10 border-apple-blue text-apple-blue dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-400'
                            : 'bg-apple-gray dark:bg-neutral-800 border-border text-foreground hover:bg-border/30'
                        }`}
                      >
                        <VideoIcon size={16} />
                        Veo (Video Gen)
                      </button>
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                      Prompt
                    </label>
                    <textarea
                      placeholder={
                        provider === 'NANOBANA'
                          ? "A sleek web application dashboard wireframe, minimalist Apple aesthetic, clean blue accents..."
                          : "Slow pans across a modern workspace with digital project kanban board, photorealistic, 4k..."
                      }
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-apple-gray dark:bg-neutral-800 border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue text-foreground"
                    />
                  </div>
                </div>

                {/* Right Side: Parameters */}
                <div className="bg-apple-gray/50 dark:bg-neutral-800/40 p-4 rounded-apple border border-border/60 space-y-4">
                  <span className="text-xs font-bold text-foreground block border-b border-border/60 pb-2">
                    Generation Parameters
                  </span>

                  {provider === 'NANOBANA' ? (
                    <>
                      {/* Imagen Resolution */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                          Resolution (Aspect Ratio)
                        </label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value as any)}
                          className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-border rounded-apple focus:outline-none text-foreground"
                        >
                          <option value="1024x1024">Square (1:1 - 1024x1024)</option>
                          <option value="768x1024">Portrait (3:4 - 768x1024)</option>
                          <option value="1024x768">Landscape (4:3 - 1024x768)</option>
                        </select>
                      </div>

                      {/* Imagen Style */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                          Style Modifier
                        </label>
                        <select
                          value={style}
                          onChange={(e) => setStyle(e.target.value)}
                          className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-border rounded-apple focus:outline-none text-foreground"
                        >
                          {STYLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Veo Aspect Ratio */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                          Aspect Ratio
                        </label>
                        <select
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value as any)}
                          className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-border rounded-apple focus:outline-none text-foreground"
                        >
                          <option value="16:9">Wide (16:9)</option>
                          <option value="9:16">Vertical (9:16)</option>
                          <option value="1:1">Square (1:1)</option>
                        </select>
                      </div>

                      {/* Veo Duration */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                          Video Duration
                        </label>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value as any)}
                          className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-border rounded-apple focus:outline-none text-foreground"
                        >
                          <option value="5s">5 Seconds</option>
                          <option value="10s">10 Seconds</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!!generatingId || !prompt.trim()}
                  className="bg-apple-blue hover:bg-apple-blueHover text-white px-5 py-2.5 text-sm font-semibold rounded-apple transition-colors shadow-apple-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generatingId ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Generating ({elapsedSeconds}s)...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Preview
                    </>
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE: Output display + Download & Save to Files buttons */}
      <div ref={outputAreaRef}>
        <AnimatePresence mode="wait">
          {(currentResult || generatingId) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <Card className="border-border shadow-sm overflow-hidden bg-white dark:bg-neutral-900">
                <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                  <span className="text-base font-semibold">Output Preview</span>
                  <div className="flex items-center gap-2">
                    {currentResult && (
                      <Badge
                        variant={
                          currentResult.status === 'COMPLETED'
                            ? 'success'
                            : currentResult.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {currentResult.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Loading State */}
                  {(generatingId && (!currentResult || currentResult.status === 'PENDING' || currentResult.status === 'PROCESSING')) && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-apple-gray/30 dark:bg-neutral-800/20 rounded-apple border border-dashed border-border/80">
                      <Loader2 className="animate-spin text-apple-blue dark:text-blue-400" size={36} />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold">Generating your mock visual...</p>
                        <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                          Elapsed time: {elapsedSeconds} seconds. Standard generations complete in under 45 seconds.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completed Output */}
                  {currentResult && currentResult.status === 'COMPLETED' && (
                    <div className="space-y-4">
                      {currentResult.output_type === 'IMAGE' ? (
                        <div className="relative flex items-center justify-center bg-apple-gray/20 dark:bg-neutral-800/10 rounded-apple border border-border p-2 overflow-hidden">
                          <img
                            src={currentResult.output_url || ''}
                            alt={currentResult.prompt}
                            className="w-full object-contain rounded-apple shadow-sm max-h-[500px]"
                          />
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-center bg-apple-gray/20 dark:bg-neutral-800/10 rounded-apple border border-border p-2 overflow-hidden">
                          <video
                            src={currentResult.output_url || ''}
                            controls
                            className="w-full rounded-apple shadow-sm max-h-[500px] bg-black"
                          />
                        </div>
                      )}

                      {/* Info / Metadata Bar */}
                      <div className="bg-apple-gray/40 dark:bg-neutral-800/40 p-3 rounded-apple border border-border/60 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="max-w-[70%]">
                          <strong className="text-foreground font-bold">Prompt: </strong>
                          <span className="italic">&ldquo;{currentResult.prompt}&rdquo;</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {currentResult.processing_time && (
                            <span>Time: {currentResult.processing_time}s</span>
                          )}
                          {currentResult.output_url?.startsWith('/uploads') && (
                            <Badge variant="success" className="text-[10px]">Saved to Server Files</Badge>
                          )}
                        </div>
                      </div>

                      {/* Download and Save to Files button panel */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="w-full sm:w-auto bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-4 py-2.5 text-xs font-semibold rounded-apple transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Download size={14} />
                          Download File
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleSaveToFiles}
                          disabled={isSavingLocal || !currentResult.output_url?.startsWith('data:')}
                          className="w-full sm:w-auto bg-apple-blue hover:bg-apple-blueHover text-white px-4 py-2.5 text-xs font-semibold rounded-apple transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isSavingLocal ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                          {!currentResult.output_url?.startsWith('data:') ? 'Saved to Server Files' : 'Save to Server Files'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Failed Output */}
                  {currentResult && currentResult.status === 'FAILED' && (
                    <div className="p-6 bg-red-500/5 dark:bg-red-950/10 border border-red-500/20 rounded-apple text-center space-y-4">
                      <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Generation Failed</h3>
                        <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark leading-relaxed break-words">
                          {currentResult.error_message || 'An unexpected error occurred during model processing.'}
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setPrompt(currentResult.prompt);
                            setProvider(currentResult.provider);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/30 rounded-apple hover:bg-red-500/10 transition-colors"
                        >
                          Copy Prompt & Retry
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM: History grid of past generations */}
      <div>
        <Card className="border-border shadow-sm bg-white dark:bg-neutral-900">
          <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <span className="text-base font-semibold flex items-center gap-2">
              <Clock className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" size={18} />
              Generation History
            </span>
            <Badge variant="secondary">Total: {historyTotal}</Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {history.length === 0 ? (
              <div className="text-center py-10 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                No past generations found in database. Create your first generation above!
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item) => {
                    const isComp = item.status === 'COMPLETED';
                    const isFail = item.status === 'FAILED';
                    const isPend = item.status === 'PENDING' || item.status === 'PROCESSING';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectHistoryItem(item)}
                        className={`group border rounded-apple overflow-hidden cursor-pointer bg-apple-gray/20 dark:bg-neutral-800/30 transition-all hover:shadow-md flex flex-col ${
                          currentResult?.id === item.id
                            ? 'border-apple-blue dark:border-blue-500 ring-1 ring-apple-blue/20 dark:ring-blue-500/20'
                            : 'border-border hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {/* Thumbnail View */}
                        <div className="relative h-32 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center overflow-hidden shrink-0 select-none border-b border-border">
                          {isComp && item.output_url ? (
                            item.output_type === 'IMAGE' ? (
                              <img
                                src={item.output_url}
                                alt=""
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <>
                                <video
                                  src={item.output_url}
                                  className="w-full h-full object-cover opacity-70"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/35 text-white">
                                    <Play size={14} fill="white" className="ml-0.5" />
                                  </div>
                                </div>
                              </>
                            )
                          ) : isPend ? (
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                              <Loader2 className="animate-spin text-apple-blue dark:text-blue-400" size={20} />
                              <span className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                                Generating...
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-red-500 space-y-1.5 p-3 text-center">
                              <AlertTriangle size={20} />
                              <span className="text-[9px] uppercase font-bold tracking-wider">Failed</span>
                            </div>
                          )}

                          {/* Float Badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white rounded uppercase">
                              {item.provider}
                            </span>
                          </div>

                          {/* Delete Action button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600/90 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Result"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Text and stats */}
                        <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <Badge
                                variant={
                                  isComp ? 'success' : isFail ? 'danger' : 'warning'
                                }
                                className="text-[9px] px-1.5 py-0 transform scale-90 origin-right"
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                              {item.prompt}
                            </p>
                          </div>

                          {isFail && item.error_message && (
                            <div className="text-[10px] text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-950/10 p-1.5 rounded border border-red-500/10 line-clamp-2 select-none">
                              {item.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {historyTotal > historyLimit && (
                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <span className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Showing page {historyPage} of {Math.ceil(historyTotal / historyLimit)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={historyPage === 1}
                        onClick={() => fetchHistory(historyPage - 1)}
                        className="p-1.5 rounded-apple border border-border text-foreground hover:bg-apple-gray dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={historyPage >= Math.ceil(historyTotal / historyLimit)}
                        onClick={() => fetchHistory(historyPage + 1)}
                        className="p-1.5 rounded-apple border border-border text-foreground hover:bg-apple-gray dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
