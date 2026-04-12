import React, { useState, useCallback, useMemo, useEffect } from "react";
import { getToday, getStatus, isDoneToday, normalizeTags, hasAnyProgressToday, getCompletionRate, getDaysUntilEnd } from "./utils/taskUtils";
import { useLocalStorage } from "./hooks/useLocalStorage";
import TaskItem from "./components/TaskItem";
import UpcomingTaskItem from "./components/UpcomingTaskItem";
import TaskModal from "./components/TaskModal";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableGroup from "./components/SortableGroup";

export default function TodayPage() {
  const [groups, setGroups] = useLocalStorage("timetrackr_groups", []);
  const [tasks, setTasks] = useLocalStorage("timetrackr_tasks", []);
  const [historicalTags, setHistoricalTags] = useLocalStorage("timetrackr_historical_tags", []);

  const [nameFilter, setNameFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const [deletingGroup, setDeletingGroup] = useState(null);
  const [deleteGroupAction, setDeleteGroupAction] = useState("move");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState("");

  useEffect(() => {
    if (!deletingGroup) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setDeletingGroup(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deletingGroup]);

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
    const { id, name, group, start, end, tags, accountId, accountInfo, coopInfo, note, isNewGroup } = taskData;
    
    if (isNewGroup && !groups.includes(group)) {
      setGroups((prev) => [...prev, group]);
    }

    const newHistory = new Set(historicalTags);
    tags.forEach(t => newHistory.add(t.name));
    setHistoricalTags(Array.from(newHistory));

    if (id) {
      setTasks((prev) => prev.map(t => {
        if (t.id === id) {
          return { ...t, name, group, start, end, tags, accountId, accountInfo, coopInfo, note };
        }
        return t;
      }));
    } else {
      const newTask = {
        id: Date.now(),
        name,
        group,
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
  }, [groups, historicalTags, setGroups, setHistoricalTags, setTasks]);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setShowModal(false);
  }, [setTasks]);

  const openDeleteGroupModal = useCallback((groupName) => {
    const otherGroups = groups.filter(g => g !== groupName);
    setDeleteGroupAction(otherGroups.length > 0 ? "move" : "delete");
    setDeleteGroupTarget(otherGroups[0] || "");
    setDeletingGroup(groupName);
  }, [groups]);

  const handleDeleteGroup = useCallback(() => {
    if (!deletingGroup) return;
    if (deleteGroupAction === "move" && deleteGroupTarget) {
      setTasks(prev => prev.map(t => t.group === deletingGroup ? { ...t, group: deleteGroupTarget } : t));
    } else {
      setTasks(prev => prev.filter(t => t.group !== deletingGroup));
    }
    setGroups(prev => prev.filter(g => g !== deletingGroup));
    setDeletingGroup(null);
  }, [deletingGroup, deleteGroupAction, deleteGroupTarget, setTasks, setGroups]);

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

  const sortedOngoingByGroup = useMemo(() => {
    const result = {};
    groups.forEach(group => {
      const groupTasks = ongoingTasks.filter((t) => t.group === group);
      if (groupTasks.length === 0) return;
      result[group] = [...groupTasks].sort((a, b) => {
        const aStarted = hasAnyProgressToday(a);
        const bStarted = hasAnyProgressToday(b);
        if (aStarted !== bStarted) return aStarted ? 1 : -1;

        const aRate = getCompletionRate(a);
        const bRate = getCompletionRate(b);
        if (aRate !== bRate) return aRate - bRate;

        const aDays = getDaysUntilEnd(a.end);
        const bDays = getDaysUntilEnd(b.end);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      });
    });
    return result;
  }, [groups, ongoingTasks]);

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
      setGroups((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, [setGroups]);

  return (
    <div className="p-6 max-w-md mx-auto relative min-h-screen pb-24 font-sans selection:bg-gray-200">
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups} strategy={verticalListSortingStrategy}>
          {groups.map((group) => {
            const sortedGroupTasks = sortedOngoingByGroup[group];
            if (!sortedGroupTasks) return null;

            return (
              <SortableGroup key={group} id={group}>
                {({ attributes, listeners, isDragging }) => (
                  <>
                    <div className="flex items-center justify-between mb-3 px-1 group/header">
                      <div className="flex items-center gap-1.5">
                        <div
                          {...attributes}
                          {...listeners}
                          className="cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center justify-center p-1 -ml-1 rounded hover:bg-gray-100"
                          title="拖动排序"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                          </svg>
                        </div>
                        <h2 className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">{group}</h2>
                      </div>
                      <button
                        onClick={() => openDeleteGroupModal(group)}
                        className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="删除分组"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className={`space-y-3 ${isDragging ? 'pointer-events-none' : ''}`}>
                      {sortedGroupTasks.map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          toggleTask={toggleTask} 
                          toggleTag={toggleTag} 
                          openViewModal={openViewModal}
                          openEditModal={openEditModal} 
                        />
                      ))}
                    </div>
                  </>
                )}
              </SortableGroup>
            );
          })}
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
          groups={groups}
          historicalTags={historicalTags}
          onSave={saveTask}
          onClose={closeModal}
          onDelete={deleteTask}
          onDeleteTag={deleteTagGlobally}
        />
      )}

      {deletingGroup && (() => {
        const otherGroups = groups.filter(g => g !== deletingGroup);
        const taskCount = tasks.filter(t => t.group === deletingGroup).length;
        return (
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onMouseDown={() => setDeletingGroup(null)}
          >
            <div 
              className="bg-white p-7 rounded-3xl w-full max-w-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold">删除分组「{deletingGroup}」</h2>
              {taskCount > 0 && (
                <p className="text-sm text-gray-500">该分组下有 {taskCount} 个任务，请选择处理方式：</p>
              )}

              {otherGroups.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteGroupAction"
                    value="move"
                    checked={deleteGroupAction === "move"}
                    onChange={() => setDeleteGroupAction("move")}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">移到其他分组</span>
                    {deleteGroupAction === "move" && (
                      <select
                        value={deleteGroupTarget}
                        onChange={(e) => setDeleteGroupTarget(e.target.value)}
                        className="mt-1.5 w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                      >
                        {otherGroups.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteGroupAction"
                  value="delete"
                  checked={deleteGroupAction === "delete"}
                  onChange={() => setDeleteGroupAction("delete")}
                />
                <span className="text-sm font-medium text-red-600">
                  {taskCount > 0 ? `同时删除 ${taskCount} 个任务` : "删除分组"}
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setDeletingGroup(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
