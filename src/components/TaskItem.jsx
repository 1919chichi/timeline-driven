import React from 'react';
import { getToday, isDoneToday } from '../utils/taskUtils';

export default function TaskItem({ task, toggleTask, toggleTag, openEditModal }) {
  const done = isDoneToday(task);

  return (
    <div
      onClick={(e) => {
        if (!task.tags || task.tags.length === 0) {
          toggleTask(task.id, e);
        }
      }}
      className={`p-4 rounded-2xl shadow-sm border ${
        (!task.tags || task.tags.length === 0) ? "cursor-pointer" : ""
      } flex justify-between items-center transition-all ${
        done ? "opacity-50 border-green-200 bg-green-50/30" : "bg-white border-gray-100"
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <div className={`text-base font-medium ${done ? "line-through text-gray-500" : "text-gray-900"}`}>
            {task.name}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {task.tags.map((tagObj) => {
                const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
                const todayLog = task.logs[getToday()];
                const count = todayLog === true ? tag.max : (todayLog ? (todayLog[tag.name] || 0) : 0);
                const isMaxed = count >= tag.max;
                
                return (
                  <button
                    key={tag.name}
                    onClick={(e) => toggleTag(task.id, tag.name, tag.max, e)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                      isMaxed
                        ? "bg-blue-500 text-white border-blue-500" 
                        : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                    }`}
                  >
                    {tag.name}
                    {tag.max > 1 && (
                      <span className="opacity-80">
                        {count}/{tag.max}
                      </span>
                    )}
                  </button>
                );
              })}
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
      
      <div className="flex items-center gap-3 pl-4">
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
