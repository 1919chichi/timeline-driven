import React from "react";
import { getToday, isDoneToday, getDaysUntilEnd } from "../utils/taskUtils";
import { Task } from "../types";

interface TaskItemProps {
  task: Task;
  toggleTask: (taskId: string | number, e: React.MouseEvent) => void;
  toggleTag: (taskId: string | number, tagName: string, maxCount: number, e: React.MouseEvent) => void;
  openViewModal: (task: Task, e: React.MouseEvent) => void;
  openEditModal: (task: Task, e: React.MouseEvent) => void;
}

export default function TaskItem({
  task,
  toggleTask,
  toggleTag,
  openViewModal,
  openEditModal,
}: TaskItemProps) {
  const done = isDoneToday(task);
  const infoTags = [task.accountId, task.accountInfo, task.coopInfo].filter(
    Boolean,
  ) as string[];
  const hasTags = task.tags && task.tags.length > 0;
  const daysUntilEnd = getDaysUntilEnd(task.end);
  const showReminder =
    !done && daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd >= 0;

  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className={`p-5 rounded-[22px] border cursor-pointer flex flex-col gap-4 transition-all duration-300 group/card ${
        done
          ? "opacity-60 border-green-200/60 bg-[#F0FDF4]/40"
          : "bg-white border-gray-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.06)] hover:border-gray-300/60 hover:-translate-y-0.5"
      }`}
    >
      {/* Main Body: Tags / Actions (Moved to Top) */}
      <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        {hasTags ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(task.tags || []).map((tagObj) => {
              const tag =
                typeof tagObj === "string" ? { name: tagObj, max: 1 } : tagObj;
              const todayLog = task.logs[getToday()];
              const count =
                todayLog === true
                  ? tag.max
                  : todayLog
                    ? todayLog[tag.name] || 0
                    : 0;
              const isMaxed = count >= tag.max;

              return (
                <button
                  key={tag.name}
                  onClick={(e) => toggleTag(task.id, tag.name, tag.max, e)}
                  className={`px-4 py-3.5 rounded-[16px] border transition-all duration-300 flex items-center justify-between active:scale-95 ${
                    isMaxed
                      ? "bg-gray-900 text-white border-gray-900 shadow-[0_4px_14px_rgb(0,0,0,0.15)]"
                      : "bg-gray-50/50 text-gray-700 border-gray-200/80 hover:bg-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-[14px] font-medium truncate pr-2">
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {tag.max > 1 && (
                      <span
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                          isMaxed
                            ? "bg-white/20 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {count} / {tag.max}
                      </span>
                    )}
                    {isMaxed && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={(e) => toggleTask(task.id, e)}
              aria-label={done ? "取消完成" : "标记完成"}
              className={`w-full py-3.5 rounded-[16px] border text-[14px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
                done
                  ? "border-green-500 bg-green-500 text-white shadow-[0_4px_14px_rgb(34,197,94,0.3)]"
                  : "border-gray-200/80 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {done ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  已完成
                </>
              ) : (
                "标记完成"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Header section: Title, Reminder, Remark, and Edit button (Moved to Bottom) */}
      <div className="flex justify-between items-start w-full px-1">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2.5">
            <h3
              className={`text-[16px] font-semibold tracking-tight transition-colors duration-300 ${done ? "line-through text-gray-400" : "text-gray-900"} truncate`}
            >
              {task.name}
            </h3>
            {showReminder && (
              <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 whitespace-nowrap">
                {daysUntilEnd === 0 ? "今天结束" : `仅剩 ${daysUntilEnd} 天`}
              </span>
            )}
          </div>

          {infoTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {infoTags.map((info, idx) => (
                <span
                  key={`info-${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200/60 whitespace-nowrap"
                >
                  {info}
                </span>
              ))}
            </div>
          )}

          {task.note && (
            <div className="text-[13px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
              {task.note}
            </div>
          )}
        </div>

        <div className="flex items-center shrink-0">
          <button
            onClick={(e) => openEditModal(task, e)}
            className="opacity-0 group-hover/card:opacity-100 text-gray-400 hover:text-gray-900 text-[13px] font-medium px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-300"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
