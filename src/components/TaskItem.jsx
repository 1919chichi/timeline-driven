import React from 'react';
import { getToday, isDoneToday, getDaysUntilEnd } from '../utils/taskUtils';

export default function TaskItem({ task, toggleTask, toggleTag, openViewModal, openEditModal }) {
  const done = isDoneToday(task);
  const hasTags = task.tags && task.tags.length > 0;
  const daysUntilEnd = getDaysUntilEnd(task.end);
  const showReminder = !done && daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd >= 0;

  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className={`p-4 rounded-2xl shadow-sm border cursor-pointer flex flex-col gap-3 transition-all ${
        done ? "opacity-50 border-green-200 bg-green-50/30" : "bg-white border-gray-100 hover:shadow-md"
      }`}
    >
      {/* Main Body: Tags / Actions (Moved to Top) */}
      <div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        {hasTags ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {task.tags.map((tagObj) => {
              const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
              const todayLog = task.logs[getToday()];
              const count = todayLog === true ? tag.max : (todayLog ? (todayLog[tag.name] || 0) : 0);
              const isMaxed = count >= tag.max;
              
              return (
                <button
                  key={tag.name}
                  onClick={(e) => toggleTag(task.id, tag.name, tag.max, e)}
                  className={`px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isMaxed
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20" 
                      : "bg-blue-50/50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200"
                  }`}
                >
                  <span className="text-sm font-medium truncate pr-2">{tag.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {tag.max > 1 && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                        isMaxed ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                      }`}>
                        {count} / {tag.max}
                      </span>
                    )}
                    {isMaxed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
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
              className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                done
                  ? "border-green-500 bg-green-500 text-white shadow-sm shadow-green-500/20"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              {done ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  已完成
                </>
              ) : "标记完成"}
            </button>
          </div>
        )}
      </div>

      {/* Header section: Title, Reminder, Remark, and Edit button (Moved to Bottom) */}
      <div className="flex justify-between items-start w-full">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className={`text-base font-semibold ${done ? "line-through text-gray-500" : "text-gray-900"} truncate`}>
              {task.name}
            </h3>
            {showReminder && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 whitespace-nowrap">
                {daysUntilEnd === 0 ? "今天结束" : `仅剩 ${daysUntilEnd} 天`}
              </span>
            )}
          </div>
          
          {(task.remark || task.accountId || task.accountInfo || task.coopInfo) && (
            <div className="text-xs text-gray-500 mt-1.5 line-clamp-2">
              {task.remark || [task.accountId, task.accountInfo, task.coopInfo].filter(Boolean).join(" | ")}
            </div>
          )}
        </div>
        
        <div className="flex items-center shrink-0 pt-0.5">
          <button 
            onClick={(e) => openEditModal(task, e)}
            className="text-gray-400 hover:text-blue-500 text-xs font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
