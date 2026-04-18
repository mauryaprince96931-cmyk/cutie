/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Settings, 
  Heart, 
  Star, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Upload,
  GripVertical,
  AlertCircle,
  X as XIcon,
  Plus as PlusIcon,
  Edit2,
  ChevronRight,
  BookOpen,
  LayoutList,
  GitBranch,
  CheckCircle2,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { EndingMessageDialog } from './components/EndingMessageDialog';
import { LoginScreen, AdminPanel } from './components/Auth';
import { Button } from '@/components/ui/button';
import { loadAuthData, saveAuthData } from './lib/auth';
import type { User as UserType } from './types';
import { loadSoundPreference, setSoundEnabled, playSound, initAudio } from './lib/sound';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

// --- Types ---

interface Ending {
  id: string;
  title: string;
  subtitle: string;
}

interface Option {
  id: string;
  text: string;
  nextId: string | null;
  isCorrect: boolean;
  wrongMessage: string;
  endingId?: string | null;
  ending?: { title: string; subtitle: string } | null;
}

interface Statement {
  id: string;
  text: string;
  options: Option[];
}

// --- Components ---

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  key?: string;
}

const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    willChange: 'transform'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "px-1 relative group transition-all duration-200",
        isDragging ? "z-50" : "z-auto"
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute -left-2 md:-left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-2 hover:bg-primary/10 rounded-full transition-all duration-150 opacity-0 group-hover:opacity-100 z-20"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className={cn(
        "w-full mx-auto transition-all duration-300",
        isDragging ? "scale-[1.01] opacity-80 shadow-premium rounded-[28px]" : "scale-100 opacity-100 shadow-none"
      )}>
        {children}
      </div>
    </div>
  );
};

// --- Constants ---

const STORAGE_KEY = 'cuteMessageAppData';

const LoadingMessage = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => {
        let next;
        do {
          next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        } while (next === prev);
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.h2 
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="text-2xl font-heading font-bold text-text-dark tracking-[1px] text-[#A67C85]"
      >
        {LOADING_MESSAGES[index]}
      </motion.h2>
    </AnimatePresence>
  );
};

const DEFAULT_STATEMENTS: Statement[] = [
  {
    id: '1',
    text: 'Do you love me? 💖',
    options: [
      {
        id: 'opt1',
        text: 'Yes, forever! ✨',
        nextId: null,
        isCorrect: true,
        wrongMessage: ''
      },
      {
        id: 'opt2',
        text: 'Maybe... 🙄',
        nextId: null,
        isCorrect: false,
        wrongMessage: 'Wrong answer! Try again, I know you do! 😤❤️'
      }
    ]
  }
];

type AppMode = 'login' | 'admin' | 'builder' | 'viewer' | 'test';

interface User {
  id: string;
  name: string;
  passcode: string;
  data: Statement[];
}

type BuilderView = 'LIST' | 'FLOW';

interface ValidationError {
  statementId: string;
  optionId?: string;
  field: 'text' | 'options' | 'optionText' | 'wrongMessage' | 'nextId';
  message: string;
}

interface NodePosition {
  x: number;
  y: number;
}

interface FlowViewProps {
  statements: Statement[];
  validationErrors: ValidationError[];
  onEditNode: (id: string) => void;
}

