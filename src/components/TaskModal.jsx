import React, { useState, useEffect } from 'react';
import { getToday } from '../utils/taskUtils';

export default function TaskModal({ 
  task, 
  mode = "create",
  groups, 
  historicalTags, 
  onSave, 
  onClose, 
  onDelete,
  onDeleteTag
}) {
  const defaultGroup = groups[0] || "";
  const isViewMode = mode === "view";
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState(defaultGroup);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [formError, setFormError] = useState("");
  
  const [modalTags, setModalTags] = useState([]);
  const [tagInputValue, setTagInputValue] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [pendingDeleteTag, setPendingDeleteTag] = useState(null);
  const [remarkInput, setRemarkInput] = useState("");

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState("");

  const sectionLabelClassName = "text-xs font-medium text-gray-500 mb-1 block";
  const readOnlyValueClassName = "w-full min-h-[42px] p-2 text-sm bg-gray-50 rounded-xl text-gray-900";

  useEffect(() => {
    if (task) {
      setNewName(task.name);
      const parsedTags = (task.tags || []).map(t => {
        if (typeof t === 'string') return { name: t, max: 1 };
        return { ...t };
      });
      setModalTags(parsedTags);
      setRemarkInput(task.remark || "");
      setNewGroup(task.group || defaultGroup);
      setStartDate(task.start || getToday());
      setEndDate(task.end || "");
      setCreatingGroup(groups.length === 0);
      setNewGroupName(groups.length === 0 ? (task.group || "") : "");
    } else {
      setNewName("");
      setModalTags([]);
      setRemarkInput("");
      setNewGroup(defaultGroup);
      setStartDate(getToday());
      setEndDate("");
      setCreatingGroup(groups.length === 0);
      setNewGroupName("");
    }
    setFormError("");
  }, [task, groups, defaultGroup]);

  const startCreatingGroup = () => {
    setCreatingGroup(true);
    setNewGroupName("");
    setFormError("");
  };

  const stopCreatingGroup = () => {
    setCreatingGroup(false);
    setNewGroupName("");
    setFormError("");
  };

  const handleSave = () => {
    const trimmedName = newName.trim();
    const trimmedGroupName = newGroupName.trim();
    const shouldUseNewGroup = creatingGroup || groups.length === 0;

    if (!trimmedName) {
      setFormError("请先填写任务名称");
      return;
    }

    const finalGroup = shouldUseNewGroup ? trimmedGroupName : newGroup;
    if (!finalGroup) {
      setFormError("请先选择或输入分组");
      return;
    }

    let finalTags = [...modalTags];
    if (tagInputValue.trim()) {
      const name = tagInputValue.trim();
      const existing = finalTags.find(t => t.name === name);
      if (existing) {
        existing.max += 1;
      } else {
        finalTags.push({ name, max: 1 });
      }
    }

    onSave({
      id: task ? task.id : null,
      name: trimmedName,
      group: finalGroup,
      start: startDate,
      end: endDate,
      tags: finalTags,
      remark: remarkInput,
      isNewGroup: shouldUseNewGroup && !groups.includes(finalGroup)
    });
  };

  if (isViewMode) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-3xl w-[90%] max-w-sm shadow-2xl space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">任务详情</h2>
          </div>

          <div>
            <label className={sectionLabelClassName}>游戏ID / 任务名称</label>
            <div className={readOnlyValueClassName}>{newName || "-"}</div>
          </div>

          <div>
            <label className={sectionLabelClassName}>任务类型标签</label>
            <div className={`${readOnlyValueClassName} flex flex-wrap gap-1.5`}>
              {modalTags.length > 0 ? (
                modalTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                  >
                    {tag.name}
                    {tag.max > 1 ? ` ${tag.max}` : ""}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>

          <div>
            <label className={sectionLabelClassName}>账号详情 (数字id/小号/账号)</label>
            <div className={readOnlyValueClassName}>{remarkInput || "-"}</div>
          </div>

          <div>
            <label className={sectionLabelClassName}>分组</label>
            <div className={readOnlyValueClassName}>{newGroup || newGroupName || "-"}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={sectionLabelClassName}>开始日期</label>
              <div className={readOnlyValueClassName}>{startDate || "-"}</div>
            </div>
            <div>
              <label className={sectionLabelClassName}>结束日期</label>
              <div className={readOnlyValueClassName}>{endDate || "-"}</div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-3xl w-[90%] max-w-sm shadow-2xl space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">{task ? "编辑任务" : "新建任务"}</h2>
          {task && (
            <button 
              onClick={() => {
                if (window.confirm("确定要删除这个任务吗？")) {
                  onDelete(task.id);
                }
              }}
              className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
            >
              删除
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">游戏ID / 任务名称</label>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (formError) setFormError("");
            }}
            placeholder="例如: 少年游"
            className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm transition-colors bg-gray-50 rounded-t"
          />
        </div>

        <div className="relative">
          <label className="text-xs font-medium text-gray-500 mb-1 block">任务类型标签</label>
          <div 
            className="w-full border-b border-gray-200 focus-within:border-black min-h-[38px] transition-colors bg-gray-50 rounded-t flex flex-wrap gap-1.5 p-2 relative"
            onClick={() => {
              const input = document.getElementById('tag-input');
              if (input) input.focus();
            }}
          >
            {modalTags.map((tag, idx) => (
              <div key={idx} className="flex items-center bg-blue-100/50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 text-xs transition-all">
                <span className="mr-1.5 font-medium">{tag.name}</span>
                <div className="flex items-center bg-white rounded-full shadow-sm px-0.5">
                  <button 
                    className="w-4 h-4 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTags = [...modalTags];
                      if (newTags[idx].max > 1) {
                        newTags[idx].max -= 1;
                        setModalTags(newTags);
                      } else {
                        setModalTags(newTags.filter((_, i) => i !== idx));
                      }
                    }}
                  >-</button>
                  <span className="w-3 text-[10px] text-center font-medium">{tag.max}</span>
                  <button 
                    className="w-4 h-4 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTags = [...modalTags];
                      newTags[idx].max += 1;
                      setModalTags(newTags);
                    }}
                  >+</button>
                </div>
                <button 
                  className="ml-1.5 w-4 h-4 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-200 rounded-full transition-colors"
                  onClick={(e) => {
                     e.stopPropagation();
                     setModalTags(modalTags.filter((_, i) => i !== idx));
                  }}
                >×</button>
              </div>
            ))}
            <input
              id="tag-input"
              value={tagInputValue}
              onChange={(e) => {
                setTagInputValue(e.target.value);
                setShowTagSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInputValue.trim()) {
                  e.preventDefault();
                  const name = tagInputValue.trim();
                  const existing = modalTags.find(t => t.name === name);
                  if (existing) {
                    setModalTags(modalTags.map(t => t.name === name ? {...t, max: t.max + 1} : t));
                  } else {
                    setModalTags([...modalTags, { name, max: 1 }]);
                  }
                  setTagInputValue("");
                  setShowTagSuggestions(false);
                } else if (e.key === 'Backspace' && !tagInputValue && modalTags.length > 0) {
                  setModalTags(modalTags.slice(0, -1));
                }
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              placeholder={modalTags.length === 0 ? "输入标签后回车..." : ""}
              className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
            />
          </div>

          {showTagSuggestions && (historicalTags.length > 0 || tagInputValue.trim()) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
              <div className="p-2 flex flex-wrap gap-1.5">
                {historicalTags
                  .filter(t => t.toLowerCase().includes(tagInputValue.toLowerCase()))
                  .map((tag) => (
                  pendingDeleteTag === tag ? (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded-full border border-red-200">
                      <span>删除「{tag}」?</span>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onDeleteTag && onDeleteTag(tag);
                          setPendingDeleteTag(null);
                        }}
                        className="font-bold hover:text-red-800 transition-colors"
                      >✓</button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPendingDeleteTag(null);
                        }}
                        className="hover:text-red-800 transition-colors"
                      >✕</button>
                    </span>
                  ) : (
                    <span key={tag} className="flex items-center gap-0.5 px-2.5 py-1 text-xs bg-gray-50 text-gray-700 rounded-full border border-gray-200">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const existing = modalTags.find(t => t.name === tag);
                          if (existing) {
                            setModalTags(modalTags.map(t => t.name === tag ? {...t, max: t.max + 1} : t));
                          } else {
                            setModalTags([...modalTags, { name: tag, max: 1 }]);
                          }
                          setTagInputValue("");
                          setShowTagSuggestions(false);
                        }}
                        className="hover:text-gray-900 transition-colors"
                      >
                        {tag}
                      </button>
                      {onDeleteTag && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPendingDeleteTag(tag);
                          }}
                          className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-full transition-colors"
                          title="全局删除此标签"
                        >×</button>
                      )}
                    </span>
                  )
                ))}
                {tagInputValue.trim() && !historicalTags.includes(tagInputValue.trim()) && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const name = tagInputValue.trim();
                      const existing = modalTags.find(t => t.name === name);
                      if (existing) {
                        setModalTags(modalTags.map(t => t.name === name ? {...t, max: t.max + 1} : t));
                      } else {
                        setModalTags([...modalTags, { name, max: 1 }]);
                      }
                      setTagInputValue("");
                      setShowTagSuggestions(false);
                    }}
                    className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 transition-colors"
                  >
                    添加 "{tagInputValue.trim()}"
                  </button>
                )}
              </div>
            </div>
          )}
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
          {!creatingGroup && groups.length > 0 ? (
            <div className="space-y-2">
              <select
                value={newGroup}
                onChange={(e) => {
                  setNewGroup(e.target.value);
                  if (formError) setFormError("");
                }}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={startCreatingGroup}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 新建分组
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="输入新分组名"
                className="w-full border-b border-gray-200 focus:border-black outline-none p-2 text-sm bg-gray-50 rounded-t"
              />
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={stopCreatingGroup}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  改为选择已有分组
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                if (!task && val) {
                  const [year, month, day] = val.split('-').map(Number);
                  const d = new Date(year, month - 1, day);
                  d.setDate(d.getDate() + 30);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  setEndDate(`${yyyy}-${mm}-${dd}`);
                }
              }}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-500 block">结束日期 (选填)</label>
              <button 
                type="button"
                onClick={() => {
                  const baseDate = endDate ? new Date(endDate) : new Date(startDate || Date.now());
                  if (isNaN(baseDate.getTime())) return;
                  baseDate.setDate(baseDate.getDate() + 30);
                  const yyyy = baseDate.getFullYear();
                  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(baseDate.getDate()).padStart(2, '0');
                  setEndDate(`${yyyy}-${mm}-${dd}`);
                }}
                className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
              >
                +30天
              </button>
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
            />
          </div>
        </div>

        {formError && (
          <p className="text-sm text-red-500">{formError}</p>
        )}

        <div className="pt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              onClose();
              setCreatingGroup(false);
            }}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800"
          >
            {task ? "保存修改" : "确定添加"}
          </button>
        </div>
      </div>
    </div>
  );
}
