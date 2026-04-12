import React, { useState, useCallback, useMemo, useEffect } from "react";
import { getToday, getStatus, isDoneToday, normalizeTags, hasAnyProgressToday, getCompletionRate, getDaysUntilEnd } from "./utils/taskUtils";
import { useLocalStorage } from "./hooks/useLocalStorage";
import TaskItem from "./components/TaskItem";
import UpcomingTaskItem from "./components/UpcomingTaskItem";
import TaskModal from "./components/TaskModal";
import SortableTaskItem from "./components/SortableTaskItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

export default function TodayPage() {
  const [tasks, setTasks] = useLocalStorage("timetrackr_tasks", []);
  const [historicalTags, setHistoricalTags] = useLocalStorage("timetrackr_historical_tags", []);

  const [nameFilter, setNameFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const toggleTask = useCallback((id, e) => {
    if (e) e.stopPropagation();
    const today = getToday();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        const done = isDoneToday(t);

        if (done) {
          delete newLogs[today];
        } else {
          const tags = normalizeTags(t.tags);
          if (tags.length > 0) {
            const todayLog = {};
            tags.forEach(tag => {
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

  const toggleTag = useCallback((id, tagName, maxCount, e) => {
    if (e) e.stopPropagation();
    const today = getToday();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        let todayLog = newLogs[today];
        
        if (todayLog === true) {
            const tags = normalizeTags(t.tags);
            todayLog = {};
            tags.forEach(tag => {
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

  const openModal = useCallback((task, mode, e) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setModalMode(mode);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((task, e) => openModal(task, "edit", e), [openModal]);
  const openViewModal = useCallback((task, e) => openModal(task, "view", e), [openModal]);

  const openAddModal = useCallback(() => {
    setEditingTask(null);
    setModalMode("create");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => setShowModal(false), []);

  const saveTask = useCallback((taskData) => {
    const { id, name, start, end, tags, accountId, accountInfo, coopInfo, note } = taskData;
    
    const newHistory = new Set(historicalTags);
    tags.forEach(t => newHistory.add(t.name));
    setHistoricalTags(Array.from(newHistory));

    if (id) {
      setTasks((prev) => prev.map(t => {
        if (t.id === id) {
          return { ...t, name, start, end, tags, accountId, accountInfo, coopInfo, note };
        }
        return t;
      }));
    } else {
      const newTask = {
        id: Date.now(),
        name,
        start,
        end,
        tags,
        accountId,
        accountInfo,
        coopInfo,
        note,
        logs: {},
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setShowModal(false);
  }, [historicalTags, setHistoricalTags, setTasks]);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setShowModal(false);
  }, [setTasks]);

  const deleteTagGlobally = useCallback((tagName) => {
    setTasks(prev => prev.map(t => ({
      ...t,
      tags: (t.tags || []).filter(tag => tag.name !== tagName),
      logs: Object.fromEntries(
        Object.entries(t.logs || {}).map(([date, val]) => {
          if (val === true) return [date, val];
          const { [tagName]: _, ...rest } = val;
          return [date, rest];
        })
      )
    })));
    setHistoricalTags(prev => prev.filter(t => t !== tagName));
  }, [setTasks, setHistoricalTags]);

  const ongoingTasks = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();
    return tasks.filter((t) => {
      if (getStatus(t.start, t.end) !== "ongoing") return false;
      if (keyword && !t.name.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [tasks, nameFilter]);

  const upcomingTasks = useMemo(
    () => tasks
      .filter((t) => {
        if (getStatus(t.start, t.end) !== "upcoming") return false;
        const keyword = nameFilter.trim().toLowerCase();
        if (keyword && !t.name.toLowerCase().includes(keyword)) return false;
        return true;
      })
      .sort((a, b) => {
        const aDays = getDaysUntilEnd(a.start);
        const bDays = getDaysUntilEnd(b.start);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      }),
    [tasks, nameFilter],
  );

  const sortedOngoingTasks = useMemo(() => {
    // Preserve manual sorting order from tasks array
    return ongoingTasks;
  }, [ongoingTasks]);

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

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setTasks((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
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
            placeholder="搜索任务名称…"
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
          items={sortedOngoingTasks.map(t => t.id)}
          strategy={rectSortingStrategy}
        >
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {sortedOngoingTasks.map((task) => (
              <SortableTaskItem 
                key={task.id} 
                task={task} 
                toggleTask={toggleTask} 
                toggleTag={toggleTag} 
                openViewModal={openViewModal}
                openEditModal={openEditModal} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {upcomingTasks.length > 0 && (
        <>
          <div className="px-1 mt-10 mb-3">
            <h1 className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">即将开始</h1>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
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
