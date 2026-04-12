import React, { useState } from "react";
import { getToday, getStatus, isDoneToday } from "./utils/taskUtils";
import { useLocalStorage } from "./hooks/useLocalStorage";
import TaskItem from "./components/TaskItem";
import UpcomingTaskItem from "./components/UpcomingTaskItem";
import TaskModal from "./components/TaskModal";

export default function TodayPage() {
  const [groups, setGroups] = useLocalStorage("timetrackr_groups", []);
  const [tasks, setTasks] = useLocalStorage("timetrackr_tasks", []);
  const [historicalTags, setHistoricalTags] = useLocalStorage("timetrackr_historical_tags", []);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const toggleTask = (id, e) => {
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
          const tags = (t.tags || []).map(tag => typeof tag === 'string' ? { name: tag, max: 1 } : tag);
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
  };

  const toggleTag = (id, tagName, maxCount, e) => {
    if (e) e.stopPropagation();
    const today = getToday();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        let todayLog = newLogs[today];
        
        if (todayLog === true) {
            const tags = (t.tags || []).map(tag => typeof tag === 'string' ? { name: tag, max: 1 } : tag);
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
  };

  const openEditModal = (task, e) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setModalMode("edit");
    setShowModal(true);
  };

  const openViewModal = (task, e) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setModalMode("view");
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setModalMode("create");
    setShowModal(true);
  };

  const saveTask = (taskData) => {
    const { id, name, group, start, end, tags, remark, isNewGroup } = taskData;
    
    if (isNewGroup && !groups.includes(group)) {
      setGroups((prev) => [...prev, group]);
    }

    const newHistory = new Set(historicalTags);
    tags.forEach(t => newHistory.add(t.name));
    setHistoricalTags(Array.from(newHistory));

    if (id) {
      setTasks((prev) => prev.map(t => {
        if (t.id === id) {
          return { ...t, name, group, start, end, tags, remark };
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
        remark,
        logs: {},
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setShowModal(false);
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setShowModal(false);
  };

  const ongoingTasks = tasks.filter(
    (t) => getStatus(t.start, t.end) === "ongoing",
  );
  const upcomingTasks = tasks.filter(
    (t) => getStatus(t.start, t.end) === "upcoming",
  );

  return (
    <div className="p-6 max-w-md mx-auto relative min-h-screen pb-24">
      <h1 className="text-2xl font-bold mb-4">今天（进行中）</h1>

      {groups.map((group) => {
        const groupTasks = ongoingTasks.filter((t) => t.group === group);
        if (groupTasks.length === 0) return null;

        return (
          <div key={group} className="mb-6">
            <h2 className="text-lg font-semibold mb-2">{group}</h2>
            <div className="space-y-3">
              {groupTasks.map((task) => (
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
          </div>
        );
      })}

      {upcomingTasks.length > 0 && (
        <>
          <h1 className="text-xl font-bold mt-8 mb-4 text-gray-700">即将开始</h1>
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
        className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        ＋
      </button>

      {showModal && (
        <TaskModal 
          task={editingTask}
          mode={modalMode}
          groups={groups}
          historicalTags={historicalTags}
          onSave={saveTask}
          onClose={() => setShowModal(false)}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
