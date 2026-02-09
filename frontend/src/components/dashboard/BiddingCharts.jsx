import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS = {
  DRAFT: '#71717a',      // Gray
  PENDING: '#f59e0b',    // Amber
  ACCEPTED: '#10b981',   // Emerald
  REWARDED: '#10b981',   // Emerald
  AWARDED: '#10b981',    // Emerald
  REJECTED: '#ef4444',   // Red
};

export default function BiddingCharts({ bidData = [], tenderData = [], userRole }) {
  const [view, setView] = useState("bids");

  const activeBidData = bidData.filter(item => item.value > 0);
  const hasBidData = activeBidData.length > 0;
  const hasTenderData = tenderData.length > 0;

  // Role-specific descriptions
  const getChartDescription = () => {
    if (view === "tenders") return "Monthly tender volume trends";
    switch (userRole) {
      case 'BIDDER': return "Status of bids you have submitted";
      case 'TENDER_POSTER': return "Status of bids received for your tenders";
      case 'COMPANY_ADMIN': return "Overall company bidding performance";
      default: return "Distribution of bid statuses";
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 text-white shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-zinc-900/50">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight">Analytics Overview</CardTitle>
          <CardDescription className="text-zinc-500">
            {getChartDescription()}
          </CardDescription>
        </div>

        <Tabs value={view} onValueChange={setView} className="w-[180px]">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-zinc-800 p-1">
            <TabsTrigger value="bids" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">Bids</TabsTrigger>
            <TabsTrigger value="tenders" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">Tenders</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="h-[400px] pt-6 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === "bids" ? (
            <motion.div
              key="bids-chart"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex flex-col items-center"
            >
              {hasBidData ? (
                <>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={activeBidData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={activeBidData.length > 1 ? 5 : 0}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={8}
                      >
                        {activeBidData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name.toUpperCase()] || '#3f3f46'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#09090b', 
                          border: '1px solid #27272a', 
                          borderRadius: '12px' 
                        }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
                    {activeBidData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: STATUS_COLORS[entry.name.toUpperCase()] || '#3f3f46' }}
                        />
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 italic">
                  No active bid data to visualize
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tenders-chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              {hasTenderData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tenderData}>
                    <defs>
                      <linearGradient id="colorTender" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTender)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm">
                  No monthly activity found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}