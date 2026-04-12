import React from 'react';
import { getDaysUntilEnd } from '../utils/taskUtils';

export default function UpcomingTaskItem({ task, openViewModal, openEditModal }) {
  const daysUntilEnd = getDaysUntilEnd(task.end);
  const showReminder = daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd >= 0;

  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3 cursor-pointer transition-all hover:shadow-sm"
    >
      {/* Main Body: Tags (Moved to Top) */}
      <div className="" onClick={e => e.stopPropagation()}>
        {task.tags && task.tags.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {task.tags.map((tagObj) => {
              const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
              return (
                <div key={tag.name} className="px-3 py-2.5 rounded-xl bg-gray-200/50 text-gray-600 border border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium truncate pr-2">{tag.name}</span>
                  {tag.max > 1 && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-500">
                      x{tag.max}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Header section: Title, Reminder, Remark, and Edit button (Moved to Bottom) */}
      <div className="flex justify-between items-start w-full">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="text-base font-medium text-gray-700 truncate">
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
            className="text-gray-400 hover:text-gray-600 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
