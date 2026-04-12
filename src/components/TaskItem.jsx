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
      className={`p-4 rounded-2xl shadow-sm border cursor-pointer flex justify-between items-center transition-all ${
        done ? "opacity-50 border-green-200 bg-green-50/30" : "bg-white border-gray-100"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-base font-medium ${done ? "line-through text-gray-500" : "text-gray-900"}`}>
          {task.name}
          {showReminder && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 align-middle">
              {daysUntilEnd === 0 ? "今天结束" : `仅剩 ${daysUntilEnd} 天`}
            </span>
          )}
        </div>
        
        {task.remark && (
          <div className="text-xs text-gray-500 mt-1">{task.remark}</div>
        )}

        {hasTags && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {task.tags.map((tagObj) => {
              const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
              const todayLog = task.logs[getToday()];
              const count = todayLog === true ? tag.max : (todayLog ? (todayLog[tag.name] || 0) : 0);
              const isMaxed = count >= tag.max;
              
              return (
                <button
                  key={tag.name}
                  onClick={(e) => toggleTag(task.id, tag.name, tag.max, e)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                    isMaxed
                      ? "bg-blue-500 text-white border-blue-500" 
                      : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                  }`}
                >
                  <span>{tag.name}</span>
                  {tag.max > 1 && (
                    <span className={`text-[10px] ${isMaxed ? "text-blue-100" : "text-blue-400"}`}>
                      {count}/{tag.max}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 pl-4">
        {!hasTags && (
          <button
            onClick={(e) => toggleTask(task.id, e)}
            aria-label={done ? "取消完成" : "标记完成"}
            className={`h-8 min-w-8 px-2 rounded-full border text-xs font-medium transition-colors ${
              done
                ? "border-green-500 bg-green-500 text-white"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {done ? "已完成" : "完成"}
          </button>
        )}
        <button 
          onClick={(e) => openEditModal(task, e)}
          className="text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
        >
          编辑
        </button>
        <div className="text-xl">
          {done ? "✅" : ""}
        </div>
      </div>
    </div>
  );
}
