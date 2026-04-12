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
  const [accountId, setAccountId] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [coopInfo, setCoopInfo] = useState("");

  const [noteInput, setNoteInput] = useState("");

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const sectionLabelClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block";
  const readOnlyValueClassName = "w-full min-h-[48px] p-3.5 text-[15px] bg-gray-50 rounded-[16px] text-gray-900 border border-gray-100/50";
  const inputClassName = "w-full border border-gray-200/80 bg-gray-50/50 rounded-[16px] p-3.5 text-[15px] text-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder:text-gray-400";

  useEffect(() => {
    if (task) {
      setNewName(task.name);
      const parsedTags = (task.tags || []).map(t => {
        if (typeof t === 'string') return { name: t, max: 1 };
        return { ...t };
      });
      setModalTags(parsedTags);
      setAccountId(task.accountId || "");
      setAccountInfo(task.accountInfo || "");
      setCoopInfo(task.coopInfo || "");
      setNoteInput(task.note || "");
      setNewGroup(task.group || defaultGroup);
      setStartDate(task.start || getToday());
      setEndDate(task.end || "");
      setCreatingGroup(groups.length === 0);
      setNewGroupName(groups.length === 0 ? (task.group || "") : "");
    } else {
      setNewName("");
      setModalTags([]);
      setAccountId("");
      setAccountInfo("");
      setCoopInfo("");
      setNoteInput("");
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
      accountId,
      accountInfo,
      coopInfo,
      note: noteInput,
      isNewGroup: shouldUseNewGroup && !groups.includes(finalGroup)
    });
  };

  if (isViewMode) {
    return (
      <div 
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onMouseDown={onClose}
      >
        <div 
          className="bg-white p-7 rounded-[28px] w-full max-w-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 font-sans max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[22px] font-extrabold tracking-tight text-gray-900">任务详情</h2>
          </div>

          <div>
            <label className={sectionLabelClassName}>游戏ID / 任务名称</label>
            <div className={readOnlyValueClassName}>{newName || "-"}</div>
          </div>

          <div>
            <label className={sectionLabelClassName}>任务类型标签</label>
            <div className={`${readOnlyValueClassName} flex flex-wrap gap-2`}>
              {modalTags.length > 0 ? (
                modalTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center rounded-[10px] bg-gray-200/60 px-3 py-1.5 text-[13px] font-medium text-gray-600"
                  >
                    {tag.name}
                    {tag.max > 1 ? <span className="ml-1.5 px-1.5 py-0.5 bg-white rounded-md text-[10px] font-bold text-gray-500 shadow-sm">x{tag.max}</span> : ""}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={sectionLabelClassName}>数字id</label>
              <div className={readOnlyValueClassName}>{accountId || "-"}</div>
            </div>
            <div>
              <label className={sectionLabelClassName}>账号信息</label>
              <div className={readOnlyValueClassName}>{accountInfo || "-"}</div>
            </div>
            <div>
              <label className={sectionLabelClassName}>协战小号信息</label>
              <div className={readOnlyValueClassName}>{coopInfo || "-"}</div>
            </div>
          </div>

          <div>
            <label className={sectionLabelClassName}>分组</label>
            <div className={readOnlyValueClassName}>{newGroup || newGroupName || "-"}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={sectionLabelClassName}>开始日期</label>
              <div className={readOnlyValueClassName}>{startDate || "-"}</div>
            </div>
            <div>
              <label className={sectionLabelClassName}>结束日期</label>
              <div className={readOnlyValueClassName}>{endDate || "-"}</div>
            </div>
          </div>

          {noteInput && (
            <div>
              <label className={sectionLabelClassName}>备注</label>
              <div className={`${readOnlyValueClassName} whitespace-pre-wrap`}>{noteInput}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onMouseDown={() => {
        onClose();
        setCreatingGroup(false);
      }}
    >
      <div 
        className="bg-white p-7 rounded-[28px] w-full max-w-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 font-sans max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[22px] font-extrabold tracking-tight text-gray-900">{task ? "编辑任务" : "新建任务"}</h2>
          {task && (
            <button 
              onClick={() => {
                if (window.confirm("确定要删除这个任务吗？")) {
                  onDelete(task.id);
                }
              }}
              className="text-red-500 text-[13px] font-bold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              删除
            </button>
          )}
        </div>

        <div>
          <label className={sectionLabelClassName}>游戏ID / 任务名称</label>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (formError) setFormError("");
            }}
            placeholder="例如: 少年游"
            className={inputClassName}
          />
        </div>

        <div className="relative">
          <label className={sectionLabelClassName}>任务类型标签</label>
          <div 
            className={`flex flex-wrap gap-2 ${inputClassName} py-2.5 min-h-[52px]`}
            onClick={() => {
              const input = document.getElementById('tag-input');
              if (input) input.focus();
            }}
          >
            {modalTags.map((tag, idx) => (
              <div key={idx} className="flex items-center bg-gray-900 text-white rounded-[12px] px-2.5 py-1 text-[13px] font-medium shadow-sm transition-all group">
                <span className="mr-2">{tag.name}</span>
                <div className="flex items-center bg-white/20 rounded-lg px-0.5 backdrop-blur-sm">
                  <button 
                    className="w-5 h-5 flex items-center justify-center hover:bg-white/30 rounded-lg text-white transition-colors"
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
                  <span className="w-4 text-[11px] text-center font-bold">{tag.max}</span>
                  <button 
                    className="w-5 h-5 flex items-center justify-center hover:bg-white/30 rounded-lg text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTags = [...modalTags];
                      newTags[idx].max += 1;
                      setModalTags(newTags);
                    }}
                  >+</button>
                </div>
                <button 
                  className="ml-2 w-5 h-5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 rounded-full transition-colors"
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
              className="flex-1 min-w-[80px] outline-none text-[14px] bg-transparent text-gray-900 placeholder:text-gray-400 py-1"
            />
          </div>

          {showTagSuggestions && (historicalTags.length > 0 || tagInputValue.trim()) && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-[16px] shadow-[0_10px_40px_rgb(0,0,0,0.1)] max-h-48 overflow-y-auto p-2">
              <div className="flex flex-wrap gap-2">
                {historicalTags
                  .filter(t => t.toLowerCase().includes(tagInputValue.toLowerCase()))
                  .map((tag) => (
                  pendingDeleteTag === tag ? (
                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold bg-red-50 text-red-600 rounded-[10px] border border-red-200">
                      <span>删除「{tag}」?</span>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onDeleteTag && onDeleteTag(tag);
                          setPendingDeleteTag(null);
                        }}
                        className="hover:text-red-800 bg-white px-2 py-0.5 rounded shadow-sm transition-colors"
                      >✓</button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPendingDeleteTag(null);
                        }}
                        className="hover:text-red-800 bg-white px-2 py-0.5 rounded shadow-sm transition-colors"
                      >✕</button>
                    </span>
                  ) : (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium bg-gray-50 text-gray-700 rounded-[10px] border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
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
                    >
                      {tag}
                      {onDeleteTag && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDeleteTag(tag);
                          }}
                          className="ml-1.5 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                    className="px-3 py-1.5 text-[13px] font-bold bg-gray-900 text-white rounded-[10px] hover:bg-black shadow-sm transition-colors"
                  >
                    + 添加 "{tagInputValue.trim()}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className={sectionLabelClassName}>数字id</label>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="例如: #359697"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={sectionLabelClassName}>账号信息</label>
            <input
              value={accountInfo}
              onChange={(e) => setAccountInfo(e.target.value)}
              placeholder="例如: 春区酪酪"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={sectionLabelClassName}>协战小号信息</label>
            <input
              value={coopInfo}
              onChange={(e) => setCoopInfo(e.target.value)}
              placeholder="例如: 邮箱"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className={sectionLabelClassName}>分组</label>
          {!creatingGroup && groups.length > 0 ? (
            <div className="space-y-3">
              <select
                value={newGroup}
                onChange={(e) => {
                  setNewGroup(e.target.value);
                  if (formError) setFormError("");
                }}
                className={inputClassName}
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
                className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <span>+</span> 新建分组
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="输入新分组名"
                className={inputClassName}
              />
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={stopCreatingGroup}
                  className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  改为选择已有分组
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={sectionLabelClassName}>开始日期</label>
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
              className={inputClassName}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block">结束日期 (选填)</label>
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
                className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md hover:bg-gray-200 hover:text-gray-900 transition-colors"
              >
                +30天
              </button>
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className={sectionLabelClassName}>备注（选填）</label>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="可填写任何备注信息…"
            rows={3}
            className={`${inputClassName} resize-none`}
          />
        </div>

        {formError && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-[13px] font-medium text-red-600">{formError}</p>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              setCreatingGroup(false);
            }}
            className="px-6 py-3.5 text-[14px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-[16px] transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-3.5 text-[14px] font-bold bg-gray-900 text-white rounded-[16px] shadow-md hover:bg-black hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            {task ? "保存修改" : "确定添加"}
          </button>
        </div>
      </div>
    </div>
  );
}