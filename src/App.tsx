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
  Home,
  Users,
  Download, 
  Upload,
  GripVertical,
  AlertCircle,
  X as XIcon,
  Plus as PlusIcon,
  Edit2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
import { EntryMessageDialog } from './components/EntryMessageDialog';
import { LoginScreen, AdminPanel } from './components/Auth';
import { Button } from '@/components/ui/button';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { fetchUserData, createUserData, deleteUserData, saveUserDataDebounced, fetchAllUsers } from '@/lib/db';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';
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
import { useAppContext, AppMode } from './store/AppContext';
import { BuilderTopPanel } from './components/Builder/BuilderTopPanel';
import { getErrors } from '@/lib/validation';
import { ValidationError, User, Statement, Ending, Option, EntryMessage } from './types';

// --- Components ---

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
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
const WRONG_MESSAGES = [
  "Hehe wrong choice 😝💞",
  "Not this one silly! 💕",
  "Almost there… try again 🌸",
  "Naughty choice 😤💖 try again!",
  "Oops! My heart says no 😳💓",
  "Try again baby 💕 you got this!"
];

const LOADING_MESSAGES = [
  "Wait a bit, Miss Cutie 💖",
  "Picking flowers just for you 🌸",
  "Be patient, my lady 🥺",
  "Pretty things take time ✨",
  "A cutie is waiting… how sweet 💕"
];

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
    id: 'default-stmt-001',
    text: 'Do you love me? 💖',
    options: [
      {
        id: 'default-opt-001',
        text: 'Yes, forever! ✨',
        nextId: null,
        isCorrect: true,
        wrongMessage: ''
      },
      {
        id: 'default-opt-002',
        text: 'Maybe... 🙄',
        nextId: null,
        isCorrect: false,
        wrongMessage: 'Wrong answer! Try again, I know you do! 😤❤️'
      }
    ]
  }
];

type BuilderView = 'LIST' | 'FLOW';

interface NodePosition {
  x: number;
  y: number;
}

interface FlowViewProps {
  statements: Statement[] | null;
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
    setPositions(prev => {
      const newPositions = { ...prev };
      let changed = false;
      (statements ?? []).forEach((s, i) => {
        if (!newPositions[s.id]) {
          newPositions[s.id] = { 
            x: 150 + (i % 3) * 350, 
            y: 150 + Math.floor(i / 3) * 280 
          };
          changed = true;
        }
      });
      return changed ? newPositions : prev;
    });
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.05 : 0.95;
      
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * factor, 0.6), 2.0);
        const scaleRatio = newScale / prev.scale;
        return {
          scale: newScale,
          x: localX - (localX - prev.x) * scaleRatio,
          y: localY - (localY - prev.y) * scaleRatio
        };
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[75vh] bg-secondary/5 rounded-[2rem] border-2 border-dashed border-secondary/20 overflow-hidden group touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
              {(statements ?? []).map(s => s.options.map(opt => {
                if (!opt.nextId) return null;
                const from = positions[s.id];
                const to = positions[opt.nextId];
                if (!from || !to) return null;

                const NODE_WIDTH = 220;
                
                const x1 = from.x + NODE_WIDTH;
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
            {(statements ?? []).map((s, i) => {
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

import { ThemeBackground } from './components/ThemeBackground';

const FloatingElements = () => {
  const elements = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: Math.random() * 0.5 + 0.5,
      duration: Math.random() * 20 + 25,
      delay: Math.random() * -30
    })), []);

  return (
    <>
      <ThemeBackground />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: el.x + '%', 
            y: el.y + '%',
            opacity: 0,
            scale: el.scale
          }}
          animate={{ 
            y: ['-10%', '110%'],
            rotate: [0, 360],
            opacity: [0, 0.15, 0]
          }}
          transition={{ 
            duration: el.duration, 
            repeat: Infinity, 
            ease: "linear",
            delay: el.delay
          }}
          className="absolute text-primary/30 text-3xl"
        >
          {['💖', '✨', '🌸', '🍓'][i % 4]}
        </motion.div>
      ))}
    </div>
    </>
  );
};

// --- Main App ---

