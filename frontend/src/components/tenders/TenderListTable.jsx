
//frontend\src\components\tenders\TenderListTable.jsx
import React from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Send, Lock } from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const statusStyles = {
  DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700",
  PUBLISHED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  CLOSED: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  AWARDED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export default function TenderListTable({ tenders, onAction }) {
  if (tenders.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
        <p className="text-zinc-500">No tenders found. Create your first project to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400">Tender Details</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">Budget Range</TableHead>
            <TableHead className="text-zinc-400">Deadline</TableHead>
            <TableHead className="text-right text-zinc-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenders.map((tender) => (
            <TableRow key={tender._id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors">
              <TableCell>
                <div className="font-medium text-zinc-200">{tender.title}</div>
                <div className="text-xs text-zinc-500 mt-1">{tender.category || 'General'}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`${statusStyles[tender.status]} font-bold text-[10px]`}>
                  {tender.status}
                </Badge>
              </TableCell>
              <TableCell className="text-zinc-300">
                ${tender.estimatedValue?.toLocaleString() || '0'}
              </TableCell>
              <TableCell className="text-zinc-400 text-sm">
                {new Date(tender.endDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300">
                    <DropdownMenuItem className="hover:bg-zinc-900 cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    
                    {tender.status === 'DRAFT' && (
                      <DropdownMenuItem 
                        onClick={() => onAction(tender._id, 'publish')}
                        className="text-blue-400 hover:bg-blue-400/10 cursor-pointer"
                      >
                        <Send className="mr-2 h-4 w-4" /> Publish Tender
                      </DropdownMenuItem>
                    )}

                    {tender.status === 'PUBLISHED' && (
                      <DropdownMenuItem 
                        onClick={() => onAction(tender._id, 'close')}
                        className="text-amber-400 hover:bg-amber-400/10 cursor-pointer"
                      >
                        <Lock className="mr-2 h-4 w-4" /> Close Submissions
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}