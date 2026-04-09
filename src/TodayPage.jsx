import { useState } from "react";

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
  const [groups, setGroups] = useState(["健康", "学习", "工作"]);

  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: "协战A",
      group: "工作",
      start: "2026-03-24",
      end: "2026-04-02",
      logs: {},
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("健康");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toggleTask = (id) => {
    const today = getToday();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const newLogs = { ...t.logs };
        newLogs[today] = !newLogs[today];

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

    const newTask = {
      id: Date.now(),
      name: newName,
      group: finalGroup,
      start: startDate,
      end: endDate,
      logs: {},
    };

    setTasks((prev) => [...prev, newTask]);

    setNewName("");
    setNewGroup(groups[0] || "健康");
    setNewGroupName("");
    setCreatingGroup(false);
    setStartDate("");
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
    <div className="p-6 max-w-md mx-auto relative">
      <h1 className="text-2xl font-bold mb-4">今天（进行中）</h1>

      {groups.map((group) => (
        <div key={group} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{group}</h2>
          <div className="space-y-2">
            {ongoingTasks
              .filter((t) => t.group === group)
              .map((task) => {
                const done = isDoneToday(task);

                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-3 rounded-xl shadow cursor-pointer flex justify-between items-center ${
                      done ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <div>
                      <div>{task.name}</div>
                      <div className="text-xs text-gray-400">
                        {task.start} ~ {task.end}
                      </div>
                    </div>
                    <span>{done ? "✔️" : "⭕"}</span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <h1 className="text-xl font-bold mt-6 mb-2">即将开始</h1>
      <div className="space-y-2">
        {upcomingTasks.map((task) => (
          <div key={task.id} className="p-3 rounded-xl shadow opacity-60">
            <div>{task.name}</div>
            <div className="text-xs text-gray-400">{task.start} 开始</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg text-2xl"
      >
        ＋
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl w-80 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">新建阶段任务</h2>

            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="任务名"
              className="w-full border rounded-lg p-2"
            />

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
                className="w-full border rounded-lg p-2"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__new__">+ 新建分组</option>
              </select>
            ) : (
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入新分组名"
                className="w-full border rounded-lg p-2"
              />
            )}

            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div className="text-sm text-gray-500">在该时间段内每天打卡</div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreatingGroup(false);
                }}
                className="px-3 py-1"
              >
                取消
              </button>
              <button onClick={addTask} className="px-3 py-1 rounded-lg">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