export default function App() {
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const [users, setUsers] = useState<User[]>([]);
  const { mode, setMode, currentUser, setCurrentUser, isAdmin, setIsAdmin, currentStatementId, setCurrentStatementId, endingActive, setEndingActive, statements, setStatements, endings, setEndings, ending, setEnding, entryMessage, setEntryMessage, isLoading, setIsLoading, dataLoaded, setDataLoaded } = useAppContext();
  const [builderView, setBuilderView] = useState<BuilderView>('LIST');
  const [hasError, setHasError] = useState(false);
  const [currentEndingDisplay, setCurrentEndingDisplay] = useState<{title: string, subtitle: string} | null>(null);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWrongPopup, setShowWrongPopup] = useState(false);
  const [wrongMessage, setWrongMessage] = useState('');
  const [showEntryScreen, setShowEntryScreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [soundOn, setSoundOn] = useState(() => loadSoundPreference());
  const [loadingText, setLoadingText] = useState("");
  const [isExitingLoading, setIsExitingLoading] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<string | null>(null);
  const [transformedOptions, setTransformedOptions] = useState<Record<string, Option>>({});
  const [camoStages, setCamoStages] = useState<Record<string, number>>({});
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchTargetId, setGlitchTargetId] = useState<string | null>(null);
  const [sparkles, setSparkles] = useState<{id: number, x: number, y: number}[]>([]);
  
  // UI State
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

  // No Mode Runtime State
  const [noModeClicks, setNoModeClicks] = useState<Record<string, number>>({});
  const [noModePositions, setNoModePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [noModeBlasts, setNoModeBlasts] = useState<Record<string, boolean>>({});
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // No Mode handlers
  const handleNoModeMove = (optionId: string) => {
    if (!viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const newX = (Math.random() - 0.5) * rect.width * 0.6;
    const newY = (Math.random() - 0.5) * 60;
    setNoModePositions(prev => ({ 
      ...prev, 
      [optionId]: { x: newX, y: newY } 
    }));
  };

  const isDeletingRef = useRef(false);
  const hasUserEdited = useRef(false);

  // Persistence Sync
  useEffect(() => {
    if (!currentUser || mode !== 'builder') return;
    if (!hasUserEdited.current) return;

    const payload = {
      statements,
      endings,
      entryMessage,
      fallbackEnding: ending
    };

    console.log("Saving payload:", payload);

    saveUserDataDebounced(currentUser.id, payload);

  }, [statements, endings, entryMessage, ending, currentUser, mode]);

  // Auth state listener
  useEffect(() => {
    
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsAdmin(true);
        const userData = await fetchUserData(firebaseUser.uid);
        if (userData && mode === 'login') {
          setCurrentUser(userData);
          setMode('admin');
        }
      } else if (mode !== 'login' && isAdmin) {
        setIsAdmin(false);
        setCurrentUser(null);
        setMode('login');
      }
    });
    return () => unsub();
  }, []);

  // Fetch Users for Admin Panel
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers().then(setUsers).catch(console.error);
    }
  }, [isAdmin]);

  // Load Logic
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.id);

    const unsub = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();

      console.log("Loaded:", data);

      setStatements(data.data?.statements ?? []);
      setEndings(data.data?.endings ?? []);
      setEntryMessage(data.data?.entryMessage ?? {
        title: "",
        subtitle: ""
      });
      setEnding(data.data?.fallbackEnding ?? {
        title: "You chose love 💖",
        subtitle: "I knew you would… 🥺"
      });

      hasUserEdited.current = false;
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    hasUserEdited.current = false;
  }, [currentUser]);

  useEffect(() => {
    setTransformedOptions({});
    setCamoStages({});
    setIsGlitching(false);
    setGlitchTargetId(null);
  }, [currentStatementId]);

  // Auth Handlers
  const handleCreateUser = async (name: string, pass: string) => {
    const newUser: Omit<User, 'id'> = {
      name,
      email: '',
      passcode: pass,
      role: 'user',
      data: {
        statements: DEFAULT_STATEMENTS,
        endings: [],
        fallbackEnding: { title: "You chose love 💖", subtitle: "I knew you would… 🥺" },
        entryMessage: { title: "Hey cutie 💖", subtitle: "I made something for you… 🥺" }
      }
    };
    
    // Create with a random ID since these aren't Firebase Auth users
    const uid = crypto.randomUUID();
    const created = await createUserData(uid, newUser);
    setUsers([...users, created]);
  };

  const deleteUser = async (id: string) => {
    await deleteUserData(id);
    setUsers(users.filter(u => u.id !== id));
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
  };

  const loadUserIntoContext = (user: User) => {
    hasUserEdited.current = false;
    setCurrentUser(user);
    setStatements(user.data?.statements ?? DEFAULT_STATEMENTS);
    setEndings(user.data?.endings ?? []);
    setEnding(user.data?.fallbackEnding ?? { title: "You chose love 💖", subtitle: "I knew you would… 🥺" });
    setEntryMessage(
      user.data?.entryMessage ?? {
        title: "Hey cutie 💖",
        subtitle: "I made something for you… 🥺"
      }
    );
  };

  const handleUserLogin = (user: User) => {
    loadUserIntoContext(user);
    setDataLoaded(true);
    setMode('loading');
  };

  const handleEnterBuilder = (user: User) => {
    loadUserIntoContext(user);
    setDataLoaded(true);
    setMode('builder');
  };

  const handleLogout = () => {
    if (isAdmin) {
      if (mode === 'admin') {
        auth.signOut().catch(console.error);
        setIsAdmin(false);
        setCurrentUser(null);
        setMode('login');
      } else {
        // Just go back to user list
        setMode('admin');
        setCurrentUser(null);
      }
    } else {
      // Regular user logs out
      setCurrentUser(null);
      setStatements(null);
      setEndings(null);
      setEntryMessage(null);
      setDataLoaded(false);
      setMode('login');
    }
  };

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Loading Logic ---
  useEffect(() => {
    if (mode === 'loading') {
      setIsExitingLoading(false);
      const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      setLoadingText(LOADING_MESSAGES[randomIndex]);
      playSound('swish');

      const baseDelay = 600 + Math.random() * 400; // 600–1000ms
      const delay = Math.max(500, baseDelay); // Min 500ms for quick feel

      const fadeTimer = setTimeout(() => setIsExitingLoading(true), delay - 250);
      const timer = setTimeout(() => {
        // Reset states before viewer
        setEndingActive(false);
        setShowWrongPopup(false);
        setCurrentEndingDisplay(null);
        setCurrentStatementId(null);
        setShowEntryScreen(true);
        setMode('viewer');
        setDataLoaded(true);
        setIsLoading(false);
      }, delay);

      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [mode]);

  // Core Effects
  useEffect(() => {
    // Global Mode Security Guard
    if (mode === 'builder' && !isAdmin) {
      console.warn("Unauthorized access to builder mode blocked.");
      setMode('login');
    }
  }, [mode, isAdmin]);

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


  const [highlightedErrorId, setHighlightedErrorId] = useState<string | null>(null);

  const validationErrors = useMemo(() => getErrors(statements ?? []), [statements]);

  useEffect(() => {
    if (highlightedErrorId) {
       const timer = setTimeout(() => setHighlightedErrorId(null), 3000);
       return () => clearTimeout(timer);
    }
  }, [highlightedErrorId]);

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
    hasUserEdited.current = true;
    const newId = crypto.randomUUID();
    const newStatement: Statement = {
      id: newId,
      text: 'New Question? 🌸',
      options: [
        {
          id: crypto.randomUUID(),
          text: 'Option A',
          nextId: null,
          endingId: null,
          isCorrect: true,
          wrongMessage: ''
        },
        {
          id: crypto.randomUUID(),
          text: 'Option B',
          nextId: null,
          endingId: null,
          isCorrect: false,
          wrongMessage: 'Oops! Try again 🧸'
        }
      ]
    };
    const updated = [...(statements ?? []), newStatement];
    setStatements(updated);
  };

  const deleteStatement = (id: string) => {
    hasUserEdited.current = true;
    const updated = (statements ?? []).filter(s => s.id !== id);
    setStatements(updated);
  };

  const updateStatement = (id: string, updates: Partial<Statement>) => {
    hasUserEdited.current = true;
    const updated = (statements ?? []).map(s => s.id === id ? { ...s, ...updates } : s);
    setStatements(updated);
  };

  const updateOption = (statementId: string, optionId: string, updates: Partial<Option>) => {
    hasUserEdited.current = true;
    const updated = (statements ?? []).map(s => {
      if (s.id === statementId) {
        return {
          ...s,
          options: s.options.map(opt => opt.id === optionId ? { ...opt, ...updates } : opt)
        };
      }
      return s;
    });
    setStatements(updated);
  };

  const addOption = (statementId: string) => {
    hasUserEdited.current = true;
    const updated = (statements ?? []).map(s => {
      if (s.id === statementId) {
        const newOption: Option = {
          id: crypto.randomUUID(),
          text: `Option ${String.fromCharCode(65 + s.options.length)}`,
          nextId: null,
          endingId: null,
          isCorrect: false,
          wrongMessage: 'Oops! Try again 🧸'
        };
        return {
          ...s,
          options: [...s.options, newOption]
        };
      }
      return s;
    });
    setStatements(updated);
  };

  const deleteOption = (statementId: string, optionId: string) => {
    hasUserEdited.current = true;
    const updated = (statements ?? []).map(s => {
      if (s.id === statementId) {
        if (s.options.length <= 2) return s;
        return {
          ...s,
          options: s.options.filter(opt => opt.id !== optionId)
        };
      }
      return s;
    });
    setStatements(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      hasUserEdited.current = true;
      setStatements((items) => {
        const oldIndex = (items ?? []).findIndex((i) => i.id === active.id);
        const newIndex = (items ?? []).findIndex((i) => i.id === over.id);
        const updated = arrayMove(items ?? [], oldIndex, newIndex);
        return updated;
      });
    }
  };

  const startViewer = () => {
    if (!statements?.[0]) return;
    setCurrentStatementId(statements[0].id);
    setTransformedOptions({});
    setCamoStages({});
    setEndingActive(false);
    setMode('test');
    setShowEntryScreen(true);
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

  const isValidStatement = (s: any): s is Statement =>
    typeof s?.id === 'string' &&
    typeof s?.text === 'string' &&
    Array.isArray(s?.options) &&
    s.options.every((o: any) =>
      typeof o?.id === 'string' &&
      typeof o?.text === 'string' &&
      typeof o?.isCorrect === 'boolean'
    );

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json) || !json.every(isValidStatement)) {
          throw new Error('Invalid format');
        }
        hasUserEdited.current = true;
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
    const id = Date.now();
    setSparkles(prev => [...prev, { id, x, y }]);
    setTimeout(() => setSparkles(prev => prev.filter(s => s.id !== id)), 600);
  };

  function handleOptionSelect(option: Option, e: React.MouseEvent) {
    // Current stage of reveal (starts at 0)
    const stage = camoStages[option.id] || 0;

    // Helper to get option at specific stage and maximum possible stage
    const getOptionAtStageAndDepth = (opt: any, currentStage: number): { option: any, depth: number } => {
      let depth = 0;
      let currentOpt = opt;
      while (currentOpt.camoOption && depth < currentStage) {
        currentOpt = currentOpt.camoOption;
        depth++;
      }
      return { option: currentOpt, depth };
    };

    const { option: activeOption, depth: actualStage } = getOptionAtStageAndDepth(option, stage);
    
    // IF in Camo Mode and can reveal further
    // Ensure we actually have a camoOption to reveal
    if (option.camoEnabled && activeOption.camoOption) {
      playSound('click');
      setGlitchTargetId(option.id);
      setIsGlitching(true);
      
      // Phase 1: Start Glitch
      // Phase 2: Swap text mid-glitch for smooth transition
      setTimeout(() => {
        playSound('camo');
        // Only increment if we haven't reached the end (activeOption.camoOption existence check)
        setCamoStages(prev => ({ ...prev, [option.id]: (prev[option.id] || 0) + 1 }));
      }, 70);

      // Phase 3: End Glitch
      setTimeout(() => {
        setIsGlitching(false);
        setGlitchTargetId(null);
      }, 200);
      return;
    }
    
    // If not in camo mode, or reached end of camo chain, activeOption should be used for further logic
    // Let's redefine activeOption correctly if it wasn't done above
    const finalActiveOption = option.camoEnabled ? activeOption : option;
    
    // NO MODE logic for wrong answers
    if (!finalActiveOption.isCorrect && finalActiveOption.noModeEnabled) {
      const currentClicks = (noModeClicks[option.id] || 0) + 1;
      
      if (currentClicks >= 5) {
        setNoModeBlasts(prev => ({ ...prev, [option.id]: true }));
        
        setTimeout(() => {
          setNoModeClicks(prev => ({ ...prev, [option.id]: 0 }));
          setNoModePositions(prev => ({ ...prev, [option.id]: { x: 0, y: 0 } }));
          setNoModeBlasts(prev => ({ ...prev, [option.id]: false }));
        }, 1000);
        return;
      }

      setNoModeClicks(prev => ({ ...prev, [option.id]: currentClicks }));
      handleNoModeMove(option.id);
      return;
    }

    if (!finalActiveOption.isCorrect && (!finalActiveOption.camoOption || (camoStages[option.id] || 0) > 0)) {
      playSound('wrong');
      
      // Determine the best message:
      // 1. If camo is enabled, revealed, and has a wrongMessage, use it
      // 2. Fallback to main option's wrong message if set
      // 3. Default message
      const message = 
        (activeOption as any).wrongMessage !== undefined && (activeOption as any).wrongMessage !== "" ? (activeOption as any).wrongMessage :
        (option.wrongMessage !== undefined && option.wrongMessage !== "" ? option.wrongMessage : 'Oops! Try again 🧸');
        
      setWrongMessage(message);
      setShowWrongPopup(true);
      return;
    }

    createRipple(e.clientX, e.clientY);
    playSound('click');

    if (activeOption.endingId) {
      const foundEnding = (endings ?? []).find(e => e.id === activeOption.endingId);

      if (!foundEnding) {
        console.error("Ending missing:", activeOption.endingId);
        return;
      }

      setCurrentEndingDisplay(foundEnding);
      setEndingActive(true);
      setCurrentStatementId('END');
      return;
    }

    if (activeOption.nextId) {
      if (activeOption.nextId === 'END') {
        setCurrentEndingDisplay(ending);
        setEndingActive(true);
        setCurrentStatementId('END');
      } else {
        setCurrentStatementId(activeOption.nextId);
      }
      return;
    }

    setCurrentEndingDisplay(ending);
    setEndingActive(true);
    setCurrentStatementId('END');
  }

  const currentStatement = (statements ?? []).find(s => s.id === currentStatementId) ?? (statements ?? [])[0];

  // Screen Returns

  if (mode === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text-dark relative overflow-hidden">
        <FloatingElements />
        <LoginScreen onUserLogin={handleUserLogin} />
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

  if (mode === 'loading' || !dataLoaded) {
    return (
      <div 
        className={cn(
          "min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ease-in-out",
          (isExitingLoading && dataLoaded) ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      >
        {/* Reuse app background layers */}
        <div className="fixed inset-0 bg-background z-[-1]" />
        <div 
          className="fixed inset-0 z-[-1]" 
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(90, 62, 59, 0.03) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        />
        
        {/* Minimal Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: (i * 25 + 10) + '%', 
                y: '110%',
                opacity: 0,
                scale: 0.8,
              }}
              animate={{ 
                y: '-10%',
                opacity: [0, 0.5, 0],
                x: (i * 25 + 10) + (Math.sin(i) * 5) + '%' 
              }}
              transition={{ 
                duration: 6 + Math.random() * 4, 
                repeat: Infinity, 
                ease: "linear",
                delay: i * 2
              }}
              className="absolute text-2xl select-none"
            >
              {['💖', '✨', '🌸', '✨'][i % 4]}
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95 }}
          className="scrapbook-card max-w-[90%] w-[320px] flex flex-col items-center gap-8 relative z-10"
        >
          {/* Theme-consistent Bouncing Loader */}
          <div className="relative">
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1],
                y: [0, -6, 0]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="w-20 h-20 rounded-2xl bg-primary shadow-soft flex items-center justify-center relative z-20 border-2 border-dashed border-white/40"
            >
              <Heart className="w-10 h-10 text-white fill-white animate-pulse" />
            </motion.div>
            
            <motion.div 
              animate={{ 
                scale: [1, 1.5],
                opacity: [0.4, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeOut" 
              }}
              className="absolute inset-0 rounded-2xl bg-primary/30 z-10"
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 text-center"
          >
            <p className="text-xl font-heading font-extrabold text-text-dark leading-tight">
              {loadingText}
            </p>
            
            {/* Minimal Dot Indicator */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 1, 0.3] 
                  }}
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-primary/60"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
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
            
            {/* Play/Settings Toggle - Hidden in viewer, shown in test/builder for admin */}
            {(mode === 'builder' || mode === 'test') && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (mode === 'builder') setMode('test');
                  else if (isAdmin) setMode('builder');
                }}
                className={cn(
                  "w-10 h-10 rounded-full text-primary",
                  (mode === 'test' && !isAdmin) && "hidden"
                )}
              >
                {mode === 'builder' ? <Play className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-10 h-10 rounded-full text-primary">
              {isAdmin ? <Users className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </Button>

            {mode === 'viewer' && (
              <></>
            )}
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
            {(mode === 'builder') ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Toolbar */}
                {builderView === 'LIST' && (
                  <div className="bg-white/95 backdrop-blur-xl p-4 md:p-6 rounded-[24px] shadow-sm sticky top-6 z-10 border border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors",
                          validationErrors.length > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", validationErrors.length > 0 ? "bg-destructive" : "bg-emerald-500")} />
                          {validationErrors.length > 0 ? `${validationErrors.length} Errors` : 'Ready to share'}
                        </div>

                        {/* Save Status */}
                        <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground/60 flex items-center gap-1.5">
                          {saveStatus === 'SAVING' ? (
                            <><RotateCcw className="w-3 h-3 animate-spin" /> Saving</>
                          ) : (
                            <><Check className="w-3 h-3" /> Saved</>
                          )}
                        </div>
                      </div>
                      
                      {(() => {
                        const realErrors = validationErrors.filter(e => e.type !== 'warning');
                        return (
                          <Button 
                            onClick={() => {
                                if (realErrors.length > 0) {
                                    setShowErrorDialog(true);
                                    setErrorMessage(`${realErrors.length} errors found.`);
                                } else {
                                    startViewer();
                                }
                            }} 
                            className={cn(
                              "primary-btn h-10 px-6",
                              realErrors.length > 0 ? "bg-destructive hover:bg-destructive/90" : "bg-primary"
                            )}
                          >
                              {realErrors.length > 0 ? `Fix ${realErrors.length} Errors` : 'Run Quiz'}
                          </Button>
                        );
                      })()}
                    </div>
                    <div className="border-t border-black/[0.03] pt-4">
                      <BuilderTopPanel 
                        onExport={exportConfig}
                        onImport={importConfig}
                        onOpenIntro={() => setShowEntryDialog(true)}
                        onOpenEndings={() => setShowEndingModal(true)}
                        saveStatus={saveStatus}
                        validationErrors={validationErrors}
                      />
                    </div>
                  </div>
                )}

                {builderView === 'LIST' ? (
                  <div className="space-y-12 pb-32">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={(statements ?? []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {(statements ?? []).map((statement, index) => (
                          <SortableItem key={statement.id} id={statement.id}>
                            <Card className="bg-white border-0 shadow-sm rounded-[24px] overflow-hidden" id={`statement-${statement.id}`}>
                              <CardHeader className="p-6 md:p-8 flex flex-row items-center justify-between space-y-0 bg-secondary/5">
                                <div className="flex items-center gap-4">
                                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">#{index + 1}</span>
                                  <CardTitle className="text-lg font-semibold text-text-dark uppercase tracking-tight">Statement</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setStatementToDelete(statement.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-5 h-5" /></Button>
                              </CardHeader>
                              <CardContent className="p-6 md:p-8 space-y-8">
                                <div className="space-y-4">
                                  <Label className="text-sm font-medium text-muted-foreground">Question Text</Label>
                                  <Textarea 
                                    value={statement.text}
                                    onChange={(e) => updateStatement(statement.id, { text: e.target.value })}
                                    className="bg-bg-soft/30 border-0 focus-visible:ring-primary/20 min-h-[100px] text-lg font-semibold rounded-[16px] p-4"
                                    placeholder="What do you want to ask?"
                                  />
                                </div>
                                
                                <div className="space-y-6">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Answer Options</Label>
                                  <div className="border border-black/5 rounded-2xl overflow-hidden bg-white/40">
                                    {(statement.options ?? []).map((opt, optIdx) => {
                                      const isExpanded = !!expandedOptions[opt.id];
                                      return (
                                        <div key={opt.id} className="group border-b border-black/5 last:border-0 p-4 transition-colors hover:bg-black/[0.02]">
                                          <div className="flex items-center gap-3">
                                            <Input 
                                              value={opt.text} 
                                              onChange={(e) => updateOption(statement.id, opt.id, { text: e.target.value })}
                                              className="flex-grow font-medium text-base h-12 bg-white/50 border-0 focus-visible:ring-primary/10 rounded-[12px]"
                                              placeholder="Type an option..."
                                            />
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              onClick={() => deleteOption(statement.id, opt.id)} 
                                              disabled={statement.options.length <= 1} 
                                              className="w-10 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>

                                          {/* MIDDLE: Horizontal Toggles */}
                                          <div className="flex flex-wrap items-center justify-between gap-4 py-1">
                                            <div className="flex flex-wrap items-center gap-6">
                                              <div className="flex items-center gap-2">
                                                <Switch 
                                                  checked={opt.isCorrect} 
                                                  onCheckedChange={(v) => updateOption(statement.id, opt.id, { isCorrect: v, noModeEnabled: v ? false : opt.noModeEnabled })} 
                                                  className="data-[state=checked]:bg-primary"
                                                />
                                                <span className="text-sm font-semibold text-text-dark">Correct</span>
                                              </div>
                                              
                                              {!opt.isCorrect && (
                                                <div className="flex items-center gap-2">
                                                  <Switch 
                                                    checked={!!opt.noModeEnabled} 
                                                    onCheckedChange={(v) => updateOption(statement.id, opt.id, { noModeEnabled: v })} 
                                                  />
                                                  <span className="text-sm font-semibold text-text-dark">No Mode</span>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center gap-2">
                                                <Switch 
                                                  checked={!!opt.camoEnabled} 
                                                  onCheckedChange={(v) => updateOption(statement.id, opt.id, { camoEnabled: v, camoOption: v ? { text: 'Transformed Text', isCorrect: true, nextId: null, endingId: null } : undefined })} 
                                                />
                                                <span className="text-sm font-semibold text-text-dark">Camo</span>
                                              </div>
                                            </div>

                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => setExpandedOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                                              className="text-[11px] font-bold uppercase tracking-wider gap-1.5 rounded-lg px-3 h-8 bg-black/5 text-muted-foreground hover:bg-black/10"
                                            >
                                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                              Logic
                                            </Button>
                                          </div>

                                          {/* BOTTOM: Collapsible Advanced Settings */}
                                          <AnimatePresence>
                                            {isExpanded && (
                                              <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden pt-2"
                                              >
                                                <div className="bg-black/[0.02] rounded-xl p-4 space-y-4">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action Flow</Label>
                                                      {opt.isCorrect ? (
                                                        <div className="space-y-2">
                                                          <Select 
                                                            value={opt.nextId || 'END'} 
                                                            onValueChange={(v) => {
                                                              const nextId = v === 'END' ? null : v;
                                                              updateOption(statement.id, opt.id, { 
                                                                nextId,
                                                                endingId: nextId ? null : opt.endingId
                                                              });
                                                            }}
                                                          >
                                                            <SelectTrigger className="h-9 bg-white text-xs border-0 shadow-sm"><SelectValue placeholder="Next Step" /></SelectTrigger>
                                                            <SelectContent className="z-[9999]">
                                                              <SelectItem value="END">🏁 Ending</SelectItem>
                                                              {(statements ?? []).filter(s => s.id !== statement.id).map((s, i) => (
                                                                <SelectItem key={s.id} value={s.id}>
                                                                  Next #{(statements ?? []).indexOf(s) + 1}
                                                                </SelectItem>
                                                              ))}
                                                            </SelectContent>
                                                          </Select>
                      
                                                          {!opt.nextId && (endings ?? []).length > 0 && (
                                                            <Select 
                                                              value={opt.endingId || 'GLOBAL'} 
                                                              onValueChange={(v) => updateOption(statement.id, opt.id, { endingId: v === 'GLOBAL' ? null : v })}
                                                            >
                                                              <SelectTrigger className="h-9 bg-white border-0 shadow-sm text-xs">
                                                                <SelectValue placeholder="Select Ending" />
                                                              </SelectTrigger>
                                                              <SelectContent className="z-[9999]">
                                                                <SelectItem value="GLOBAL">Default Ending</SelectItem>
                                                                {(endings ?? []).map((e) => (
                                                                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                                                                ))}
                                                              </SelectContent>
                                                            </Select>
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <Input 
                                                          value={opt.wrongMessage ?? ''}
                                                          onChange={(e) => updateOption(statement.id, opt.id, { wrongMessage: e.target.value })}
                                                          className="h-9 text-xs bg-white border-0 shadow-sm"
                                                          placeholder="Wrong answer message..."
                                                        />
                                                      )}
                                                    </div>

                                                    {opt.camoEnabled && opt.camoOption && (
                                                      <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Camo Sub-Option</Label>
                                                        <Input 
                                                          value={opt.camoOption.text} 
                                                          onChange={(e) => {
                                                              hasUserEdited.current = true;
                                                              updateOption(statement.id, opt.id, { 
                                                                camoOption: { ...opt.camoOption!, text: e.target.value }
                                                              });
                                                          }} 
                                                          className="h-9 text-xs bg-white border-0 shadow-sm font-bold" 
                                                          placeholder="Ghost option text..." 
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                    <Button variant="outline" onClick={() => addOption(statement.id)} className="glass-btn w-full h-12 gap-2 text-primary hover:text-primary/80"><PlusIcon className="w-4 h-4" /> Add Option</Button>
                                  </div>
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
              <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <AnimatePresence mode="wait">
                  {showEntryScreen ? (
                    <motion.div 
                      key="entry" 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="text-center space-y-8 max-w-2xl px-6 py-12 bg-white/40 backdrop-blur-xl rounded-[48px] border border-white/50 shadow-premium"
                    >
                      <div className="w-24 h-24 bg-premium-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Heart className="w-12 h-12 text-white fill-current" />
                      </div>
                      <div className="space-y-4">
                  {entryMessage && (
                    <>
                      <h1 className="text-5xl font-heading font-extrabold text-gradient leading-tight">{entryMessage.title}</h1>
                      <p className="text-xl font-bold opacity-70 leading-relaxed font-sans">{entryMessage.subtitle}</p>
                    </>
                  )}
                      </div>
                      <Button 
                        onClick={() => {
                          setShowEntryScreen(false);
                          playSound('swish');
                        }} 
                        className="pill-button bg-premium-gradient px-12 h-14 text-xl font-bold shadow-premium scale-110 hover:scale-115 transition-transform"
                      >
                        Start 💖
                      </Button>
                    </motion.div>
                  ) : currentStatementId === 'END' ? (
                    <motion.div key="end" className="text-center space-y-6">
                      <h1 className="text-6xl font-heading font-extrabold text-gradient">{currentEndingDisplay?.title || ending.title}</h1>
                      <p className="text-2xl font-bold opacity-80">{currentEndingDisplay?.subtitle || ending.subtitle}</p>
                      {(mode === 'test' || isAdmin) && (
                        <Button onClick={() => setMode('builder')} className="pill-button bg-premium-gradient px-12">Edit 💖</Button>
                      )}
                    </motion.div>
                  ) : currentStatement ? (
                    <motion.div key={currentStatement.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-lg px-4">
                      <Card className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-[32px] p-8 md:p-12 space-y-10">
                        <h2 className="text-2xl font-semibold text-text-dark text-center leading-tight tracking-tight">{currentStatement.text}</h2>
                        <div ref={viewerContainerRef} className="flex flex-col gap-3 relative">
                          {currentStatement.options.map((opt) => {
                            const stage = camoStages[opt.id] || 0;
                            // Helper to get option at specific stage
                            const getOptionAtStage = (o: any, s: number): any => {
                              let depth = 0;
                              let currentOpt = o;
                              while (currentOpt.camoOption && depth < s) {
                                currentOpt = currentOpt.camoOption;
                                depth++;
                              }
                              return currentOpt;
                            };
                            const displayedOpt = getOptionAtStage(opt, stage);
                            const pos = noModePositions[opt.id] || { x: 0, y: 0 };
                            const isBlasting = noModeBlasts[opt.id];

                            return (
                              <motion.div
                                key={opt.id}
                                onMouseEnter={opt.noModeEnabled && !opt.isCorrect ? () => handleNoModeMove(opt.id) : undefined}
                                onTouchStart={opt.noModeEnabled && !opt.isCorrect ? () => handleNoModeMove(opt.id) : undefined}
                                animate={{ 
                                  x: pos.x, 
                                  y: pos.y,
                                  scale: isBlasting ? [1, 1.2, 0] : 1,
                                  opacity: isBlasting ? [1, 1, 0] : 1
                                }}
                                transition={{
                                  x: opt.noModeEnabled ? { type: "spring", damping: 8, stiffness: 120 } : { duration: 0.2 },
                                  y: opt.noModeEnabled ? { type: "spring", damping: 8, stiffness: 120 } : { duration: 0.2 },
                                  scale: { duration: 0.8, ease: "easeOut" },
                                  opacity: { duration: 0.8, ease: "easeOut" }
                                }}
                                className="relative"
                              >
                                {isBlasting && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                    {[...Array(6)].map((_, i) => (
                                      <motion.span
                                        key={i}
                                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                        animate={{ 
                                          opacity: 0, 
                                          scale: 1.5, 
                                          x: (Math.random() - 0.5) * 100, 
                                          y: (Math.random() - 0.5) * 100 
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="text-2xl"
                                      >
                                        {['💨', '✨', '🎀', '🧸'][i % 4]}
                                      </motion.span>
                                    ))}
                                  </div>
                                )}
                                <Button 
                                  onClick={(e) => handleOptionSelect(opt, e)} 
                                  className={cn(
                                    "w-full min-h-[64px] text-base font-medium rounded-[16px] transition-all duration-200",
                                    "bg-white border border-black/[0.04] shadow-sm text-text-dark hover:bg-bg-soft/50 hover:shadow-md",
                                    "active:scale-[0.98]",
                                    glitchTargetId === opt.id && isGlitching && "glitch-lite"
                                  )}
                                >
                                  <AnimatePresence mode="wait">
                                    <motion.span
                                      key={displayedOpt.text}
                                      initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.95 }}
                                      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                                      exit={{ opacity: 0, filter: 'blur(4px)', scale: 1.05 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                      className="flex items-center justify-center w-full px-6 text-center"
                                    >
                                      {displayedOpt.text}
                                    </motion.span>
                                  </AnimatePresence>
                                </Button>
                              </motion.div>
                            );
                          })}
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
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-xl p-1.5 rounded-full shadow-lg border border-black/5 z-[5000]">
                <Button 
                  variant="ghost" 
                  onClick={() => setBuilderView('LIST')} 
                  className={cn(
                    "rounded-full px-6 h-10 transition-all text-xs font-bold uppercase tracking-wider", 
                    builderView === 'LIST' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-black/5"
                  )}
                >
                  List
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setBuilderView('FLOW')} 
                  className={cn(
                    "rounded-full px-6 h-10 transition-all text-xs font-bold uppercase tracking-wider", 
                    builderView === 'FLOW' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-black/5"
                  )}
                >
                  Flow
                </Button>
            </motion.div>
            {builderView === 'LIST' && (
                <motion.button 
                  initial={{ scale: 0, rotate: -45 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  exit={{ scale: 0, rotate: 45 }} 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addStatement} 
                  className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-[5000] border-4 border-white"
                >
                  <PlusIcon className="w-7 h-7" />
                </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Particles */}
      {sparkles.map(s => (
        <div 
          key={s.id} 
          className="sparkle" 
          style={{ left: s.x, top: s.y }}
        />
      ))}

      {/* Modals */}
      <Dialog open={showWrongPopup} onOpenChange={setShowWrongPopup}>
        <DialogContent className="sm:max-w-[400px] rounded-[32px] border-none bg-background p-10 text-center">
          <DialogTitle className="sr-only">Try Again</DialogTitle>
          <DialogDescription className="sr-only">The selected option was incorrect.</DialogDescription>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
          >
            <p className="text-xl font-bold text-text-dark mb-6">{wrongMessage}</p>
          </motion.div>
          <Button onClick={() => setShowWrongPopup(false)} className="pill-button bg-premium-gradient w-full">Try again 💖</Button>
        </DialogContent>
      </Dialog>
      
      <EndingMessageDialog 
        open={showEndingModal} 
        onOpenChange={setShowEndingModal} 
        ending={ending} 
        setEnding={(e) => { 
          hasUserEdited.current = true; 
          setEnding(e);
        }} 
        endings={endings ?? []} 
        setEndings={(e) => { 
          hasUserEdited.current = true; 
          setEndings(e); 
        }} 
      />
      
      <EntryMessageDialog 
        open={showEntryDialog} 
        onOpenChange={setShowEntryDialog} 
        entryMessage={entryMessage ?? { title: "", subtitle: "" }} 
        setEntryMessage={(e) => { 
          hasUserEdited.current = true; 
          setEntryMessage(e); 
        }} 
      />

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-[28px] p-10">
          <DialogTitle className="text-2xl font-bold mb-4 text-center">Errors found! ⚠️</DialogTitle>
          <DialogDescription className="sr-only">Review the errors in your quiz configuration.</DialogDescription>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {validationErrors.map((err, i) => (
               <div 
                 key={i} 
                 className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all flex items-center justify-between ${err.type === 'warning' ? 'bg-primary/10 border-primary/20' : 'bg-accent/10 border-accent/20'}`}
                 onClick={() => {
                   setShowErrorDialog(false);
                   setHighlightedErrorId(err.statementId);
                   const el = document.getElementById(`statement-${err.statementId}`);
                   if (el) {
                       el.scrollIntoView({ behavior: 'smooth' });
                       el.classList.add('error-highlight');
                       setTimeout(() => el.classList.remove('error-highlight'), 3000);
                   }
                 }}
               >
                 <span className={`text-sm font-semibold ${err.type === 'warning' ? 'text-text-dark' : 'text-accent'}`}>
                    {err.type === 'warning' ? '⚠ ' : ''}{err.message}
                 </span>
                 <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${err.type === 'warning' ? 'bg-primary/20 text-text-dark' : 'bg-accent/20 text-accent'}`}>
                    Q{(statements ?? []).findIndex(s => s.id === err.statementId) + 1}
                 </span>
               </div>
            ))}
          </div>
          <Button onClick={() => setShowErrorDialog(false)} className="pill-button bg-premium-gradient w-full mt-6">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statementToDelete} onOpenChange={(v) => !v && setStatementToDelete(null)}>
        <DialogContent className="p-10 text-center rounded-[28px]">
          <Trash2 className="w-12 h-12 text-accent mx-auto mb-4" />
          <DialogTitle className="text-2xl font-bold mb-6">Delete this statement?</DialogTitle>
          <DialogDescription className="sr-only">Confirm if you want to permanently delete this statement.</DialogDescription>
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