const FlowView = ({ statements, validationErrors, onEditNode }: FlowViewProps) => {
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvas = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  
  useEffect(() => {
    const newPositions = { ...positions };
    let changed = false;
    statements.forEach((s, i) => {
      if (!newPositions[s.id]) {
        newPositions[s.id] = { 
          x: 150 + (i % 3) * 350, 
          y: 150 + Math.floor(i / 3) * 280 
        };
        changed = true;
      }
    });
    if (changed) setPositions(newPositions);
  }, [statements]);

  const handleDrag = (id: string, delta: { x: number, y: number }) => {
    setPositions(prev => ({
      ...prev,
      [id]: { 
        x: (prev[id]?.x || 0) + delta.x / transform.scale, 
        y: (prev[id]?.y || 0) + delta.y / transform.scale 
      }
    }));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const isNode = (e.target as HTMLElement).closest('.flow-node');
    const isButton = (e.target as HTMLElement).closest('button');
    
    if (!isNode && !isButton) {
      isDraggingCanvas.current = true;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as { x: number, y: number }[];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      
      if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
        const delta = dist - lastPinchDist.current;
        const zoomFactor = 1 + (delta / lastPinchDist.current);
        const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.6), 2.0);
        
        // Midpoint for centering zoom
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const localX = midX - rect.left;
          const localY = midY - rect.top;
          
          setTransform(prev => {
            const scaleRatio = newScale / prev.scale;
            return {
              scale: newScale,
              x: localX - (localX - prev.x) * scaleRatio,
              y: localY - (localY - prev.y) * scaleRatio
            };
          });
        }
      }
      lastPinchDist.current = dist;
    } else if (isDraggingCanvas.current && activePointers.current.size === 1) {
      const deltaX = e.clientX - lastPointerPos.current.x;
      const deltaY = e.clientY - lastPointerPos.current.y;
      
      setTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }
    if (isDraggingCanvas.current && activePointers.current.size === 0) {
      isDraggingCanvas.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.05 : 0.95;
    const newScale = Math.min(Math.max(transform.scale * factor, 0.6), 2.0);

    setTransform(prev => {
      const scaleRatio = newScale / prev.scale;
      return {
        scale: newScale,
        x: localX - (localX - prev.x) * scaleRatio,
        y: localY - (localY - prev.y) * scaleRatio
      };
    });
  };

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[75vh] bg-secondary/5 rounded-[2rem] border-2 border-dashed border-secondary/20 overflow-hidden group touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
        <Button 
          variant="secondary" 
          size="icon" 
          className="w-10 h-10 rounded-full shadow-premium bg-white/90 backdrop-blur-sm hover:bg-white"
          onClick={() => {
            setTransform(prev => {
              const newScale = Math.min(prev.scale + 0.2, 2.0);
              return { ...prev, scale: newScale };
            });
          }}
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="w-10 h-10 rounded-full shadow-premium bg-white/90 backdrop-blur-sm hover:bg-white"
          onClick={() => {
            setTransform(prev => {
              const newScale = Math.max(prev.scale - 0.2, 0.6);
              return { ...prev, scale: newScale };
            });
          }}
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="w-10 h-10 rounded-full shadow-premium bg-white/90 backdrop-blur-sm hover:bg-white"
          onClick={resetView}
        >
          <Maximize className="w-5 h-5" />
        </Button>
      </div>

      <motion.div 
        className="absolute inset-0"
        animate={{ 
          x: transform.x, 
          y: transform.y, 
          scale: transform.scale 
        }}
        transition={{ duration: 0.05, ease: "linear" }}
        style={{ originX: 0, originY: 0, willChange: 'transform', transform: 'translateZ(0)' }}
      >
        <div className="relative w-full h-full p-20">
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <marker id="arrow-correct" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#A8E6CF" />
              </marker>
              <marker id="arrow-wrong" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#FEB6BA" />
              </marker>
            </defs>
            <AnimatePresence>
              {statements.map(s => s.options.map(opt => {
                if (!opt.nextId) return null;
                const from = positions[s.id];
                const to = positions[opt.nextId];
                if (!from || !to) return null;

                const x1 = from.x + 220;
                const y1 = from.y + 60;
                const x2 = to.x;
                const y2 = to.y + 60;

                const dx = x2 - x1;
                const cx1 = x1 + Math.max(dx / 2, 50);
                const cx2 = x2 - Math.max(dx / 2, 50);

                return (
                  <motion.path
                    key={`${s.id}-${opt.id}`}
                    animate={{ 
                      d: `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`,
                      opacity: 0.6 
                    }}
                    fill="none"
                    stroke={opt.isCorrect ? '#A8E6CF' : '#FEB6BA'}
                    strokeWidth="3"
                    strokeDasharray={opt.isCorrect ? "0" : "8,5"}
                    markerEnd={opt.isCorrect ? "url(#arrow-correct)" : "url(#arrow-wrong)"}
                    initial={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="transition-colors duration-200"
                  />
                );
              }))}
            </AnimatePresence>
          </svg>

          <AnimatePresence>
            {statements.map((s, i) => {
              const hasNodeError = validationErrors.some(e => e.statementId === s.id);
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: positions[s.id]?.x || 0, 
                    y: positions[s.id]?.y || 0,
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 40,
                    opacity: { duration: 0.2 }
                  }}
                  drag
                  dragMomentum={false}
                  onDrag={(_, info) => handleDrag(s.id, info.delta)}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    willChange: 'transform'
                  }}
                  className={cn(
                    "w-[220px] scrapbook-card !p-5 cursor-grab active:cursor-grabbing z-10 transition-shadow border-2 rounded-[28px] flow-node",
                    hasNodeError ? "border-accent shadow-accent/10" : "border-transparent hover:border-primary/20 hover:shadow-md"
                  )}
                >
                <div className="absolute -top-1 -right-1 text-primary/40">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-accent px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      #{i + 1}
                    </span>
                    {hasNodeError && (
                      <AlertCircle className="w-3.5 h-3.5 text-accent animate-pulse" />
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 rounded-full hover:bg-primary/10 text-primary"
                    onClick={() => onEditNode(s.id)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs font-bold text-text-dark line-clamp-3 leading-relaxed mb-3">
                  {s.text || "Untitled Statement..."}
                </p>
                <div className="flex flex-wrap gap-1">
                  {s.options.map(opt => (
                    <div 
                      key={opt.id} 
                      className={cn(
                        "w-2 h-2 rounded-full",
                        opt.isCorrect ? "bg-highlight" : "bg-primary"
                      )}
                      title={opt.text}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
    </div>
  );
};

// --- Decorative Components ---

const FloatingElements = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            opacity: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: ['-10%', '110%'],
            rotate: [0, 360],
            opacity: [0, 0.15, 0]
          }}
          transition={{ 
            duration: Math.random() * 20 + 25, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * -30
          }}
          className="absolute text-primary/30 text-3xl"
        >
          {['💖', '✨', '🌸', '🍓'][i % 4]}
        </motion.div>
      ))}
    </div>
  );
};

const WRONG_MESSAGES = [
  "Oopsiee! That’s not the one 🥺💖",
  "Aww nooo… try again cutie ✨",
  "Hehe wrong choice 😝💞",
  "Not this one silly! 💕",
  "Almost there… try again 🌸",
  "Naughty choice 😤💖 try again!",
  "Oops! My heart says no 😳💓",
  "Try again baby 💕 you got this!"
];

