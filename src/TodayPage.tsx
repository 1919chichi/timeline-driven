import React, { useState, useCallback, useMemo, MouseEvent } from "react";
import { getToday, getStatus, isDoneToday, normalizeTags, getDaysUntilEnd, taskMatchesSearch } from "./utils/taskUtils";
import { useLocalStorage } from "./hooks/useLocalStorage";
import UpcomingTaskItem from "./components/UpcomingTaskItem";
import TaskModal, { TaskData } from "./components/TaskModal";
import SortableTaskItem from "./components/SortableTaskItem";
import { Task, Tag } from "./types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

export default function TodayPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("timetrackr_tasks", []);
  const [historicalTags, setHistoricalTags] = useLocalStorage<string[]>("timetrackr_historical_tags", []);
  const [historicalGroups, setHistoricalGroups] = useLocalStorage<string[]>("timetrackr_historical_groups", []);

  const [nameFilter, setNameFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");

  const toggleTask = useCallback((id: string | number, e: MouseEvent) => {
    if (e) e.stopPropagation();
    const today = getToday();

    setTasks((prev: Task[]) =>
      prev.map((t: Task) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        const done = isDoneToday(t);

        if (done) {
          delete newLogs[today];
        } else {
          const tags = normalizeTags(t.tags);
          if (tags.length > 0) {
            const todayLog: Record<string, number> = {};
            tags.forEach((tag: Tag) => {
                todayLog[tag.name] = tag.max;
            });
            newLogs[today] = todayLog;
          } else {
            newLogs[today] = true;
          }
        }

        return { ...t, logs: newLogs };
      }),
    );
  }, [setTasks]);

  const toggleTag = useCallback((id: string | number, tagName: string, maxCount: number, e: MouseEvent) => {
    if (e) e.stopPropagation();
    const today = getToday();

    setTasks((prev: Task[]) =>
      prev.map((t: Task) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        let todayLog = newLogs[today];
        
        if (todayLog === true) {
            const tags = normalizeTags(t.tags);
            todayLog = {};
            tags.forEach((tag: Tag) => {
                todayLog[tag.name] = tag.max;
            });
        } else if (!todayLog) {
            todayLog = {};
        } else {
            todayLog = { ...todayLog };
        }

        const currentCount = todayLog[tagName] || 0;
        if (currentCount >= maxCount) {
            todayLog[tagName] = 0;
        } else {
            todayLog[tagName] = currentCount + 1;
        }

        newLogs[today] = todayLog;
        return { ...t, logs: newLogs };
      }),
    );
  }, [setTasks]);

  const openModal = useCallback((task: Task | null, mode: "create" | "edit" | "view", e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setModalMode(mode);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((task: Task, e: MouseEvent) => openModal(task, "edit", e), [openModal]);
  const openViewModal = useCallback((task: Task, e: MouseEvent) => openModal(task, "view", e), [openModal]);

  const openAddModal = useCallback(() => {
    setEditingTask(null);
    setModalMode("create");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => setShowModal(false), []);

  const saveTask = useCallback((taskData: TaskData) => {
    const { id, name, start, end, tags, accountId, accountInfo, coopInfo, note, groupId } = taskData;
    
    const newHistory = new Set(historicalTags);
    tags.forEach((t: Tag) => newHistory.add(t.name));
    setHistoricalTags(Array.from(newHistory));

    if (groupId) {
      const newGroups = new Set(historicalGroups);
      newGroups.add(groupId);
      setHistoricalGroups(Array.from(newGroups));
    }

    if (id) {
      setTasks((prev: Task[]) => prev.map((t: Task) => {
        if (t.id === id) {
          return { ...t, name, start, end, tags, accountId, accountInfo, coopInfo, note, groupId };
        }
        return t;
      }));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        name,
        start,
        end,
        tags,
        accountId,
        accountInfo,
        coopInfo,
        note,
        groupId,
        logs: {},
      };
      setTasks((prev: Task[]) => [...prev, newTask]);
    }

    setShowModal(false);
  }, [historicalTags, setHistoricalTags, historicalGroups, setHistoricalGroups, setTasks]);

  const deleteTask = useCallback((id: string | number) => {
    setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
    setShowModal(false);
  }, [setTasks]);

  const deleteTagGlobally = useCallback((tagName: string) => {
    setTasks((prev: Task[]) => prev.map((t: Task) => ({
      ...t,
      tags: (t.tags || []).filter((tag: string | Tag) => {
        if (typeof tag === 'string') return tag !== tagName;
        return tag.name !== tagName;
      }),
      logs: Object.fromEntries(
        Object.entries(t.logs || {}).map(([date, val]) => {
          if (val === true) return [date, val];
          const { [tagName]: _, ...rest } = val as Record<string, number>;
          return [date, rest];
        })
      )
    })));
    setHistoricalTags((prev: string[]) => prev.filter((t: string) => t !== tagName));
  }, [setTasks, setHistoricalTags]);

  const ongoingTasks = useMemo(() => {
    return tasks.filter((t: Task) => {
      if (getStatus(t.start, t.end) !== "ongoing") return false;
      return taskMatchesSearch(t, nameFilter);
    });
  }, [tasks, nameFilter]);

  const upcomingTasks = useMemo(
    () => tasks
      .filter((t: Task) => {
        if (getStatus(t.start, t.end) !== "upcoming") return false;
        return taskMatchesSearch(t, nameFilter);
      })
      .sort((a: Task, b: Task) => {
        const aDays = getDaysUntilEnd(a.start);
        const bDays = getDaysUntilEnd(b.start);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      }),
    [tasks, nameFilter],
  );

  const allGroups = useMemo(() => {
    const groups = new Set(historicalGroups);
    ongoingTasks.forEach((t: Task) => {
      if (t.groupId) groups.add(t.groupId as string);
    });
    return Array.from(groups).sort();
  }, [historicalGroups, ongoingTasks]);

  const sortedOngoingTasks = useMemo(() => {
    const ungrouped = ongoingTasks.filter((t: Task) => !t.groupId);
    
    const groupMap: Record<string, Task[]> = {};
    allGroups.forEach(g => {
      groupMap[g] = [];
    });
    
    ongoingTasks.filter((t: Task) => t.groupId).forEach((t: Task) => {
      const g = t.groupId as string;
      if (groupMap[g]) groupMap[g].push(t);
    });
    
    let result: Task[] = [];
    allGroups.forEach(g => {
      result.push(...groupMap[g]);
    });
    result.push(...ungrouped);
    
    return result;
  }, [ongoingTasks, allGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setTasks((prev: Task[]) => {
        const oldIndex = prev.findIndex((t: Task) => t.id === active.id);
        const newIndex = prev.findIndex((t: Task) => t.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) return prev;
        
        let newTasks = [...prev];
        const activeTask = { ...newTasks[oldIndex] };
        const overTask = newTasks[newIndex];
        
        if (activeTask.groupId !== overTask.groupId) {
          activeTask.groupId = overTask.groupId;
        }
        
        newTasks[oldIndex] = activeTask;
        return arrayMove(newTasks, oldIndex, newIndex);
      });
    }
  }, [setTasks]);

  return (
    <div className="p-6 max-w-6xl mx-auto relative min-h-screen pb-24 font-sans selection:bg-gray-200">
      <div className="sticky top-0 z-10 bg-[#F9FAFB]/80 backdrop-blur-xl -mx-6 px-6 pt-6 pb-5 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-5">今天</h1>

        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="搜索名称、备注或标签…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-11 pr-11 py-3 text-[15px] rounded-2xl border border-gray-200/80 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder:text-gray-400"
          />
          {nameFilter && (
            <button
              onClick={() => setNameFilter("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext 
          items={sortedOngoingTasks.map((t: Task) => t.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allGroups.map(g => {
              const tasksInGroup = sortedOngoingTasks.filter(t => t.groupId === g);
              return (
                <React.Fragment key={`group-${g}`}>
                  <div className="col-span-full pt-4 pb-2 border-b border-gray-100 mb-2 flex items-center group">
                    <h2 className="text-[15px] font-bold text-gray-900 tracking-wide">{g}</h2>
                    <span className="ml-3 text-[12px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {tasksInGroup.length} 任务
                    </span>
                    {tasksInGroup.length === 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`确定删除空分组 "${g}" 吗？`)) {
                            setHistoricalGroups(prev => prev.filter(x => x !== g));
                          }
                        }}
                        className="ml-auto text-[12px] font-medium text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 bg-red-50 px-2 py-1 rounded-lg"
                      >
                        删除空分组
                      </button>
                    )}
                  </div>
                  {tasksInGroup.map(task => (
                    <SortableTaskItem 
                      key={task.id} 
                      task={task} 
                      toggleTask={toggleTask} 
                      toggleTag={toggleTag} 
                      openViewModal={openViewModal}
                      openEditModal={openEditModal} 
                    />
                  ))}
                  {tasksInGroup.length === 0 && (
                    <div className="col-span-full h-20 rounded-[20px] border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center text-[13px] text-gray-400 font-medium">
                      此分组暂无任务
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {(() => {
              const ungroupedTasks = sortedOngoingTasks.filter(t => !t.groupId);
              if (ungroupedTasks.length === 0 && allGroups.length === 0) return null;
              
              return (
                <React.Fragment key="group-ungrouped">
                  <div className="col-span-full pt-4 pb-2 border-b border-gray-100 mb-2 flex items-center">
                    <h2 className="text-[15px] font-bold text-gray-900 tracking-wide">未分组</h2>
                    <span className="ml-3 text-[12px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {ungroupedTasks.length} 任务
                    </span>
                  </div>
                  {ungroupedTasks.map(task => (
                    <SortableTaskItem 
                      key={task.id} 
                      task={task} 
                      toggleTask={toggleTask} 
                      toggleTag={toggleTag} 
                      openViewModal={openViewModal}
                      openEditModal={openEditModal} 
                    />
                  ))}
                </React.Fragment>
              );
            })()}
          </div>
        </SortableContext>
      </DndContext>

      {upcomingTasks.length > 0 && (
        <>
          <div className="px-1 mt-10 mb-3">
            <h1 className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">即将开始</h1>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task: Task) => (
              <UpcomingTaskItem 
                key={task.id} 
                task={task} 
                openViewModal={openViewModal}
                openEditModal={openEditModal} 
              />
            ))}
          </div>
        </>
      )}

      <button
        onClick={openAddModal}
        className="fixed bottom-8 right-6 w-14 h-14 bg-gray-900 text-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.16)] flex items-center justify-center hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] hover:bg-black transition-all duration-300 z-40 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
      </button>

      {showModal && (
        <TaskModal 
          task={editingTask}
          mode={modalMode}
          historicalTags={historicalTags}
          onSave={saveTask}
          onClose={closeModal}
          onDelete={deleteTask}
          onDeleteTag={deleteTagGlobally}
        />
      )}
    </div>
  );
}
