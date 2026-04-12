import React from 'react';
import { getDaysUntilEnd } from '../utils/taskUtils';

export default function UpcomingTaskItem({ task, openViewModal, openEditModal }) {
  const infoTags = [task.accountId, task.accountInfo, task.coopInfo].filter(Boolean);
  const hasTags = task.tags && task.tags.length > 0;
  const daysUntilEnd = getDaysUntilEnd(task.end);
  const showReminder = daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd >= 0;

  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className="p-5 rounded-[22px] border border-gray-200/50 bg-white/50 backdrop-blur-sm flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-gray-300/50 group/card"
    >
      {/* Main Body: Tags (Moved to Top) */}
      <div className="" onClick={e => e.stopPropagation()}>
        {hasTags && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(task.tags || []).map((tagObj) => {
              const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
              return (
                <div key={tag.name} className="px-4 py-3.5 rounded-[16px] bg-gray-50/80 text-gray-500 border border-gray-100 flex items-center justify-between">
                  <span className="text-[14px] font-medium truncate pr-2">{tag.name}</span>
                  {tag.max > 1 && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-200/50 text-gray-500">
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
      <div className="flex justify-between items-start w-full px-1">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center flex-wrap gap-2.5">
            <h3 className="text-[16px] font-semibold tracking-tight text-gray-600 truncate">
              {task.name}
            </h3>
            {infoTags.map((info, idx) => (
              <span key={`info-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200/50 whitespace-nowrap">
                {info}
              </span>
            ))}
            {showReminder && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 whitespace-nowrap">
                {daysUntilEnd === 0 ? "今天结束" : `仅剩 ${daysUntilEnd} 天`}
              </span>
            )}
          </div>
          
          {task.remark && (
            <div className="text-[13px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
              {task.remark}
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