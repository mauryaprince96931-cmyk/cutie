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

const AUTH_KEY = 'cute_app_auth';
const DATA_KEY = 'cute_app_data';

// --- Loading Component ---
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
  "Pretty things take time...",
  "What a cutie is waiting..."
];

// --- Main App ---

export default function App() {
  // 1. All hooks at the top level
  const [mode, setMode] = useState<AppMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [builderView, setBuilderView] = useState<BuilderView>('LIST');
  const [isReady, setIsReady] = useState(false);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [endings, setEndings] = useState<Ending[]>([]);
  const [ending, setEnding] = useState<{ title: string; subtitle: string }>({
    title: "You chose love 💖",
    subtitle: "I knew you would… 🥺"
  });
  const [hasError, setHasError] = useState(false);
  const [endingActive, setEndingActive] = useState(false);
  const [currentEndingDisplay, setCurrentEndingDisplay] = useState<{title: string, subtitle: string} | null>(null);
  const [showEndingModal, setShowEndingModal] = useState(false);
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

  // Auth Handlers
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
    setCurrentUser(user);
    setMode('builder');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setMode('login');
    setEndingActive(false);
    setCurrentStatementId(null);
  };

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Core Effects
  useEffect(() => {
    setSoundOn(loadSoundPreference());
    initAudio();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let allData = {};
    try {
      allData = JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
    } catch(e) {}
    
    // @ts-ignore
    const userData = allData[currentUser.id];
    if (userData) {
      setStatements(userData.statements || []);
      setEndings(userData.endings || []);
      if (userData.ending) setEnding(userData.ending);
    } else {
      setStatements(DEFAULT_STATEMENTS);
      setEndings([]);
    }
    
    setCurrentStatementId(null);
    setSelectedId(null);
    setEndingActive(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isReady) return;

    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
      let allData = {};
      try {
        allData = JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
      } catch(e) {}
      
      // @ts-ignore
      allData[currentUser.id] = { statements, ending, endings };
      localStorage.setItem(DATA_KEY, JSON.stringify(allData));
      setSaveStatus('Saved 💾');
    }, 500);
    return () => clearTimeout(timer);
  }, [statements, ending, endings, currentUser, isReady]);

  useEffect(() => {
    setEndingActive(currentStatementId === 'END');
  }, [currentStatementId]);

  useEffect(() => {
    document.body.classList.toggle('ending-active', endingActive);
    document.body.classList.toggle('ending-panel-open', showEndingModal);
  }, [endingActive, showEndingModal]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Caught global error:', event.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    const statementIds = new Set(statements.map(s => s.id));
    statements.forEach(s => {
      if (!s.text.trim()) errors.push({ statementId: s.id, field: 'text', message: 'Question text is required' });
      if (s.options.length < 2) errors.push({ statementId: s.id, field: 'options', message: 'At least 2 options are required' });
      if (!s.options.some(opt => opt.isCorrect)) errors.push({ statementId: s.id, field: 'options', message: 'At least one correct option needed' });
      s.options.forEach(opt => {
        if (!opt.text.trim()) errors.push({ statementId: s.id, optionId: opt.id, field: 'optionText', message: 'Option text required' });
        if (!opt.isCorrect && !opt.wrongMessage.trim()) errors.push({ statementId: s.id, optionId: opt.id, field: 'wrongMessage', message: 'Oops message required' });
        if (opt.isCorrect && opt.nextId && !statementIds.has(opt.nextId)) errors.push({ statementId: s.id, optionId: opt.id, field: 'nextId', message: 'Invalid next statement' });
      });
    });
    return errors;
  }, [statements]);

  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    setSoundEnabled(newState);
    if (newState) {
      initAudio();
      playSound('click');
    }
  };

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
    setCurrentStatementId(statements[0].id);
    setEndingActive(false);
    setMode('viewer');
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
        if (!Array.isArray(json)) throw new Error('Invalid format');
        setStatements(json);
      } catch (err) {
        setErrorMessage('Invalid configuration file.');
        setShowErrorDialog(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const createRipple = (x: number, y: number) => {
    playSound('ripple');
    const layer = document.getElementById('bg-animation-layer');
    if (!layer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${x - 50}px`;
    ripple.style.top = `${y - 50}px`;
    layer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const handleOptionSelect = (option: Option, x?: number, y?: number) => {
    if (endingActive) return;
    if (!option) return;
    
    if (option.isCorrect) {
      if (x !== undefined && y !== undefined) createRipple(x, y);
      if (option.endingId || option.ending || !option.nextId) {
        const endData = (option.endingId ? endings.find(e => e.id === option.endingId) : option.ending) || ending;
        setCurrentEndingDisplay(endData);
        setTimeout(() => {
          setEndingActive(true);
          setCurrentStatementId('END');
        }, 300);
        playSound('ending');
      } else {
        setTimeout(() => setCurrentStatementId(option.nextId!), 300);
        playSound('correct');
      }
    } else {
      setWrongMessage(option.wrongMessage || WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]);
      setShowWrongPopup(true);
      playSound('wrong');
    }
  };

  const currentStatement = statements.find(s => s.id === currentStatementId) || statements[0];

  // Screen Returns
  if (mode === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text-dark relative overflow-hidden">
        <FloatingElements />
        <LoginScreen onLogin={handleUserLogin} onAdminLogin={handleAdminLogin} />
      </div>
    );
  }

  if (mode === 'admin') {
    return (
      <div className="min-h-screen bg-background text-text-dark relative overflow-hidden flex flex-col">
        <FloatingElements />
        <div className="flex justify-between items-center p-6 border-b border-secondary/20 bg-white/50 backdrop-blur-md">
           <h1 className="text-xl font-bold font-heading text-primary">Cute Admin</h1>
           <Button variant="outline" onClick={handleLogout} className="rounded-full">Logout 🚪</Button>
        </div>
        <ScrollArea className="flex-grow">
          <AdminPanel users={users} onCreateUser={handleCreateUser} onEnterBuilder={handleEnterBuilder} onDeleteUser={handleDeleteUser} />
        </ScrollArea>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingMessage />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      <div className="bg-animation-layer fixed inset-0 pointer-events-none" id="bg-animation-layer" />
      <div className="relative z-10 p-4 md:p-8 pb-24 flex flex-col items-center">
        <FloatingElements />
        
        {/* Header Controls */}
        <div className="fixed top-6 left-6 right-6 flex justify-between items-center z-[5000]">
          <div className="flex bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-premium border border-primary/20">
            <Button variant="ghost" size="icon" onClick={toggleSound} className="w-10 h-10 rounded-full text-primary">
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMode(mode === 'builder' ? 'viewer' : 'builder')}
              className="w-10 h-10 rounded-full text-primary"
            >
              {mode === 'builder' ? <Play className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-10 h-10 rounded-full text-primary">
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Logo */}
        <header className="text-center mb-12 space-y-2 mt-20">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-5xl md:text-6xl font-heading font-extrabold tracking-tight text-gradient">
              Cutie
            </h1>
            <Heart className="w-8 h-8 text-primary fill-primary" />
          </div>
        </header>

        <main className="w-full max-w-4xl relative z-10">
          <AnimatePresence mode="wait">
            {mode === 'builder' ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Toolbar */}
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-[32px] shadow-soft sticky top-4 z-10 border border-white/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full border",
                      validationErrors.length > 0 ? "bg-accent/5 border-accent/20 text-accent" : "bg-highlight/5 border-highlight/20 text-highlight"
                    )}>
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {validationErrors.length > 0 ? `${validationErrors.length} Errors 💔` : 'Ready 💖'}
                      </span>
                    </div>

                    <Button 
                      onClick={() => validationErrors.length > 0 ? (setErrorMessage('Fix errors first!'), setShowErrorDialog(true)) : startViewer()} 
                      className="pill-button font-bold text-sm px-6 h-10 bg-premium-gradient"
                    >
                      Finish & Run ▶
                    </Button>
                  </div>
                  <div className="h-px bg-secondary/20 w-full" />
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" onClick={exportConfig} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Download className="w-4 h-4 mr-2" /> Export</Button>
                    <div className="relative">
                      <input type="file" accept=".json" onChange={importConfig} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Button variant="ghost" className="rounded-full text-xs font-bold text-muted-foreground h-9"><Upload className="w-4 h-4 mr-2" /> Import</Button>
                    </div>
                    <Button variant="ghost" onClick={() => setShowEndingModal(true)} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Heart className="w-4 h-4 mr-2" /> Endings</Button>
                  </div>
                </div>

                {builderView === 'LIST' ? (
                  <div className="space-y-6 pb-20">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={statements.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {statements.map((statement, index) => (
                          <SortableItem key={statement.id} id={statement.id}>
                            <Card className="scrapbook-card relative overflow-hidden" id={`statement-${statement.id}`}>
                              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                  <span className="bg-primary/20 text-accent px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">#{index + 1}</span>
                                  <CardTitle className="text-2xl font-heading font-extrabold text-text-dark">Statement</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setStatementToDelete(statement.id)} className="text-muted-foreground hover:text-accent rounded-full"><Trash2 className="w-5 h-5" /></Button>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <Textarea 
                                  value={statement.text}
                                  onChange={(e) => updateStatement(statement.id, { text: e.target.value })}
                                  className="stitched-input min-h-[100px] text-lg font-bold"
                                  placeholder="Question text..."
                                />
                                <div className="space-y-4">
                                  {statement.options.map((opt, optIdx) => (
                                    <div key={opt.id} className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 space-y-3">
                                      <div className="flex items-center gap-3">
                                        <Input 
                                          value={opt.text} 
                                          onChange={(e) => updateOption(statement.id, opt.id, { text: e.target.value })}
                                          className="flex-grow font-semibold"
                                          placeholder="Option text..."
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => deleteOption(statement.id, opt.id)} disabled={statement.options.length <= 2} className="text-accent hover:bg-accent/10"><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                          <Switch checked={opt.isCorrect} onCheckedChange={(v) => updateOption(statement.id, opt.id, { isCorrect: v })} />
                                          <span>{opt.isCorrect ? 'Correct ✨' : 'Wrong 🧸'}</span>
                                        </div>
                                        {opt.isCorrect ? (
                                          <Select value={opt.nextId || 'END'} onValueChange={(v) => updateOption(statement.id, opt.id, { nextId: v === 'END' ? null : v })}>
                                            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="END">Ending 🏁</SelectItem>
                                              {statements.filter(s => s.id !== statement.id).map((s, i) => (
                                                <SelectItem key={s.id} value={s.id}>Next #{i+1}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input 
                                            value={opt.wrongMessage}
                                            onChange={(e) => updateOption(statement.id, opt.id, { wrongMessage: e.target.value })}
                                            className="h-8 flex-grow"
                                            placeholder="Oops message..."
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <Button variant="outline" onClick={() => addOption(statement.id)} className="w-full border-dashed border-2"><PlusIcon className="w-4 h-4 mr-2" /> Add Option</Button>
                                </div>
                              </CardContent>
                            </Card>
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : (
                  <FlowView 
                    statements={statements} 
                    validationErrors={validationErrors}
                    onEditNode={(id) => {
                      setBuilderView('LIST');
                      setTimeout(() => document.getElementById(`statement-${id}`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }} 
                  />
                )}
              </motion.div>
            ) : (
              <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <AnimatePresence mode="wait">
                  {currentStatementId === 'END' ? (
                    <motion.div key="end" className="text-center space-y-6">
                      <h1 className="text-6xl font-heading font-extrabold text-gradient">{currentEndingDisplay?.title || ending.title}</h1>
                      <p className="text-2xl font-bold opacity-80">{currentEndingDisplay?.subtitle || ending.subtitle}</p>
                      <Button onClick={() => setMode('builder')} className="pill-button bg-premium-gradient px-12">Edit 💖</Button>
                    </motion.div>
                  ) : currentStatement ? (
                    <motion.div key={currentStatement.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-lg">
                      <Card className="scrapbook-card p-8 md:p-12 space-y-10 shadow-premium">
                        <h2 className="text-3xl font-heading font-extrabold text-gradient">{currentStatement.text}</h2>
                        <div className="flex flex-col gap-4">
                          {currentStatement.options.map((opt) => (
                            <Button key={opt.id} onClick={(e) => handleOptionSelect(opt, e.clientX, e.clientY)} className="pill-button min-h-[60px] text-lg bg-premium-gradient">
                              {opt.text}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating UI Elements */}
      <AnimatePresence>
        {mode === 'builder' && (
          <>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] left-6 flex bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-premium border border-primary/20 z-[5000]">
              <Button variant={builderView === 'LIST' ? 'secondary' : 'ghost'} onClick={() => setBuilderView('LIST')} className={cn("rounded-full px-6", builderView === 'LIST' && "bg-premium-gradient text-white")}>List</Button>
              <Button variant={builderView === 'FLOW' ? 'secondary' : 'ghost'} onClick={() => setBuilderView('FLOW')} className={cn("rounded-full px-6", builderView === 'FLOW' && "bg-premium-gradient text-white")}>Flow</Button>
            </motion.div>
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={addStatement} className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] right-6 w-16 h-16 bg-premium-gradient rounded-full shadow-premium flex items-center justify-center z-[5000] text-white">
              <PlusIcon className="w-8 h-8" />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Dialog open={showWrongPopup} onOpenChange={setShowWrongPopup}>
        <DialogContent className="sm:max-w-[400px] rounded-[32px] border-none bg-background p-10 text-center">
          <p className="text-xl font-bold text-text-dark mb-6">{wrongMessage}</p>
          <Button onClick={() => setShowWrongPopup(false)} className="pill-button bg-premium-gradient w-full">Try again 💖</Button>
        </DialogContent>
      </Dialog>
      
      <EndingMessageDialog open={showEndingModal} onOpenChange={setShowEndingModal} ending={ending} setEnding={setEnding} endings={endings} setEndings={setEndings} />

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[28px] p-10 text-center">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <DialogTitle className="text-2xl font-bold mb-2">Oopsie!</DialogTitle>
          <p className="text-lg opacity-80 mb-6">{errorMessage}</p>
          <Button onClick={() => setShowErrorDialog(false)} className="pill-button bg-premium-gradient w-full">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statementToDelete} onOpenChange={(v) => !v && setStatementToDelete(null)}>
        <DialogContent className="p-10 text-center rounded-[28px]">
          <Trash2 className="w-12 h-12 text-accent mx-auto mb-4" />
          <DialogTitle className="text-2xl font-bold mb-6">Delete this statement?</DialogTitle>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStatementToDelete(null)} className="flex-1 rounded-full">Cancel</Button>
            <Button onClick={() => { deleteStatement(statementToDelete!); setStatementToDelete(null); }} className="flex-1 rounded-full bg-accent text-white">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="fixed bottom-4 left-0 right-0 pointer-events-none flex justify-center opacity-40 text-[10px] font-bold uppercase tracking-widest z-0">
        Made with 💖 for cuties
      </footer>
      </div>
  );
}
