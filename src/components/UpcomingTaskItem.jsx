import React from 'react';

export default function UpcomingTaskItem({ task, openViewModal, openEditModal }) {
  return (
    <div
      onClick={(e) => openViewModal(task, e)}
      className="p-4 rounded-2xl border border-gray-100 bg-gray-50 opacity-70 flex justify-between items-center cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-gray-700">{task.name}</div>
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {task.tags.map((tagObj) => {
                const tag = typeof tagObj === 'string' ? { name: tagObj, max: 1 } : tagObj;
                return (
                  <span key={tag.name} className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                    {tag.name}
                    {tag.max > 1 && <span className="opacity-80">x{tag.max}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {task.remark && <div className="text-xs text-gray-500 mt-1">{task.remark}</div>}
        <div className="text-[11px] text-gray-400 mt-1.5 font-mono">{task.start} 计划开始</div>
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
