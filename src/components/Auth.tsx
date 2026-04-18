
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '../types';

export const LoginScreen = ({ onLogin, onAdminLogin }: { onLogin: (name: string, pass: string) => void, onAdminLogin: (pass: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [adminPass, setAdminPass] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/10 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-soft border border-secondary/20 max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-bold text-center text-primary">Login</h1>
        <div className="space-y-4">
          <Input placeholder="Username" value={name} onChange={e => setName(e.target.value)} />
          <Input type="password" placeholder="Passcode" value={pass} onChange={e => setPass(e.target.value)} />
          <Button className="w-full bg-premium-gradient" onClick={() => onLogin(name, pass)}>Login</Button>
        </div>
        <div className="pt-6 border-t border-secondary/20 space-y-4">
          <Input type="password" placeholder="Admin Passcode" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
          <Button className="w-full" variant="outline" onClick={() => onAdminLogin(adminPass)}>Admin Login</Button>
        </div>
      </div>
    </div>
  );
};

export const AdminPanel = ({ users, onCreateUser, onEnterBuilder, onDeleteUser }: { users: User[], onCreateUser: (n: string, p: string) => void, onEnterBuilder: (u: User) => void, onDeleteUser: (id: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <div className="bg-white p-6 rounded-2xl shadow-soft space-y-4">
        <Input placeholder="New Username" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="New Passcode" value={pass} onChange={e => setPass(e.target.value)} />
        <Button onClick={() => onCreateUser(name, pass)}>Create User</Button>
      </div>
      <div className="space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
            <span className="font-bold">{u.name}</span>
            <div className="space-x-2">
              <Button size="sm" onClick={() => onEnterBuilder(u)}>Enter Builder</Button>
              <Button size="sm" variant="destructive" onClick={() => onDeleteUser(u.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

