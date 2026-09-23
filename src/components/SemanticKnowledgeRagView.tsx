import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Tag,
  Cpu,
  Database,
  Layers,
  FileText,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider, isFirebaseConfigured } from '../lib/firebase';

interface NoteItem {
  id: number;
  userUid: string;
  title: string;
  category: string;
  content: string;
  tags: string;
  createdAt: string | null;
  similarity?: number;
}

export const SemanticKnowledgeRagView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'ask' | 'manage'>('search');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NoteItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // RAG Ask state
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<NoteItem[]>([]);

  // Create note form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Tài liệu kỹ thuật');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // User auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: { getIdToken: () => Promise<string> } | null) => {
      if (user) {
        setCurrentUser(user);
        const token = await user.getIdToken();
        setAuthToken(token);
      } else {
        setCurrentUser(null);
        setAuthToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  // Fetch all user notes
  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notes', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [authToken]);

  // Handle Google Sign-in
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured) {
      setAuthError('Firebase Authentication chưa được cấu hình khóa API hợp lệ. Bạn vẫn có thể dùng ứng dụng ở chế độ cục bộ.');
      return;
    }
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err?.message || 'Đăng nhập Google không thành công.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthToken(null);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Seed sample notes
  const handleSeedData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notes/seed', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchNotes();
      }
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Semantic Vector Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);
      const res = await fetch('/api/notes/search', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: searchQuery, limit: 6, minSimilarity: 0.1 }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // RAG Ask Question
  const handleAskRAG = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ragQuestion.trim()) return;

    try {
      setIsAsking(true);
      setRagAnswer(null);
      setRagSources([]);

      const res = await fetch('/api/notes/rag-ask', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: ragQuestion }),
      });

      if (res.ok) {
        const data = await res.json();
        setRagAnswer(data.answer);
        setRagSources(data.sources || []);
      }
    } catch (err) {
      console.error('RAG Ask error:', err);
      setRagAnswer('Đã có lỗi xảy ra khi truy vấn dữ liệu ngữ nghĩa. Vui lòng thử lại.');
    } finally {
      setIsAsking(false);
    }
  };

  // Create new note with embedding
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          tags: newTags,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setNewTags('');
        await fetchNotes();
        setActiveSubTab('manage');
      }
    } catch (err) {
      console.error('Create note error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: number) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setSearchResults((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  const sampleQuestions = [
    'Kiến trúc xác thực 2 lớp hoạt động thế nào và có ưu điểm gì?',
    'Làm thế nào để tối ưu hóa truy vấn PostgreSQL và index vector?',
    'Cách chia nhỏ công việc khi lập trình viên gặp bế tắc nhận thức?',
    'Goal Drift là gì và hệ thống cảnh báo khi nào?',
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-900/40 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-indigo-400" />
                Giai Đoạn 1 (MVP) · RAG & pgvector
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                vector(768) HNSW Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Tìm Kiếm Ngữ Nghĩa & Trợ Lý RAG Ghi Chú
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Truy vấn tài liệu và ghi chú kỹ thuật theo ngữ cảnh và ý định bằng vector cosine similarity (pgvector).
              Tổng hợp câu trả lời chính xác có dẫn nguồn tài liệu tham chiếu.
            </p>
          </div>

          {/* User Status / Firebase Auth */}
          <div className="flex items-center gap-2.5 p-2 bg-slate-950/80 border border-slate-800 rounded-lg shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="max-w-[130px] truncate text-[11px] text-slate-300 font-medium">
                  {currentUser.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline ml-1"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-400">Kho dữ liệu cục bộ / Khách</span>
                  <button
                    onClick={handleSignIn}
                    className="px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                  >
                    Đăng nhập Google
                  </button>
                </div>
                {authError && (
                  <span className="text-[10px] text-amber-400 max-w-xs text-right">
                    {authError}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveSubTab('search')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'search'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm Kiếm Ngữ Nghĩa (pgvector)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ask')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'ask'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hỏi Đáp RAG Grounding</span>
          </button>

          <button
            onClick={() => setActiveSubTab('manage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'manage'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kho Tài Liệu ({notes.length})</span>
          </button>

          {notes.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={isLoading}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Nạp 4 Tài Liệu Mẫu (Seed)</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUB-TAB 1: TÌM KIẾM NGỮ NGHĨA (SEMANTIC VECTOR SEARCH)
         ------------------------------------------------------------- */}
      {activeSubTab === 'search' && (
        <div className="space-y-6">
          {/* Search Input Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
            <form onSubmit={handleSearch} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Nhập câu hỏi hoặc khái niệm kỹ thuật bạn đang tìm kiếm:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ví dụ: Cách thức bảo mật JWT token, xử lý N+1 query trong postgres, chia nhỏ vi bước 10 phút..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>{isSearching ? 'Đang Tính Cosine...' : 'Tìm Theo Ngữ Nghĩa'}</span>
                </button>
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-slate-400">
                <span className="text-slate-500">Gợi ý truy vấn:</span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(q);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Results Display */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    Kết quả tìm kiếm ({searchResults.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sắp xếp theo độ tương đồng Cosine Similarity trên pgvector
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRagQuestion(searchQuery);
                    setActiveSubTab('ask');
                    handleAskRAG();
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Dùng kết quả này để hỏi RAG</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-xl p-8">
                  <Database className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-300">Không tìm thấy ghi chú khớp ngữ nghĩa</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Thử thay đổi từ khóa hoặc nạp thêm ghi chú vào kho tài liệu của bạn.
                  </div>
                  {notes.length === 0 && (
                    <button
                      onClick={handleSeedData}
                      className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950 border border-indigo-700/60 rounded-lg"
                    >
                      Nạp ngay 4 tài liệu kỹ thuật mẫu
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((item) => {
                    const similarityPct = Math.round((item.similarity || 0) * 100);
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-950 border border-slate-800 text-slate-400">
                              {item.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                similarityPct >= 70
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                  : similarityPct >= 40
                                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                                  : 'bg-slate-950 text-slate-400 border-slate-800'
                              }`}
                            >
                              Khớp {similarityPct}%
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-white leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-300/80 mt-2 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                            {item.content}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                            <Tag className="w-3 h-3 text-slate-600 shrink-0" />
                            <span className="truncate">{item.tags || 'Không có tag'}</span>
                          </div>
                          <button
                            onClick={() => {
                              setRagQuestion(`Giải thích chi tiết về: ${item.title}`);
                              setActiveSubTab('ask');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 text-[11px] font-sans flex items-center gap-1"
                          >
                            <span>Hỏi RAG</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: HỎI ĐÁP RAG (RETRIEVAL-AUGMENTED GENERATION)
         ------------------------------------------------------------- */}
      {activeSubTab === 'ask' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
            <form onSubmit={handleAskRAG} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Đặt câu hỏi cho Trợ lý RAG (Grounded Q&A):</span>
                <span className="text-[11px] text-indigo-400 font-normal">
                  Chỉ trả lời dựa trên kho tài liệu đã lưu & trích xuất nguồn
                </span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Sparkles className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ragQuestion}
                    onChange={(e) => setRagQuestion(e.target.value)}
                    placeholder="Ví dụ: Khi nào hệ thống phát hiện Goal Drift và cách khắc phục?"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAsking || !ragQuestion.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <Sparkles className={`w-4 h-4 ${isAsking ? 'animate-spin' : ''}`} />
                  <span>{isAsking ? 'Đang Trích Xuất & Tổng Hợp...' : 'Hỏi AI (RAG)'}</span>
                </button>
              </div>

              {/* Sample Questions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-slate-400">
                <span className="text-slate-500">Câu hỏi mẫu:</span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRagQuestion(q);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* RAG Answer Display */}
          {ragAnswer && (
            <div className="bg-slate-900/60 border border-indigo-900/40 rounded-xl p-6 space-y-5 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Câu Trả Lời Được Đối Chiếu Ngữ Cảnh</h3>
                    <div className="text-[11px] text-slate-400">Mô hình: Gemini 3.8 Flash + pgvector cosine retrieval</div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Grounded with {ragSources.length} Sources
                </span>
              </div>

              {/* Content Body */}
              <div className="text-sm text-slate-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
                {ragAnswer}
              </div>

              {/* Sources Citation List */}
              {ragSources.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tài liệu tham chiếu được trích xuất từ pgvector:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ragSources.map((source, idx) => (
                      <div
                        key={source.id || idx}
                        className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-indigo-300 truncate">
                            [Nguồn {idx + 1}]: {source.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 shrink-0">
                            {Math.round((source.similarity || 0) * 100)}% khớp
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {source.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: QUẢN LÝ KHO TÀI LIỆU & GHI CHÚ
         ------------------------------------------------------------- */}
      {activeSubTab === 'manage' && (
        <div className="space-y-6">
          {/* Create Note Section */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Thêm Ghi Chú / Tài Liệu Mới (Tự Động Tạo Vector Embedding)</span>
              </h2>
              {notes.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedData}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  Nạp nhanh 4 tài liệu mẫu
                </button>
              )}
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Tiêu đề tài liệu / Ghi chú (VD: ADR-002: Lựa chọn pgvector cho RAG)..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Tài liệu kỹ thuật">Tài liệu kỹ thuật</option>
                    <option value="Quyết định kiến trúc">Quyết định kiến trúc</option>
                    <option value="Ghi chú">Ghi chú</option>
                    <option value="Quy trình lập trình">Quy trình lập trình</option>
                    <option value="Nhật ký debug">Nhật ký debug</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Nội dung chi tiết của tài liệu, phân tích giải pháp, lưu ý kỹ thuật..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Từ khóa (cách nhau bằng dấu phẩy, VD: postgresql, pgvector, hnsw)..."
                  className="flex-1 px-3.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim() || !newContent.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Cpu className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
                  <span>{isCreating ? 'Đang Vector Hóa 768d...' : 'Lưu & Vector Hóa'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Danh sách tài liệu đã lưu ({notes.length})</span>
              <button
                onClick={fetchNotes}
                className="hover:text-slate-200 flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-xl p-8">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-slate-300">Chưa có tài liệu nào trong cơ sở dữ liệu</div>
                <div className="text-xs text-slate-500 mt-1">
                  Hãy thêm tài liệu mới ở trên hoặc nạp ngay 4 tài liệu kỹ thuật mẫu.
                </div>
                <button
                  onClick={handleSeedData}
                  disabled={isLoading}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Nạp 4 tài liệu kỹ thuật mẫu ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-950 border border-slate-800 text-slate-400">
                          {note.category}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Xóa ghi chú"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{note.title}</h3>
                      <p className="text-xs text-slate-300/80 mt-2 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="truncate max-w-[200px]">{note.tags || 'No tags'}</span>
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Vector HNSW
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
