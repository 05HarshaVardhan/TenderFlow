//frontend\src\components\dashboard\TeamOverview.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import api from '@/api/axios';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";

export default function TeamOverview() {
  const { state } = useAuth();
  const currentUser = state.user;
  
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get('/users/my-company');
        let teamData = response.data;

        // --- SORTING LOGIC TO PUT "YOU" ON TOP ---
        if (currentUser && teamData.length > 0) {
          teamData = [...teamData].sort((a, b) => {
            const isA = a._id === currentUser.id || a._id === currentUser._id;
            const isB = b._id === currentUser.id || b._id === currentUser._id;
            if (isA) return -1; // a comes first
            if (isB) return 1;  // b comes first
            return 0;           // keep original order for others
          });
        }
        
        setTeam(teamData);
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [currentUser]); // Re-run if currentUser changes

  if (loading) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 flex items-center justify-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800 text-white">
      <CardHeader className="flex flex-row items-center gap-4 border-b border-zinc-900 pb-4">
        <Users className="text-blue-500 h-5 w-5" />
        <CardTitle>Team Management</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {team.map((member) => {
            const isMe = member._id === currentUser?.id || member._id === currentUser?._id;

            return (
              <div 
                key={member._id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isMe 
                    ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ${
                    isMe 
                      ? 'bg-blue-600 text-white ring-blue-500/20' 
                      : 'bg-zinc-800 text-zinc-400 ring-transparent'
                  }`}>
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isMe ? 'text-blue-400' : 'text-zinc-200'}`}>
                        {member.name}
                      </p>
                      {isMe && (
                        <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] font-bold px-2 py-0 ${
                    isMe ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {member.role?.replace('_', ' ')}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}