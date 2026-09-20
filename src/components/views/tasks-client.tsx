"use client";

import { useState, useMemo } from "react";
import { format, addMonths, subMonths, addYears, subYears, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTask, deleteTask, toggleTask } from "@/app/actions/tasks";
import { OWNER_LABEL, type MemberOwner, type Task } from "@/lib/types";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function TasksClient({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Create task dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(new Date().toISOString().slice(0, 10));

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthsInYear = useMemo(() => {
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [currentDate]);

  const next = () => {
    setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : addYears(currentDate, 1));
  };
  const prev = () => {
    setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : subYears(currentDate, 1));
  };

  const getMarkerStyle = (owner: string) => {
    if (owner === "eki") return "bg-blue-500";
    if (owner === "dinda") return "bg-pink-500";
    return "bg-gradient-to-r from-blue-500 to-pink-500"; // KITA
  };

  const renderDay = (day: Date, isYearView = false) => {
    const dayTasks = tasks.filter(t => t.due_on === format(day, "yyyy-MM-dd"));
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isToday = isSameDay(day, new Date());
    
    return (
      <div 
        key={day.toISOString()}
        onClick={() => {
          setSelectedDate(day);
          setIsDialogOpen(true);
        }}
        className={`relative p-2 h-20 sm:h-24 border border-border/50 transition-colors cursor-pointer hover:bg-muted/50 ${!isCurrentMonth && !isYearView ? "opacity-30" : ""} ${isToday ? "bg-primary/5" : "bg-card"}`}
      >
        <div className="flex justify-between items-start">
          <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
            {format(day, "d")}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-1 overflow-hidden h-full">
          {dayTasks.slice(0, 2).map((t, i) => (
            <div key={i} className={`h-1.5 w-full rounded-full ${getMarkerStyle(t.assigned_to)}`} />
          ))}
          {dayTasks.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 2}</span>}
        </div>
      </div>
    );
  };

  const handleCreateTask = (formData: FormData) => {
    startTransition(async () => {
      await createTask(formData);
      setIsCreateOpen(false);
      router.refresh();
    });
  };

  const handleToggle = (id: string, is_done: boolean) => {
    startTransition(async () => {
      await toggleTask(id, is_done);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTask(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar KITA"
        description="Rencana, acara, dan pengingat bersama."
        action={
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-md flex">
              <Button variant={viewMode === "month" ? "subtle" : "ghost"} size="sm" onClick={() => setViewMode("month")}>Bulan</Button>
              <Button variant={viewMode === "year" ? "subtle" : "ghost"} size="sm" onClick={() => setViewMode("year")}>Tahun</Button>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah Rencana</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Rencana</DialogTitle></DialogHeader>
                <form action={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Acara</Label>
                    <Input id="title" name="title" required placeholder="Cth: Belanja bulanan, Liburan" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due_on">Tanggal</Label>
                      <Input id="due_on" name="due_on" type="date" value={createDate} onChange={e => setCreateDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Milik / Keterlibatan</Label>
                      <Select id="assigned_to" name="assigned_to" defaultValue="shared">
                        {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                          <option key={o} value={o}>{OWNER_LABEL[o]}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={pending}>Simpan</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex items-center justify-between mb-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <h2 className="text-xl sm:text-2xl font-bold font-serif capitalize">
          {viewMode === "month" ? format(currentDate, "MMMM yyyy", { locale: id }) : format(currentDate, "yyyy")}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hari Ini</Button>
          <Button variant="outline" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {viewMode === "month" ? (
        <Card>
          <div className="grid grid-cols-7 text-center py-3 border-b border-border bg-muted/20">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => (
              <div key={day} className="text-sm font-medium text-muted-foreground">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map(day => renderDay(day))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {monthsInYear.map(monthDate => (
            <Card key={monthDate.toISOString()} className="overflow-hidden">
              <div className="bg-muted/50 py-2 text-center font-semibold capitalize border-b border-border">
                {format(monthDate, "MMMM", { locale: id })}
              </div>
              <div className="p-2 grid grid-cols-7 gap-1">
                {eachDayOfInterval({ 
                  start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }), 
                  end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }) 
                }).map(day => {
                  const isCurrentMonth = isSameMonth(day, monthDate);
                  const hasTasks = tasks.some(t => t.due_on === format(day, "yyyy-MM-dd"));
                  
                  return (
                    <div 
                      key={day.toISOString()}
                      onClick={() => {
                        setSelectedDate(day);
                        setIsDialogOpen(true);
                      }}
                      className={`aspect-square flex items-center justify-center text-[10px] rounded-full cursor-pointer hover:bg-primary/20 ${!isCurrentMonth ? "opacity-20" : ""} ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""} ${hasTasks && !isSameDay(day, new Date()) ? "font-bold ring-1 ring-primary/50 text-primary" : ""}`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: id })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedDate && tasks.filter(t => t.due_on === format(selectedDate, "yyyy-MM-dd")).length > 0 ? (
              tasks.filter(t => t.due_on === format(selectedDate, "yyyy-MM-dd")).map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <input
                    type="checkbox"
                    checked={task.is_done}
                    onChange={(e) => handleToggle(task.id, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.is_done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`h-2 w-2 rounded-full ${getMarkerStyle(task.assigned_to)}`} />
                      <span className="text-xs text-muted-foreground">{OWNER_LABEL[task.assigned_to]}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                     X
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">Tidak ada rencana di tanggal ini.</p>
            )}
            <Button 
              className="w-full mt-2" 
              variant="outline" 
              onClick={() => {
                setCreateDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
                setIsDialogOpen(false);
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Rencana Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