const LOADING_MESSAGES = [
  "Wait a bit Miss cutie...",
  "Picking flowers...",
  "Be patience my lady...",
  "Pretty things takes time...",
  "What a cutie is waiting..."
];

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<AppMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Implementation of auth handlers
  const handleUserLogin = (name: string, pass: string) => {
    const authData = loadAuthData();
    const user = authData.users.find((u: User) => u.name === name && u.passcode === pass);
    if (user) {
      setCurrentUser(user);
      setMode('viewer');
    } else {
      alert("Invalid login!");
    }
  };
  const handleAdminLogin = (pass: string) => {
    const authData = loadAuthData();
    if (authData.admin.passcode === pass) {
      setIsAdmin(true);
      setMode('admin');
      setUsers(authData.users);
    } else {
      alert("Invalid admin passcode!");
    }
  };

  const handleCreateUser = (name: string, pass: string) => {
    const newUser = { id: Date.now().toString(), name, passcode: pass, data: [] };
    const newUsers = [...users, newUser];
    setUsers(newUsers);
    const authData = loadAuthData();
    authData.users = newUsers;
    saveAuthData(authData);
  };

  const handleDeleteUser = (id: string) => {
    const newUsers = users.filter(u => u.id !== id);
    setUsers(newUsers);
    const authData = loadAuthData();
    authData.users = newUsers;
    saveAuthData(authData);
  };
    
  const handleEnterBuilder = (user: User) => {
    console.log("Opening builder for:", user);
    
    // Ensure data exists
    if (!user.data) {
        user.data = [];
    }

    setCurrentUser(user);
    setMode('builder');
  };

  if (mode === 'login') {
    return <LoginScreen onLogin={handleUserLogin} onAdminLogin={handleAdminLogin} />;
  }

  if (mode === 'admin') {
    return <AdminPanel users={users} onCreateUser={handleCreateUser} onEnterBuilder={handleEnterBuilder} onDeleteUser={handleDeleteUser} />;
  }

  // Rest of the App component...
  const [builderView, setBuilderView] = useState<BuilderView>('LIST');
  const [isReady, setIsReady] = useState(false);
  const [statements, setStatements] = useState<Statement[]>(currentUser?.data || []);

  useEffect(() => {
    if (currentUser) {
        setStatements(currentUser.data || []);
    }
  }, [currentUser]);

  // Sync back to currentUser on change
  useEffect(() => {
    if (currentUser) {
        currentUser.data = statements;
        const authData = loadAuthData();
        const userIndex = authData.users.findIndex((u: User) => u.id === currentUser.id);
        if (userIndex !== -1) {
            authData.users[userIndex].data = statements;
            saveAuthData(authData);
        }
    }
  }, [statements]);
  const [endings, setEndings] = useState<Ending[]>([]);
  const [ending, setEnding] = useState<{ title: string; subtitle: string }>({
    title: "You chose love 💖",
    subtitle: "I knew you would… 🥺"
  });
  const [hasError, setHasError] = useState(false);
  const [endingActive, setEndingActive] = useState(false);
  const [currentEndingDisplay, setCurrentEndingDisplay] = useState<{title: string, subtitle: string} | null>(null);
  const [showEndingModal, setShowEndingModal] = useState(false);
  
  // Manage body classes for UI isolation
  useEffect(() => {
    document.body.classList.toggle('ending-active', endingActive);
    document.body.classList.toggle('ending-panel-open', showEndingModal);
  }, [endingActive, showEndingModal]);

  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWrongPopup, setShowWrongPopup] = useState(false);
  const [wrongMessage, setWrongMessage] = useState('');
  const [lastWrongMsgIndex, setLastWrongMsgIndex] = useState<number | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved 💾' | 'Saving...'>('Saved 💾');
  const [soundOn, setSoundOn] = useState(true);
  const [statementToDelete, setStatementToDelete] = useState<string | null>(null);
  const isDeletingRef = useRef(false);

  // Load on start
  useEffect(() => {
    setSoundOn(loadSoundPreference());
    
    const saved = localStorage.getItem('cute_app_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ending) setEnding(parsed.ending);
        
        let loadedEndings: Ending[] = parsed.endings || [];
        let loadedStatements: Statement[] = parsed.statements || [];

        // MIGRATION: Auto-convert inline option.ending -> centralized endings
        let needsSave = false;
        loadedStatements = loadedStatements.map(stmt => {
          return {
            ...stmt,
            options: stmt.options.map(opt => {
              if (opt.ending && !opt.endingId) {
                const newEndingId = `end-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                loadedEndings.push({
                  id: newEndingId,
                  title: opt.ending.title,
                  subtitle: opt.ending.subtitle
                });
                needsSave = true;
                return {
                  ...opt,
                  endingId: newEndingId
                };
              }
              return opt;
            })
          };
        });

        setEndings(loadedEndings);
        setStatements(loadedStatements);
        
        if (needsSave) {
          localStorage.setItem('cute_app_data', JSON.stringify({ statements: loadedStatements, ending: parsed.ending, endings: loadedEndings }));
        }

      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    } else {
      // Only set defaults if no data exists at all (first run)
      setStatements(DEFAULT_STATEMENTS);
    }
  }, []);

  // Sync endingActive
  useEffect(() => {
    setEndingActive(currentStatementId === 'END');
  }, [currentStatementId]);

  // Debounced Save
  useEffect(() => {
    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
      localStorage.setItem('cute_app_data', JSON.stringify({ statements, ending, endings }));
      setSaveStatus('Saved 💾');
    }, 500);
    return () => clearTimeout(timer);
  }, [statements, ending, endings]);

  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    setSoundEnabled(newState);
    if (newState) {
      initAudio();
      playSound('click');
    }
  };

  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    const statementIds = new Set(statements.map(s => s.id));

    statements.forEach(s => {
      if (!s.text.trim()) {
        errors.push({ statementId: s.id, field: 'text', message: 'Question text is required' });
      }
      if (s.options.length < 2) {
        errors.push({ statementId: s.id, field: 'options', message: 'At least 2 options are required' });
      }
      if (!s.options.some(opt => opt.isCorrect)) {
        errors.push({ statementId: s.id, field: 'options', message: 'At least one correct option needed' });
      }

      s.options.forEach(opt => {
        if (!opt.text.trim()) {
          errors.push({ statementId: s.id, optionId: opt.id, field: 'optionText', message: 'Option text required' });
        }
        if (!opt.isCorrect && !opt.wrongMessage.trim()) {
          errors.push({ statementId: s.id, optionId: opt.id, field: 'wrongMessage', message: 'Oops message required' });
        }
        if (opt.isCorrect && opt.nextId && !statementIds.has(opt.nextId)) {
          errors.push({ statementId: s.id, optionId: opt.id, field: 'nextId', message: 'Invalid next statement' });
        }
      });
    });
    return errors;
  }, [statements]);

  // Initial Data Load with Validation
  useEffect(() => {
    const loadData = () => {
      try {
        console.log('Loading app data...');
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (!saved) {
          console.log('No saved data, using defaults.');
          setStatements(DEFAULT_STATEMENTS);
          setIsReady(true);
          return;
        }

        const parsed = JSON.parse(saved);
        
        // Validation: Must be a non-empty array
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Data is not a valid array or is empty');
        }

        // Deep Validation: Check first item structure
        const first = parsed[0];
        if (!first.id || !first.text || !Array.isArray(first.options)) {
          throw new Error('Data structure is invalid');
        }

        setStatements(parsed);
        console.log('Data loaded successfully.');
      } catch (err) {
        console.error('Critical: Failed to load or validate data:', err);
        // If data is corrupted, clear it and use defaults
        localStorage.removeItem(STORAGE_KEY);
        setStatements(DEFAULT_STATEMENTS);
      } finally {
        setIsReady(true);
      }
    };

    loadData();
  }, []);

  // Cleanup invalid nextId references when statements are deleted
  useEffect(() => {
    if (!isReady || statements.length === 0) return;
    
    const statementIds = new Set(statements.map(s => s.id));
    let hasChanges = false;
    
    const cleanedStatements = statements.map(s => {
      let optionsChanged = false;
      const cleanedOptions = s.options.map(opt => {
        if (opt.nextId && !statementIds.has(opt.nextId)) {
          optionsChanged = true;
          hasChanges = true;
          return { ...opt, nextId: null };
        }
        return opt;
      });
      
      if (optionsChanged) {
        return { ...s, options: cleanedOptions };
      }
      return s;
    });
    
    if (hasChanges) {
      setStatements(cleanedStatements);
    }
  }, [statements, isReady]);

  // Global Error Catcher (Functional)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Caught global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Save to localStorage whenever statements change
  useEffect(() => {
    if (!isReady || statements.length === 0) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statements));
    } catch (err) {
      console.error('Failed to save data to localStorage:', err);
    }
  }, [statements, isReady]);

  // Reset selected ID when statement changes
  useEffect(() => {
    setSelectedId(null);
  }, [currentStatementId]);

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Handlers ---

  const addStatement = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newStatement: Statement = {
      id: newId,
      text: 'New Question? 🌸',
      options: [
        {
          id: Math.random().toString(36).substr(2, 9),
          text: 'Option A',
          nextId: null,
          isCorrect: true,
          wrongMessage: ''
        },
        {
          id: Math.random().toString(36).substr(2, 9),
          text: 'Option B',
          nextId: null,
          isCorrect: false,
          wrongMessage: 'Oops! Try again 🧸'
        }
      ]
    };
    setStatements([...statements, newStatement]);
  };

  const deleteStatement = (id: string) => {
    setStatements(statements.filter(s => s.id !== id));
  };

  const updateStatement = (id: string, updates: Partial<Statement>) => {
    setStatements(statements.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateOption = (statementId: string, optionId: string, updates: Partial<Option>) => {
    setStatements(statements.map(s => {
      if (s.id === statementId) {
        return {
          ...s,
          options: s.options.map(opt => opt.id === optionId ? { ...opt, ...updates } : opt)
        };
      }
      return s;
    }));
  };

  const addOption = (statementId: string) => {
    setStatements(statements.map(s => {
      if (s.id === statementId) {
        const newOption: Option = {
          id: Math.random().toString(36).substr(2, 9),
          text: `Option ${String.fromCharCode(65 + s.options.length)}`,
          nextId: null,
          isCorrect: false,
          wrongMessage: 'Oops! Try again 🧸'
        };
        return {
          ...s,
          options: [...s.options, newOption]
        };
      }
      return s;
    }));
  };

  const deleteOption = (statementId: string, optionId: string) => {
    setStatements(statements.map(s => {
      if (s.id === statementId) {
        if (s.options.length <= 2) return s;
        return {
          ...s,
          options: s.options.filter(opt => opt.id !== optionId)
        };
      }
      return s;
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStatements((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const startViewer = () => {
    if (statements.length === 0) return;
    
    // Validation: Each statement must have at least one correct option
    const invalidStatement = statements.find(s => !s.options.some(opt => opt.isCorrect));
    if (invalidStatement) {
      setErrorMessage(`Statement "${invalidStatement.text.substring(0, 30)}..." needs at least one correct option! ✨`);
      setShowErrorDialog(true);
      return;
    }

    // Validation: No empty option text
    const emptyOptionStatement = statements.find(s => s.options.some(opt => !opt.text.trim()));
    if (emptyOptionStatement) {
      setErrorMessage(`One of your statements has an empty option! Please add some text. 🧸`);
      setShowErrorDialog(true);
      return;
    }

    setCurrentStatementId(statements[0].id);
    setEndingActive(false);
    setMode('VIEWER');
  };

  const resetBuilder = () => {
    if (confirm('Are you sure you want to reset everything? This will clear all your progress.')) {
      setStatements(DEFAULT_STATEMENTS);
      localStorage.removeItem('cute_app_data');
    }
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(statements));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "cute_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error('Invalid file format. The configuration should be a list of statements.');
        }
        setStatements(json);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'The file you uploaded is not a valid JSON configuration.');
        setShowErrorDialog(true);
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again if fixed
    e.target.value = '';
  };

  // --- Viewer Logic ---

  const currentStatement = useMemo(() => 
    statements.find(s => s.id === currentStatementId), 
    [statements, currentStatementId]
  );

  const createRipple = (x: number, y: number) => {
    playSound('ripple');
    const layer = document.getElementById('bg-animation-layer');
    if (!layer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const gradients = [
      'radial-gradient(circle, #FF9AA2 0%, #FFB7B2 100%)',
      'radial-gradient(circle, #FEC8D8 0%, #FF9CEE 100%)',
      'radial-gradient(circle, #FFD6A5 0%, #FFAAA5 100%)'
    ];
    ripple.style.background = gradients[Math.floor(Math.random() * gradients.length)];
    // Adjust coordinates relative to the layer which is inset: 0
    ripple.style.left = `${x - 50}px`;
    ripple.style.top = `${y - 50}px`;
    layer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const handleOptionSelect = (option: Option, x?: number, y?: number) => {
    if (endingActive) return;
    if (!option) return;
    
    // Play interaction sound based on correctness or if it brings you to ending
    const isEndingBound = option.endingId || option.ending || (option.isCorrect && !option.nextId);
    
    if (isEndingBound) {
      playSound('ending');
    } else if (option.isCorrect) {
      playSound('correct');
    } else {
      playSound('wrong');
    }
    
    // 1. Centralized Ending
    if (option.endingId) {
      if (x !== undefined && y !== undefined && option.isCorrect) createRipple(x, y);
      const selectedEnding = endings.find(e => e.id === option.endingId);
      if (selectedEnding) setCurrentEndingDisplay(selectedEnding);
      setTimeout(() => {
        setEndingActive(true);
        setCurrentStatementId('END');
      }, option.isCorrect ? 300 : 0);
      return;
    }

    // 2. Legacy Inline Ending
    if (option.ending) {
      if (x !== undefined && y !== undefined && option.isCorrect) createRipple(x, y);
      setCurrentEndingDisplay(option.ending);
      setTimeout(() => {
        setEndingActive(true);
        setCurrentStatementId('END');
      }, option.isCorrect ? 300 : 0);
      return;
    }

    if (option.isCorrect && !option.nextId) {
      setCurrentEndingDisplay(null); // use global fallback
      setEndingActive(true);
      setCurrentStatementId('END');
      return;
    }
    
    if (option.isCorrect) {
      if (option.nextId) {
        // Trigger ripple
        if (x !== undefined && y !== undefined) createRipple(x, y);
        // Safety check: Does the next statement actually exist?
        const exists = statements.some(s => s.id === option.nextId);
        if (exists) {
          setTimeout(() => setCurrentStatementId(option.nextId!), 300);
        } else {
          console.warn(`Statement with ID ${option.nextId} not found. Ending sequence.`);
          setCurrentEndingDisplay(null);
          setEndingActive(true);
          setCurrentStatementId('END');
        }
      } else {
        setCurrentEndingDisplay(null);
        setEndingActive(true);
        setCurrentStatementId('END');
      }
    } else {
      if (option.wrongMessage) {
        setWrongMessage(option.wrongMessage);
      } else {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * WRONG_MESSAGES.length);
        } while (nextIndex === lastWrongMsgIndex && WRONG_MESSAGES.length > 1);
        
        setLastWrongMsgIndex(nextIndex);
        setWrongMessage(WRONG_MESSAGES[nextIndex]);
      }
      setShowWrongPopup(true);
    }
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-text-dark text-center relative overflow-hidden">
        <FloatingElements />
        <div className="text-8xl mb-8 animate-bounce">🥺</div>
        <h1 className="text-4xl font-heading font-extrabold mb-4 text-gradient">Something went wrong!</h1>
        <p className="mb-10 max-w-md opacity-70 font-semibold text-lg">
          The app encountered an unexpected error. Don't worry, your data is likely safe! ✨
        </p>
        <Button 
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }}
          className="pill-button bg-premium-gradient"
        >
          Reset App & Try Again 💖
        </Button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <motion.div 
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#FFF2E0] to-[#FFC0CB] text-text-dark relative overflow-hidden"
      >
        <FloatingElements />
        
        <div className="relative flex flex-col items-center">
          {/* Main Loader: Refined Floating Heart */}
          <div className="relative mb-10 w-24 h-24 flex items-center justify-center">
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                scale: [0.96, 1, 0.96],
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative z-10 w-20 h-20 bg-premium-gradient rounded-[2rem] flex items-center justify-center shadow-premium ring-4 ring-white/50 backdrop-blur-sm"
            >
              <Heart className="w-10 h-10 text-white fill-white drop-shadow-sm" />
            </motion.div>
            
            {/* Tiny secondary floating elements (Hearts & Sparkles) */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  y: [-10, -60],
                  x: [(i - 1) * 40, (i - 1) * 50 + (i === 1 ? 0 : (i === 0 ? -15 : 15))],
                  scale: [0.5, 1, 0.8]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: "easeOut"
                }}
                className="absolute text-accent"
              >
                {i % 2 === 0 ? <Heart className="w-4 h-4 fill-current" /> : <Sparkles className="w-5 h-5" />}
              </motion.div>
            ))}
          </div>

          {/* Loading Text */}
          <div className="text-center space-y-3">
            <LoadingMessage />
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.4 }}
              className="text-[11px] font-bold uppercase tracking-[2px] text-text-dark/40"
            >
              Almost ready…
            </motion.p>
          </div>

          {/* Progress Indicator: Sequential Bouncing Dots */}
          <div className="mt-10 flex gap-2.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ 
                  y: [0, -8, 0],
                  opacity: [0.3, 1, 0.3],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.15,
                  ease: "easeInOut" 
                }}
                className="w-2.5 h-2.5 rounded-full bg-accent/60 shadow-sm"
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Final safety check for statements removed
  
  return (
    <div className="min-h-screen relative">
      <div className="bg-animation-layer" id="bg-animation-layer" />
      <div className="relative z-10 p-4 md:p-8 pb-24 flex flex-col items-center overflow-x-hidden">
        <FloatingElements />
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-center mb-12 space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-5xl md:text-6xl font-heading font-extrabold tracking-tight text-gradient">
              Cutie
            </h1>
            <Heart className="w-8 h-8 text-primary fill-primary" />
          </div>
        </motion.header>

      <main className="w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
          {mode === 'BUILDER' ? (
            <motion.div
              key="builder"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Toolbar */}
              <div className="bottom-controls builder-controls bg-white/90 backdrop-blur-md p-5 rounded-[32px] shadow-soft sticky top-4 z-10 border border-white/50 space-y-4">
                {/* Row 1: Primary Status & Action */}
                <div className="flex items-center justify-between">
                  {/* Status Badge */}
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300",
                    validationErrors.length > 0 
                      ? "bg-accent/5 border-accent/20 text-accent" 
                      : "bg-highlight/5 border-highlight/20 text-highlight"
                  )}>
                    {validationErrors.length > 0 ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {validationErrors.length} {validationErrors.length === 1 ? 'Error' : 'Errors'} 💔
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Ready 💖
                        </span>
                      </>
                    )}
                  </div>

                  {/* Main Action */}
                  <Button 
                    onClick={() => {
                      if (validationErrors.length > 0) {
                        setErrorMessage(`Please fix ${validationErrors.length} error(s) before continuing! 💔`);
                        setShowErrorDialog(true);
                      } else {
                        startViewer();
                      }
                    }} 
                    className={cn(
                      "pill-button font-bold text-sm px-6 h-10 transition-all duration-300",
                      validationErrors.length === 0 ? "bg-premium-gradient shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    Finish & Run ▶
                  </Button>
                </div>

                {/* Divider Line */}
                <div className="h-px bg-secondary/20 w-full" />

                {/* Row 2: Secondary Actions */}
                <div className="flex items-center justify-center gap-3">
                  <Button variant="ghost" onClick={exportConfig} className="rounded-full hover:bg-primary/10 text-xs font-bold text-muted-foreground h-9 px-4">
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importConfig} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Button variant="ghost" className="rounded-full hover:bg-primary/10 text-xs font-bold text-muted-foreground h-9 px-4">
                      <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                  </div>

                  <Button variant="ghost" onClick={() => setShowEndingModal(true)} className="rounded-full hover:bg-primary/10 text-xs font-bold text-muted-foreground h-9 px-4">
                    <Heart className="w-4 h-4 mr-2" /> Endings 💖
                  </Button>
                </div>
              </div>

              {builderView === 'LIST' ? (
                <>
                  {/* Statements List */}
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={statements.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-6 pb-20">
                        {statements.map((statement, index) => (
                          <SortableItem key={statement.id} id={statement.id}>
                            <Card className="scrapbook-card relative overflow-hidden" id={`statement-${statement.id}`}>
                              <div className="absolute -top-2 -right-2 text-primary/20 rotate-12">
                                <Sparkles className="w-12 h-12" />
                              </div>
                              <div className="absolute -bottom-4 -left-4 text-secondary/30 rotate-[-15deg]">
                                <span className="text-5xl">🌸</span>
                              </div>
                              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                  <span className="bg-primary/20 text-accent px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                    #{index + 1}
                                  </span>
                                  <CardTitle className="text-2xl font-heading font-extrabold text-text-dark">Statement</CardTitle>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatementToDelete(statement.id);
                                  }}
                                  className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <div className="space-y-4">
                                  <Label className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/80 font-bold">Question Text</Label>
                                  <Textarea 
                                    value={statement.text}
                                    onChange={(e) => updateStatement(statement.id, { text: e.target.value })}
                                    className={cn(
                                      "stitched-input min-h-[120px] text-xl font-bold transition-all leading-relaxed",
                                      validationErrors.some(e => e.statementId === statement.id && e.field === 'text') && "border-accent ring-1 ring-accent/20"
                                    )}
                                    placeholder="What do you want to ask?"
                                  />
                                  {validationErrors.filter(e => e.statementId === statement.id && e.field === 'text').map((e, i) => (
                                    <p key={i} className="text-[10px] text-accent font-bold mt-1 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> {e.message}
                                    </p>
                                  ))}
                                </div>

                                <div className="space-y-6">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/80 font-bold">Options</Label>
                                    {validationErrors.filter(e => e.statementId === statement.id && e.field === 'options').map((e, i) => (
                                      <div key={i} className="flex items-center gap-2 text-accent animate-pulse">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{e.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="flex flex-col gap-4 w-full max-w-full">
                                    {statement.options.map((option, optIdx) => (
                                      <div key={option.id} className={cn(
                                        "p-3 px-4 rounded-2xl bg-secondary/10 border relative group transition-all hover:bg-secondary/20 w-full flex flex-col",
                                        validationErrors.some(e => e.statementId === statement.id && e.optionId === option.id) 
                                          ? "border-accent/30 bg-accent/5" 
                                          : "border-secondary/30"
                                      )}>
                                        {statement.options.length > 2 && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteOption(statement.id, option.id)}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-sm border border-secondary text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all z-10"
                                          >
                                            <XIcon className="w-3.5 h-3.5" />
                                          </Button>
                                        )}

                                        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full mt-2 sm:mt-0">
                                          <div className="flex flex-col flex-1 w-full min-w-0">
                                            <div className="flex items-center gap-2 w-full">
                                              <span className="w-5 h-5 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-text-dark/50">
                                                {optIdx + 1}
                                              </span>
                                              <Input 
                                                value={option.text}
                                                onChange={(e) => updateOption(statement.id, option.id, { text: e.target.value })}
                                                className={cn(
                                                  "rounded-lg bg-white border-none shadow-sm font-semibold h-8 w-full text-sm transition-all flex-1 min-w-0 break-words",
                                                  validationErrors.some(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'optionText') && "ring-2 ring-accent/50"
                                                )}
                                                placeholder="Option text..."
                                              />
                                            </div>
                                            {validationErrors.filter(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'optionText').map((e, i) => (
                                              <p key={i} className="text-[9px] text-accent font-bold mt-1 ml-7">{e.message}</p>
                                            ))}
                                          </div>
                                          
                                          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto flex-shrink-0">
                                            <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-lg border border-secondary/20 flex-shrink-0">
                                              <Label htmlFor={`correct-${option.id}`} className="text-[10px] font-semibold uppercase tracking-widest cursor-pointer whitespace-nowrap text-muted-foreground mt-0.5">
                                                {option.isCorrect ? 'Correct' : 'Wrong'}
                                              </Label>
                                              <Switch 
                                                id={`correct-${option.id}`}
                                                checked={option.isCorrect}
                                                onCheckedChange={(val) => updateOption(statement.id, option.id, { isCorrect: val })}
                                                className="scale-75 data-[state=checked]:bg-accent m-0 flex-shrink-0"
                                              />
                                            </div>

                                            {option.isCorrect ? (
                                              <div className="flex flex-col gap-2 flex-grow sm:flex-grow-0 sm:min-w-[140px] w-full sm:w-auto">
                                                <Select 
                                                  value={option.nextId || 'END'} 
                                                  onValueChange={(val) => {
                                                    if (val === 'END') {
                                                      updateOption(statement.id, option.id, { nextId: null });
                                                    } else {
                                                      updateOption(statement.id, option.id, { nextId: val, endingId: null });
                                                    }
                                                  }}
                                                >
                                                  <SelectTrigger className={cn(
                                                    "rounded-lg bg-white border-none shadow-sm h-8 text-[10px] font-bold w-full transition-all",
                                                    validationErrors.some(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'nextId') && "ring-2 ring-accent/50"
                                                  )}>
                                                    <SelectValue placeholder="Next Step" />
                                                  </SelectTrigger>
                                                  <SelectContent className="rounded-[20px] border border-secondary/20 shadow-2xl bg-[#FFF2E0]/95 backdrop-blur-md z-[9999] isolate">
                                                    <SelectItem value="END">Ending 🏁</SelectItem>
                                                    {statements
                                                      .map((s, idx) => ({ ...s, originalIndex: idx }))
                                                      .filter(s => s.id !== statement.id)
                                                      .map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                          #{s.originalIndex + 1}: {s.text.substring(0, 15)}...
                                                        </SelectItem>
                                                      ))
                                                    }
                                                  </SelectContent>
                                                </Select>

                                                {!option.nextId && endings.length > 0 && (
                                                  <Select
                                                    value={option.endingId || 'GLOBAL'}
                                                    onValueChange={(val) => updateOption(statement.id, option.id, { endingId: val === 'GLOBAL' ? null : val })}
                                                  >
                                                    <SelectTrigger className="rounded-lg bg-primary/10 border-none shadow-sm h-8 text-[10px] font-bold w-full transition-all text-primary">
                                                      <SelectValue placeholder="Select Ending" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-[20px] border border-secondary/20 shadow-2xl bg-[#FFF2E0]/95 backdrop-blur-md z-[9999] isolate">
                                                      <SelectItem value="GLOBAL">Global Fallback</SelectItem>
                                                      {endings.map((e, idx) => (
                                                        <SelectItem key={e.id} value={e.id}>
                                                          {e.title || `Ending #${idx + 1}`}
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                )}

                                                {validationErrors.filter(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'nextId').map((e, i) => (
                                                  <p key={i} className="text-[9px] text-accent font-bold mt-1">{e.message}</p>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="flex flex-col flex-grow sm:flex-grow-0 sm:min-w-[120px] w-full sm:w-auto">
                                                <Input 
                                                  value={option.wrongMessage}
                                                  onChange={(e) => updateOption(statement.id, option.id, { wrongMessage: e.target.value })}
                                                  className={cn(
                                                    "rounded-lg bg-white border-none shadow-sm h-8 text-[10px] w-full transition-all",
                                                    validationErrors.some(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'wrongMessage') && "ring-2 ring-accent/50"
                                                  )}
                                                  placeholder="Oops message..."
                                                />
                                                {validationErrors.filter(e => e.statementId === statement.id && e.optionId === option.id && e.field === 'wrongMessage').map((e, i) => (
                                                  <p key={i} className="text-[9px] text-accent font-bold mt-1">{e.message}</p>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    
                                    <Button 
                                      variant="outline" 
                                      onClick={() => addOption(statement.id)}
                                      className="w-full py-6 rounded-2xl border-2 border-dashed border-secondary hover:bg-secondary/20 text-muted-foreground font-semibold transition-all duration-200"
                                    >
                                      <PlusIcon className="w-4 h-4 mr-2" /> Add Option
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {statements.length === 0 && (
                    <div className="text-center py-20 scrapbook-card relative overflow-hidden">
                      <div className="absolute top-0 left-0 text-primary/5 -rotate-12">
                        <Heart className="w-32 h-32 fill-current" />
                      </div>
                      <Heart className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
                      <p className="text-text-dark/60 font-bold text-2xl tracking-tight">No statements yet. Add one to start! 🌸</p>
                    </div>
                  )}
                </>
              ) : (
                <FlowView 
                  statements={statements} 
                  validationErrors={validationErrors}
                  onEditNode={(id) => {
                    setBuilderView('LIST');
                    setTimeout(() => {
                      document.getElementById(`statement-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }} 
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center min-h-[60vh] relative"
              style={{ willChange: 'transform, opacity' }}
            >
              <AnimatePresence mode="wait">
                {currentStatementId === 'END' ? (
                  <motion.div
                    key="end"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-md"
                  >
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                      <h1 className="text-5xl md:text-6xl font-heading font-extrabold text-gradient">
                        {currentEndingDisplay?.title || ending.title}
                      </h1>
                      {(currentEndingDisplay?.subtitle || ending.subtitle) && (
                        <p className="text-2xl text-text-dark/80 font-bold">
                          {currentEndingDisplay?.subtitle || ending.subtitle}
                        </p>
                      )}
                      <div className="flex justify-center gap-4 text-primary/40 pt-8">
                        <Heart className="w-8 h-8 fill-current animate-pulse" />
                        <Sparkles className="w-8 h-8 animate-pulse delay-700" />
                        <Heart className="w-8 h-8 fill-current animate-pulse delay-1000" />
                      </div>
                    </div>
                  </motion.div>
                ) : currentStatement ? (
                  <motion.div
                    key={currentStatement.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-lg"
                  >
                    <Card className="scrapbook-card p-0 overflow-hidden text-center space-y-0 shadow-premium relative">
                      <div className="absolute top-4 right-4 text-primary/10">
                        <Heart className="w-16 h-16 fill-current" />
                      </div>
                      <div className="absolute bottom-4 left-4 text-accent/10 rotate-12">
                        <span className="text-4xl">🍓</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-secondary/20 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${((statements.findIndex(s => s.id === currentStatementId) + 1) / statements.length) * 100}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-r-full"
                        />
                      </div>
                      
                      <div className="p-8 md:p-12 space-y-10">
                        <div className="space-y-6">
                          <div className="flex flex-col items-center gap-4">
                            <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary/70">
                              Step {statements.findIndex(s => s.id === currentStatementId) + 1} of {statements.length} 💖
                            </span>
                            <div className="flex justify-center gap-3">
                              <Star className="text-primary fill-primary w-5 h-5" />
                              <Star className="text-primary fill-primary w-5 h-5" />
                              <Star className="text-primary fill-primary w-5 h-5" />
                            </div>
                          </div>
                          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-text-dark leading-tight text-gradient py-4">
                            {currentStatement.text}
                          </h2>
                        </div>

                        <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="flex flex-col gap-3 py-2 w-full">
                            {currentStatement.options.map((option, i) => (
                              <motion.div
                                key={option.id}
                                className="w-full flex"
                                whileHover={selectedId !== option.id ? { scale: 1.01 } : {}}
                                whileTap={selectedId !== option.id ? { scale: 0.98 } : {}}
                              >
                                <Button
                                  onClick={(e) => {
                                    setSelectedId(option.id);
                                    handleOptionSelect(option, e.clientX, e.clientY);
                                  }}
                                  className={cn(
                                    "pill-button w-full min-h-[64px] h-auto flex text-left items-center justify-start overflow-hidden",
                                    i % 2 === 0 
                                      ? "bg-premium-gradient" 
                                      : "bg-white text-text-dark hover:bg-secondary/20 border-2 border-secondary/50",
                                    selectedId === option.id && "ring-4 ring-primary/30 shadow-premium brightness-95"
                                  )}
                                >
                                  <span className="line-clamp-2 w-full text-lg leading-tight font-bold">
                                    {option.text}
                                  </span>
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Controls */}
      <AnimatePresence>
        {mode === 'BUILDER' && (
          <>
            {/* View Toggle (Floating) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="list-flow-toggle fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] left-6 flex bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-premium border border-primary/20 z-[1000]"
            >
              <Button 
                variant={builderView === 'LIST' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setBuilderView('LIST')}
                className={cn(
                  "rounded-full px-6 h-10 text-xs font-bold transition-all", 
                  builderView === 'LIST' ? "bg-premium-gradient" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <LayoutList className="w-4 h-4 mr-2" /> List
              </Button>
              <Button 
                variant={builderView === 'FLOW' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setBuilderView('FLOW')}
                className={cn(
                  "rounded-full px-6 h-10 text-xs font-bold transition-all", 
                  builderView === 'FLOW' ? "bg-premium-gradient" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <GitBranch className="w-4 h-4 mr-2" /> Flow 💫
              </Button>
            </motion.div>

            {/* Add Statement FAB */}
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1, y: -4, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={addStatement}
              className="fab-button fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] right-6 w-16 h-16 bg-premium-gradient flex items-center justify-center z-[1000] rounded-full shadow-premium transition-all"
              title="Add Statement"
            >
              <PlusIcon className="w-8 h-8" />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Wrong Answer Popup */}
      <Dialog open={showWrongPopup} onOpenChange={setShowWrongPopup}>
        <DialogContent className="sm:max-w-[400px] w-[90vw] rounded-[32px] border-none bg-gradient-to-br from-[#FFF5F7] to-[#FFE4E1] p-0 overflow-hidden shadow-2xl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: [0.95, 1.02, 1], opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-10 text-center space-y-6 relative flex flex-col justify-center items-center"
            style={{ willChange: 'transform, opacity' }}
          >
            {/* Background elements */}
            <div className="absolute top-4 left-4 text-primary/40 rotate-12">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <div className="absolute bottom-10 right-4 text-highlight/40 -rotate-12 opacity-30">
              <Sparkles className="w-10 h-10" />
            </div>
            
            <div className="space-y-6 z-10 relative flex-grow flex flex-col justify-center">
              <DialogDescription className="text-xl text-[#5A3E3B] font-bold leading-relaxed px-2 text-center break-words">
                {wrongMessage}
              </DialogDescription>
            </div>

            <DialogFooter className="flex justify-center items-center w-full z-10 mt-4">
              <Button 
                onClick={() => setShowWrongPopup(false)}
                className="pill-button bg-premium-gradient px-12 py-6 text-lg hover:shadow-primary/30 active:scale-95 transition-all group w-full max-w-[200px]"
              >
                Try again <Heart className="ml-2 w-5 h-5 group-hover:scale-125 transition-transform" />
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
      
      {/* Ending Message Dialog */}
      <EndingMessageDialog 
        open={showEndingModal} 
        onOpenChange={setShowEndingModal} 
        ending={ending} 
        setEnding={setEnding}
        endings={endings}
        setEndings={setEndings}
      />


      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[28px] border-none bg-white p-0 overflow-hidden shadow-premium">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-10 text-center space-y-8 relative"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex justify-center">
              <div className="bg-primary/10 p-6 rounded-full">
                <AlertCircle className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-3">
              <DialogTitle className="text-2xl font-heading font-extrabold text-text-dark">Oopsie! 🍓🥺</DialogTitle>
              <DialogDescription className="text-lg text-text-dark/80 font-semibold leading-relaxed">
                {errorMessage}
              </DialogDescription>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button 
                onClick={() => setShowErrorDialog(false)}
                className="pill-button bg-premium-gradient px-16"
              >
                Close ✨
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Delete Statement Confirm Dialog */}
      <Dialog open={!!statementToDelete} onOpenChange={(open) => !open && setStatementToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[28px] border-none bg-white p-0 overflow-hidden shadow-premium">
          <motion.div
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.2, ease: "easeOut" }}
             className="p-10 text-center space-y-8 relative pointer-events-auto"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-6 rounded-full">
                <Trash2 className="w-12 h-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-3">
              <DialogTitle className="text-2xl font-heading font-extrabold text-text-dark">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-lg text-text-dark/80 font-semibold leading-relaxed">
                Are you sure you want to delete this statement?
              </DialogDescription>
            </div>

            <DialogFooter className="sm:justify-center flex w-full gap-3 mt-4">
              <Button 
                variant="outline"
                onClick={(e) => {
                   e.stopPropagation();
                   setStatementToDelete(null);
                }}
                className="rounded-full font-bold w-full uppercase text-xs tracking-wider border-secondary/50"
              >
                Cancel ❌
              </Button>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDeletingRef.current) return;
                  isDeletingRef.current = true;

                  if (statementToDelete) {
                    deleteStatement(statementToDelete);
                  }
                  
                  setStatementToDelete(null);
                  setTimeout(() => {
                    isDeletingRef.current = false;
                  }, 300);
                }}
                className="rounded-full bg-accent/15 hover:bg-accent/25 text-accent font-extrabold w-full uppercase text-xs tracking-widest transition-all active:scale-95 shadow-sm"
              >
                Delete 💔
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Footer Decoration */}
      <footer className="mt-auto py-8 text-muted-foreground text-sm flex flex-col items-center gap-4">
        {mode === 'BUILDER' && (
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-all duration-300",
            saveStatus === 'Saving...' ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
          )}>
            {saveStatus}
          </div>
        )}
        <div className="flex items-center gap-2">
          Made with <Heart className="w-4 h-4 text-primary fill-primary" /> for cuties
        </div>
      </footer>
      </div>
    </div>
  );
}
