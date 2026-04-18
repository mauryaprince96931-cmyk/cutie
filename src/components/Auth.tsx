
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserPlus, Trash2, Key, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '../types';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const getFriendlyError = (code: string) => {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address 💖';
    case 'auth/user-not-found': return 'No account found with this email ✨';
    case 'auth/wrong-password': return 'Incorrect passcode/password 🔒';
    case 'auth/email-already-in-use': return 'Email already registered ✨';
    case 'auth/weak-password': return 'Passcode is too weak 🧸';
    case 'auth/invalid-credential': return 'Invalid credentials 💖';
    default: return 'Something went wrong, try again! 🎀';
  }
};

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e: any) {
      setError(getFriendlyError(e.code));
    }
  };

  const handleAdminLogin = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, adminPass);
    } catch (e: any) {
      setError(getFriendlyError(e.code));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/10 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-soft border border-secondary/20 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-heading font-extrabold text-primary">{isRegistering ? 'Sign Up' : 'Login'}</h1>
            <p className="text-muted-foreground text-sm font-medium">Welcome back, cupcake! 🧁</p>
        </div>

        {error && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/10 border border-accent/20 p-3 rounded-2xl flex items-center gap-3 text-accent text-sm font-bold"
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
            </motion.div>
        )}

        <div className="space-y-4">
          <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-2xl h-12" />
          <Input type="password" placeholder={isRegistering ? "Create Passcode" : "Passcode"} value={pass} onChange={e => setPass(e.target.value)} className="rounded-2xl h-12" />
          <Button className="w-full bg-premium-gradient rounded-2xl h-12 font-bold text-lg shadow-premium" onClick={handleLogin}>
            {isRegistering ? 'Sign Up ✨' : 'Login 💖'}
          </Button>
          <button 
            className="w-full text-center text-primary/60 text-sm font-bold hover:text-primary transition-colors"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {!isRegistering && (
            <div className="pt-6 border-t border-secondary/20 space-y-4">
                <div className="text-center">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Admin Portal</span>
                </div>
                <Input type="password" placeholder="Admin Passcode" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="rounded-2xl h-12" />
                <Button className="w-full rounded-2xl h-12 font-bold" variant="outline" onClick={handleAdminLogin}>Admin Login 🎀</Button>
            </div>
        )}
      </div>
    </div>
  );
};

export const AdminPanel = ({ users, onCreateUser, onEnterBuilder, onDeleteUser }: { users: User[], onCreateUser: (n: string, p: string) => void, onEnterBuilder: (u: User) => void, onDeleteUser: (id: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setUserToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[32px] shadow-premium max-w-sm w-full text-center space-y-6 border border-white/50"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-heading font-extrabold text-primary">Delete User?</h3>
                <p className="text-muted-foreground font-medium">
                  This will permanently remove <span className="text-accent font-bold">"{userToDelete.name}"</span> and all their created content. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 rounded-full h-12 font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDelete}
                  className="flex-1 rounded-full h-12 font-bold bg-accent hover:bg-accent/90 text-white"
                >
                  Delete 🗑️
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-extrabold text-gradient">Admin Dashboard</h1>
      </div>

      <div className="max-w-sm mx-auto w-full">
        <Card className="scrapbook-card border-none shadow-premium overflow-hidden">
          <CardHeader className="bg-premium-gradient text-white pb-3 pt-5 px-5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="w-5 h-5" />
              Create New Cutie
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="New Username" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className={cn("pl-10", error && !name.trim() && "border-accent")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="New Passcode" 
                      value={pass} 
                      onChange={e => setPass(e.target.value)}
                      className={cn("pl-10", error && !pass.trim() && "border-accent")}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-accent/10 border border-accent/20 p-2 rounded-xl flex items-center gap-2 text-accent text-[11px] font-bold"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-highlight/10 border border-highlight/20 p-2 rounded-xl flex items-center gap-2 text-highlight text-[11px] font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {success}
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="pill-button w-full bg-premium-gradient font-bold h-10 text-sm"
                disabled={!name.trim() || !pass.trim()}
              >
                Add User ✨
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2 flex items-center gap-2">
          Registered Users <span className="text-xs bg-primary/20 text-accent px-2 py-0.5 rounded-full">{users.length}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.length === 0 ? (
            <p className="col-span-full text-center py-10 opacity-50 italic">No users found... 🧸</p>
          ) : (
            users.map(u => (
              <Card key={u.id} className="scrapbook-card p-4 flex justify-between items-center group transition-all hover:bg-secondary/5 border-white/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-premium-gradient flex items-center justify-center text-white font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{u.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{u.email}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onEnterBuilder(u)}
                    className="rounded-full font-bold text-xs h-9 hover:bg-primary/20"
                  >
                    Manage 🌸
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setUserToDelete(u)}
                    className="rounded-full w-9 h-9 p-0 text-muted-foreground hover:text-accent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

