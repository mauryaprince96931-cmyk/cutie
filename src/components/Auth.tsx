
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserPlus, Trash2, Key, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '../types';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { findUserByNameAndPass } from '@/lib/db';

const getFriendlyError = (code: string) => {
  const domain = window.location.hostname;
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address 💖';
    case 'auth/user-not-found': return 'No account found with this email ✨';
    case 'auth/wrong-password': return 'Incorrect passcode/password 🔒';
    case 'auth/email-already-in-use': return 'Email already registered ✨';
    case 'auth/weak-password': return 'Passcode is too weak 🧸';
    case 'auth/invalid-credential': return 'Invalid credentials 💖';
    case 'auth/operation-not-allowed': return 'Email login is not enabled in Firebase 🎀';
    case 'auth/network-request-failed': 
      return `Domain not authorized? 🌐 Add "${domain}" to Firebase Authorized Domains in Settings!`;
    case 'unavailable':
      return 'Database is offline 📶 check your internet or Firebase config.';
    case 'permission-denied':
      return 'Permission Denied 🔒 (Security Rules issue)';
    default: return `Error (${code}): Something went wrong, try again! 🎀`;
  }
};

export const LoginScreen = ({ onUserLogin }: { onUserLogin: (user: User) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (isAdminMode) {
        if (!email || !adminPass) {
          setError('Email and Admin Passcode required 🧸');
          setIsLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, email, adminPass);
      } else {
        if (!name || !pass) {
          setError('Username and Passcode required 🎀');
          setIsLoading(false);
          return;
        }
        const user = await findUserByNameAndPass(name, pass);
        if (user) {
          onUserLogin(user);
        } else {
          setError('Invalid username or passcode 💖');
        }
      }
    } catch (e: any) {
      setError(getFriendlyError(e.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-soft/30 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 rounded-[32px] max-w-sm w-full space-y-8"
      >
        <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-text-dark tracking-tight">{isAdminMode ? 'Admin Portal' : 'Cutie Login'}</h1>
            <p className="text-muted-foreground text-sm font-medium">Please enter your credentials to access the builder.</p>
        </div>

        {error && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-destructive/5 border border-destructive/10 p-3 rounded-xl flex items-center gap-3 text-destructive text-xs font-semibold"
            >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
            </motion.div>
        )}

        <div className="space-y-4">
          <div className="space-y-3">
            {isAdminMode ? (
              <>
                <Input placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl h-12 bg-white border-black/5" />
                <Input type="password" placeholder="Passcode" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="rounded-xl h-12 bg-white border-black/5" />
              </>
            ) : (
              <>
                <Input placeholder="Username" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-12 bg-white border-black/5" />
                <Input type="password" placeholder="Passcode" value={pass} onChange={e => setPass(e.target.value)} className="rounded-xl h-12 bg-white border-black/5" />
              </>
            )}
          </div>
          
          <Button 
            className="w-full primary-btn rounded-xl h-12 font-bold text-base shadow-sm" 
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : (isAdminMode ? 'Enter Admin Panel' : 'Sign In')}
          </Button>

          <button 
            className="w-full text-center text-muted-foreground text-xs font-bold hover:text-primary transition-colors pt-2 uppercase tracking-widest"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setError('');
            }}
          >
            {isAdminMode ? 'Back to User Login' : "Admin Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const AdminPanel = ({ users, onCreateUser, onEnterBuilder, onDeleteUser }: { users: User[], onCreateUser: (n: string, p: string) => void, onEnterBuilder: (u: User) => void, onDeleteUser: (id: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [managePass, setManagePass] = useState('');
  const [manageError, setManageError] = useState('');

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const handleConfirmManage = () => {
    if (!userToManage) return;
    if (managePass === userToManage.passcode) {
      onEnterBuilder(userToManage);
      setUserToManage(null);
      setManagePass('');
      setManageError('');
    } else {
      setManageError("Incorrect passcode! 🔒");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedPass = pass.trim();

    // 1. Block Empty
    if (!trimmedName || !trimmedPass) {
      setError("Please enter username and passcode 💖");
      return;
    }

    // 2. Min Length
    if (trimmedName.length < 2) {
      setError("Username too short ✨");
      return;
    }
    if (trimmedPass.length < 4) {
      setError("Passcode must be at least 4 digits 🔒");
      return;
    }

    // 3. Duplicate Check
    const exists = users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setError("User already exists 💕");
      return;
    }

    // 4. Create
    onCreateUser(trimmedName, trimmedPass);
    setSuccess("User created successfully! ✨");
    setName('');
    setPass('');
    
    // Clear success after a delay
    setTimeout(() => setSuccess(''), 3000);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
      setSuccess(`User "${userToDelete.name}" deleted 🗑️`);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto min-h-screen">
      {/* Manage Confirmation Modal */}
      <AnimatePresence>
        {userToManage && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setUserToManage(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full space-y-6 border border-black/5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Key className="w-6 h-6" />
              </div>
              
              <div className="space-y-1 text-center">
                <h3 className="text-xl font-semibold text-text-dark tracking-tight">Security Check</h3>
                <p className="text-muted-foreground text-xs font-medium">Please verify the passcode for <b>"{userToManage.name}"</b></p>
              </div>

              <Input 
                type="password"
                placeholder="Passcode"
                value={managePass}
                onChange={e => setManagePass(e.target.value)}
                className="rounded-xl h-12 text-center bg-bg-soft/30 border-black/5 font-bold tracking-widest"
                autoFocus
              />

              {manageError && (
                <p className="text-destructive text-xs font-bold text-center bg-destructive/5 py-2 rounded-lg">{manageError}</p>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => { setUserToManage(null); setManagePass(''); setManageError(''); }}
                  className="flex-1 rounded-xl h-11 font-bold text-sm hover:bg-black/5"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleConfirmManage}
                  className="flex-1 rounded-xl h-11 font-bold text-sm primary-btn"
                >
                  Proceed
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setUserToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-black/5"
            >
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-text-dark tracking-tight">Delete User?</h3>
                <p className="text-muted-foreground text-sm font-medium">
                  This will permanently remove <b>"{userToDelete.name}"</b> and everything they built.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 rounded-xl h-11 font-bold text-sm hover:bg-black/5"
                >
                  Keep
                </Button>
                <Button 
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl h-11 font-bold text-sm bg-destructive text-white hover:bg-destructive/90 transition-all shadow-sm"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between pb-4 border-b border-black/5">
        <h1 className="text-2xl font-semibold text-text-dark tracking-tight">Admin Dashboard</h1>
        <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-bg-soft px-3 py-1.5 rounded-full">System v2.0</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass-card border-black/5 shadow-xl overflow-hidden rounded-[24px]">
              <CardHeader className="bg-primary text-white pb-4 pt-5 px-6">
                <CardTitle className="flex items-center gap-2 text-base font-bold uppercase tracking-wider">
                  <UserPlus className="w-4 h-4" />
                  Add New Cutie
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Username</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Unique ID" 
                          value={name} 
                          onChange={e => setName(e.target.value)}
                          className={cn("pl-10 h-10 rounded-xl bg-bg-soft/30 border-black/5", error && !name.trim() && "border-destructive/50")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Passcode (4+ digits)</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Secret numbers" 
                          value={pass} 
                          onChange={e => setPass(e.target.value)}
                          className={cn("pl-10 h-10 rounded-xl bg-bg-soft/30 border-black/5", error && !pass.trim() && "border-destructive/50")}
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="bg-destructive/5 border border-destructive/10 p-2.5 rounded-xl flex items-center gap-2 text-destructive text-[11px] font-semibold"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="bg-primary/5 border border-primary/10 p-2.5 rounded-xl flex items-center gap-2 text-primary text-[11px] font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {success}
                    </motion.div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full primary-btn font-bold h-10 text-sm rounded-xl"
                    disabled={!name.trim() || !pass.trim()}
                  >
                    Generate Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
              Users list
              <span className="h-5 px-2 bg-black/5 text-text-dark rounded text-[10px] flex items-center justify-center font-bold">{users.length}</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-bg-soft/30 rounded-[32px] border border-dashed border-black/10">
                <p className="text-muted-foreground text-sm font-medium">No users found. Create your first one!</p>
              </div>
            ) : (
              users.map((u, i) => (
                <motion.div 
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass-card p-5 group flex flex-col gap-5 border-black/5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 rounded-[24px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-text-dark truncate text-base">{u.name}</span>
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer group/pass"
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                        >
                          <Key className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover/pass:text-primary transition-colors">
                            {revealedPasswords[u.id] ? u.passcode : '••••'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setUserToManage(u)}
                        className="flex-1 rounded-xl font-bold text-xs h-9 bg-bg-soft text-text-dark hover:bg-black/5"
                      >
                        Builder
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setUserToDelete(u)}
                        className="w-9 h-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

