import { useState, useEffect } from "react";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getStatus(start, end) {
  const today = getToday();
  if (start && today < start) return "upcoming";
  if (end && today > end) return "finished";
  return "ongoing";
}

export default function TodayPage() {
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem("timetrackr_groups");
    return saved ? JSON.parse(saved) : ["健康", "学习", "游戏代肝"];
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("timetrackr_tasks");
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: "少年游",
        group: "游戏代肝",
        start: "2026-03-24",
        end: "2026-04-24",
        tags: ["协战", "勾协", "寄养"],
        remark: "#359697 | 春区酪酪 | 邮箱",
        logs: {},
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem("timetrackr_groups", JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem("timetrackr_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("游戏代肝");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  // 新增的数据字段
  const [tagsInput, setTagsInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState("");

  const toggleTask = (id) => {
    const today = getToday();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        if (newLogs[today]) {
          delete newLogs[today]; // 如果已经有则删除
        } else {
          newLogs[today] = true; // 否则设为完成
        }

        return { ...t, logs: newLogs };
      }),
    );
  };

  const isDoneToday = (task) => {
    const today = getToday();
    return !!task.logs[today];
  };

  const addTask = () => {
    if (!newName.trim()) return;

    let finalGroup = newGroup;

    if (creatingGroup && newGroupName.trim()) {
      finalGroup = newGroupName;
      if (!groups.includes(newGroupName)) {
        setGroups((prev) => [...prev, newGroupName]);
      }
    }

    // 解析 tags（逗号分隔）
    const tags = tagsInput
      .split(/[,，+]/)
      .map((t) => t.trim())
      .filter((t) => t);

    const newTask = {
      id: Date.now(),
      name: newName,
      group: finalGroup,
      start: startDate,
      end: endDate,
      tags,
      remark: remarkInput,
      logs: {},
    };

    setTasks((prev) => [...prev, newTask]);

    // 重置表单
    setNewName("");
    setTagsInput("");
    setRemarkInput("");
    setNewGroup(groups[0] || "游戏代肝");
    setNewGroupName("");
    setCreatingGroup(false);
    setStartDate(getToday());
    setEndDate("");
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
              {groupTasks.map((task) => {
                const done = isDoneToday(task);

                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-4 rounded-2xl shadow-sm border cursor-pointer flex justify-between items-center transition-all ${
                      done ? "opacity-50 border-green-200 bg-green-50/30" : "bg-white border-gray-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`text-base font-medium ${done ? "line-through text-gray-500" : "text-gray-900"}`}>
                          {task.name}
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-1">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {task.remark && (
                        <div className="text-xs text-gray-500 mt-1">{task.remark}</div>
                      )}
                      
                      <div className="text-[11px] text-gray-400 mt-1.5 font-mono">
                        {task.start} 开始 {task.end ? `至 ${task.end}` : ""}
                      </div>
                    </div>
                    
                    <div className="text-xl pl-4">
                      {done ? "✅" : "⭕"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {upcomingTasks.length > 0 && (
        <>
          <h1 className="text-xl font-bold mt-8 mb-4 text-gray-700">即将开始</h1>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 opacity-70">
                <div className="flex items-center gap-2">
                  <div className="text-base font-medium text-gray-700">{task.name}</div>
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {task.remark && <div className="text-xs text-gray-500 mt-1">{task.remark}</div>}
                <div className="text-[11px] text-gray-400 mt-1.5 font-mono">{task.start} 计划开始</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        ＋
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-[90%] max-w-sm shadow-2xl space-y-4">
            <h2 className="text-xl font-bold mb-2">新建任务 (如: 游戏账号)</h2>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">游戏ID / 任务名称</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如: 少年游"
                className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm transition-colors bg-gray-50 rounded-t"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">任务类型标签 (G列内容)</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如: 协战+勾协+寄养"
                className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm transition-colors bg-gray-50 rounded-t"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">账号详情 (数字id/小号/账号)</label>
              <input
                value={remarkInput}
                onChange={(e) => setRemarkInput(e.target.value)}
                placeholder="例如: #359697 | 春区酪酪 | 邮箱"
                className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm transition-colors bg-gray-50 rounded-t"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">分组</label>
              {!creatingGroup ? (
                <select
                  value={newGroup}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCreatingGroup(true);
                    } else {
                      setNewGroup(e.target.value);
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                >
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__new__">+ 新建分组...</option>
                </select>
              ) : (
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="输入新分组名"
                  className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm bg-gray-50 rounded-t"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">结束日期 (选填)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreatingGroup(false);
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                取消
              </button>
              <button 
                onClick={addTask} 
                className="px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800"
              >
                确定添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
