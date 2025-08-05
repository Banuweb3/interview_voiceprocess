import React from 'react';
import { LogOut, Shield, User as UserIcon } from 'lucide-react';
import { supabase, User, isAdmin } from '../lib/supabase';

interface UserProfileProps {
  user: User;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const adminStatus = isAdmin(user);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        {adminStatus ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
            <Shield className="w-3 h-3" />
            <span className="font-medium">Admin</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
            <UserIcon className="w-3 h-3" />
            <span>User</span>
          </div>
        )}
        <span className="text-gray-600">{user.email}</span>
      </div>
      
      <button
        onClick={handleSignOut}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
};