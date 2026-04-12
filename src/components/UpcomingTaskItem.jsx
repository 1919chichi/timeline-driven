import React from 'react';
import { getDaysUntilEnd } from '../utils/taskUtils';

export default function UpcomingTaskItem({ task, openViewModal, openEditModal }) {
  const daysUntilEnd = getDaysUntilEnd(task.end);
  const showReminder = daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd >= 0;

  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className="p-4 rounded-2xl border border-gray-100 bg-gray-50 opacity-70 flex justify-between items-center cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium text-gray-700">
          {task.name}
          {showReminder && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 align-middle">
              {daysUntilEnd === 0 ? "今天结束" : `仅剩 ${daysUntilEnd} 天`}
            </span>
          )}
        </div>
        
        {task.remark && <div className="text-xs text-gray-500 mt-1">{task.remark}</div>}

        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {task.tags.map((tagObj) => {
              const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
              return (
                <span key={tag.name} className="text-[11px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-gray-200">
                  <span>{tag.name}</span>
                  {tag.max > 1 && <span className="text-[10px] text-gray-400">x{tag.max}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>
      
      <button 
        onClick={(e) => openEditModal(task, e)}
        className="text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors pl-4"
      >
        编辑
      </button>
    </div>
  );
}
