/**
 * TodayPage —— PhaseDo 唯一的主页面。
 *
 * 职责：
 * - 承载全部应用状态（tasks / historicalTags / historicalGroups），通过 useLocalStorage 持久化。
 * - 提供任务的增删改、整卡/单标签打卡、按分组渲染、拖拽排序、关键词搜索、JSON 导入导出能力。
 * - 子组件（SortableTaskItem / TaskItem / UpcomingTaskItem / TaskModal）均为受控的展示型组件，
 *   所有数据变更动作通过回调回流到本文件统一更新。
 *
 * 文件内顶层定义了一组导入数据规范化函数（normalizeImport*），用于把外部 JSON 安全地
 * 转成内部 Task 结构，并对 id 去重。
 */
import React, {useState, useCallback, useMemo, useEffect, useRef, ChangeEvent, MouseEvent} from "react";
import {getToday, getStatus, isDoneToday, normalizeTags, getDaysUntilEnd, taskMatchesSearch} from "./utils/taskUtils";
import {useLocalStorage} from "./hooks/useLocalStorage";
import UpcomingTaskItem from "./components/UpcomingTaskItem";
import TaskModal, {TaskData} from "./components/TaskModal";
import SortableTaskItem from "./components/SortableTaskItem";
import {Task, Tag} from "./types";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import {restrictToWindowEdges} from "@dnd-kit/modifiers";

interface ImportPreviewState {
    fileName: string;
    tasks: Task[];
    historicalTags: string[];
    historicalGroups: string[];
    skippedTasks: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringList(rawValue: unknown): string[] {
    if (!Array.isArray(rawValue)) return [];
    const values = new Set<string>();
    rawValue.forEach((value) => {
        if (typeof value !== "string") return;
        const trimmed = value.trim();
        if (!trimmed) return;
        values.add(trimmed);
    });
    return Array.from(values);
}

function normalizeImportedTags(rawTags: unknown): Tag[] {
    if (!Array.isArray(rawTags)) return [];
    const tagMap = new Map<string, number>();

    rawTags.forEach((rawTag) => {
        if (typeof rawTag === "string") {
            const name = rawTag.trim();
            if (!name) return;
            tagMap.set(name, (tagMap.get(name) || 0) + 1);
            return;
        }

        if (!isRecord(rawTag)) return;
        const name = typeof rawTag.name === "string" ? rawTag.name.trim() : "";
        if (!name) return;

        const parsedMax = typeof rawTag.max === "number" ? rawTag.max : Number(rawTag.max);
        const max = Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : 1;
        tagMap.set(name, (tagMap.get(name) || 0) + max);
    });

    return Array.from(tagMap.entries()).map(([name, max]) => ({name, max}));
}

function normalizeImportedLogs(rawLogs: unknown): Record<string, any> {
    if (!isRecord(rawLogs)) return {};
    const normalizedLogs: Record<string, any> = {};

    Object.entries(rawLogs).forEach(([date, value]) => {
        if (value === true) {
            normalizedLogs[date] = true;
            return;
        }

        if (!isRecord(value)) return;

        const tagProgress: Record<string, number> = {};
        Object.entries(value).forEach(([tagName, count]) => {
            const parsedCount = typeof count === "number" ? count : Number(count);
            if (!Number.isFinite(parsedCount) || parsedCount < 0) return;
            tagProgress[tagName] = Math.floor(parsedCount);
        });
        normalizedLogs[date] = tagProgress;
    });

    return normalizedLogs;
}

function normalizeImportedTask(rawTask: unknown, index: number): Task | null {
    if (!isRecord(rawTask)) return null;
    const name = typeof rawTask.name === "string" ? rawTask.name.trim() : "";
    if (!name) return null;

    const rawId = rawTask.id;
    const id = typeof rawId === "string" || typeof rawId === "number" ? rawId : `imported-task-${Date.now()}-${index}`;

    const readTextField = (field: string): string | undefined => {
        const value = rawTask[field];
        return typeof value === "string" ? value : undefined;
    };

    return {
        id,
        name,
        start: readTextField("start"),
        end: readTextField("end"),
        tags: normalizeImportedTags(rawTask.tags),
        logs: normalizeImportedLogs(rawTask.logs),
        groupId: readTextField("groupId"),
        color: readTextField("color"),
        accountId: readTextField("accountId"),
        accountInfo: readTextField("accountInfo"),
        coopInfo: readTextField("coopInfo"),
        note: readTextField("note"),
    };
}

function collectTagNames(tasks: Task[]): string[] {
    const tags = new Set<string>();
    tasks.forEach((task) => {
        normalizeTags(task.tags).forEach((tag: Tag) => {
            tags.add(tag.name);
        });
    });
    return Array.from(tags);
}

function collectGroupNames(tasks: Task[]): string[] {
    const groups = new Set<string>();
    tasks.forEach((task) => {
        const groupName = typeof task.groupId === "string" ? task.groupId.trim() : "";
        if (!groupName) return;
        groups.add(groupName);
    });
    return Array.from(groups);
}

function normalizeImportPayload(rawPayload: unknown): {
    tasks: Task[];
    historicalTags: string[];
    historicalGroups: string[];
    skippedTasks: number;
} {
    let rawTasks: unknown;
    let rawHistoricalTags: unknown;
    let rawHistoricalGroups: unknown;

    if (Array.isArray(rawPayload)) {
        rawTasks = rawPayload;
    } else if (isRecord(rawPayload)) {
        const source = isRecord(rawPayload.data) ? rawPayload.data : rawPayload;
        rawTasks = source.tasks;
        rawHistoricalTags = source.historicalTags;
        rawHistoricalGroups = source.historicalGroups;
    } else {
        throw new Error("导入文件不是有效的 JSON 结构");
    }

    if (!Array.isArray(rawTasks)) {
        throw new Error("导入文件缺少 tasks 数组");
    }

    const normalizedTasks: Task[] = [];
    let skippedTasks = 0;
    const usedIds = new Set<string>();

    rawTasks.forEach((rawTask, index) => {
        const parsedTask = normalizeImportedTask(rawTask, index);
        if (!parsedTask) {
            skippedTasks += 1;
            return;
        }

        let taskId = parsedTask.id;
        let idKey = String(taskId);
        let dedupeIndex = 1;
        while (usedIds.has(idKey)) {
            taskId = `${String(parsedTask.id)}-${index + 1}-${dedupeIndex}`;
            idKey = String(taskId);
            dedupeIndex += 1;
        }
        usedIds.add(idKey);

        normalizedTasks.push(taskId === parsedTask.id ? parsedTask : {...parsedTask, id: taskId});
    });

    const historicalTags = normalizeStringList(rawHistoricalTags);
    const historicalGroups = normalizeStringList(rawHistoricalGroups);

    return {
        tasks: normalizedTasks,
        historicalTags: historicalTags.length > 0 ? historicalTags : collectTagNames(normalizedTasks),
        historicalGroups: historicalGroups.length > 0 ? historicalGroups : collectGroupNames(normalizedTasks),
        skippedTasks,
    };
}

export default function TodayPage() {
    // 任务列表 + 标签/分组历史（用于输入联想与空分组清理）
    const [tasks, setTasks] = useLocalStorage<Task[]>("timetrackr_tasks", []);
    const [historicalTags, setHistoricalTags] = useLocalStorage<string[]>("timetrackr_historical_tags", []);
    const [historicalGroups, setHistoricalGroups] = useLocalStorage<string[]>("timetrackr_historical_groups", []);

    const [nameFilter, setNameFilter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
    const [importError, setImportError] = useState("");

    const moreMenuRef = useRef<HTMLDivElement | null>(null);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const handleOutsideMouseDown = (event: globalThis.MouseEvent) => {
            if (!moreMenuRef.current) return;
            if (moreMenuRef.current.contains(event.target as Node)) return;
            setShowMoreMenu(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setShowMoreMenu(false);
            setImportPreview(null);
        };

        document.addEventListener("mousedown", handleOutsideMouseDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutsideMouseDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    /** 整卡「完成」切换：无标签时 logs[today]=true；有标签时一次性写满各标签当日次数。 */
    const toggleTask = useCallback((id: string | number, e: MouseEvent) => {
        if (e) e.stopPropagation();
        const today = getToday();

        setTasks((prev: Task[]) =>
            prev.map((t: Task) => {
                if (t.id !== id) return t;

                const newLogs = {...t.logs};
                const done = isDoneToday(t);

                if (done) {
                    delete newLogs[today];
                } else {
                    const tags = normalizeTags(t.tags);
                    if (tags.length > 0) {
                        const todayLog: Record<string, number> = {};
                        tags.forEach((tag: Tag) => {
                            todayLog[tag.name] = tag.max;
                        });
                        newLogs[today] = todayLog;
                    } else {
                        newLogs[today] = true;
                    }
                }

                return {...t, logs: newLogs};
            }),
        );
    }, [setTasks]);

    /**
     * 单标签点击：在当日 log 上递增该标签计数；从满额再点则归零（可视为撤销该标签一轮）。
     * 若当日是整卡完成的 `true`，先展开成各标签满额再改单个标签，避免丢状态。
     */
    const toggleTag = useCallback((id: string | number, tagName: string, maxCount: number, e: MouseEvent) => {
        if (e) e.stopPropagation();
        const today = getToday();

        setTasks((prev: Task[]) =>
            prev.map((t: Task) => {
                if (t.id !== id) return t;

                const newLogs = {...t.logs};
                let todayLog = newLogs[today];

                if (todayLog === true) {
                    const tags = normalizeTags(t.tags);
                    todayLog = {};
                    tags.forEach((tag: Tag) => {
                        todayLog[tag.name] = tag.max;
                    });
                } else if (!todayLog) {
                    todayLog = {};
                } else {
                    todayLog = {...todayLog};
                }

                const currentCount = todayLog[tagName] || 0;
                if (currentCount >= maxCount) {
                    todayLog[tagName] = 0;
                } else {
                    todayLog[tagName] = currentCount + 1;
                }

                newLogs[today] = todayLog;
                return {...t, logs: newLogs};
            }),
        );
    }, [setTasks]);

    const openModal = useCallback((task: Task | null, mode: "create" | "edit" | "view", e?: MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingTask(task);
        setModalMode(mode);
        setShowModal(true);
    }, []);

    const openEditModal = useCallback((task: Task, e: MouseEvent) => openModal(task, "edit", e), [openModal]);
    const openViewModal = useCallback((task: Task, e: MouseEvent) => openModal(task, "view", e), [openModal]);

    const openAddModal = useCallback(() => {
        setEditingTask(null);
        setModalMode("create");
        setShowModal(true);
    }, []);

    const closeModal = useCallback(() => setShowModal(false), []);

    const triggerImportFilePick = useCallback(() => {
        setShowMoreMenu(false);
        setImportError("");
        if (!importFileInputRef.current) return;
        importFileInputRef.current.value = "";
        importFileInputRef.current.click();
    }, []);

    const exportData = useCallback(() => {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            tasks,
            historicalTags,
            historicalGroups,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json;charset=utf-8",
        });

        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `phasedo-backup-${timestamp}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        setShowMoreMenu(false);
    }, [tasks, historicalTags, historicalGroups]);

    const handleImportFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const pickedFile = event.target.files?.[0];
        event.target.value = "";
        if (!pickedFile) return;

        try {
            const fileText = await pickedFile.text();
            const parsed = JSON.parse(fileText) as unknown;
            const normalized = normalizeImportPayload(parsed);

            if (normalized.tasks.length === 0) {
                throw new Error("导入文件中没有可用任务");
            }

            setImportPreview({
                fileName: pickedFile.name,
                tasks: normalized.tasks,
                historicalTags: normalized.historicalTags,
                historicalGroups: normalized.historicalGroups,
                skippedTasks: normalized.skippedTasks,
            });
            setImportError("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "导入失败，请检查文件内容";
            setImportError(message);
            setImportPreview(null);
        }
    }, []);

    const confirmImportReplacement = useCallback(() => {
        if (!importPreview) return;

        const importedTasks = importPreview.tasks;
        setTasks((prev: Task[]) => {
            const existingLogsMap = new Map<string, Record<string, any>>();
            prev.forEach((task: Task) => {
                if (!task.logs || typeof task.logs !== "object") return;
                existingLogsMap.set(String(task.id), task.logs);
            });

            return importedTasks.map((task: Task) => {
                const existingLogs = existingLogsMap.get(String(task.id));
                if (!existingLogs) return task;
                return {
                    ...task,
                    logs: {
                        ...existingLogs,
                        ...(task.logs || {}),
                    },
                };
            });
        });
        setHistoricalTags(importPreview.historicalTags);
        setHistoricalGroups(importPreview.historicalGroups);
        setImportPreview(null);
        setImportError("");
    }, [importPreview, setTasks, setHistoricalTags, setHistoricalGroups]);

    const saveTask = useCallback((taskData: TaskData) => {
        const {id, name, start, end, tags, accountId, accountInfo, coopInfo, note, groupId} = taskData;

        const newHistory = new Set(historicalTags);
        tags.forEach((t: Tag) => newHistory.add(t.name));
        setHistoricalTags(Array.from(newHistory));

        if (groupId) {
            const newGroups = new Set(historicalGroups);
            newGroups.add(groupId);
            setHistoricalGroups(Array.from(newGroups));
        }

        if (id) {
            setTasks((prev: Task[]) => prev.map((t: Task) => {
                if (t.id === id) {
                    return {...t, name, start, end, tags, accountId, accountInfo, coopInfo, note, groupId};
                }
                return t;
            }));
        } else {
            const newTask: Task = {
                id: Date.now().toString(),
                name,
                start,
                end,
                tags,
                accountId,
                accountInfo,
                coopInfo,
                note,
                groupId,
                logs: {},
            };
            setTasks((prev: Task[]) => [...prev, newTask]);
        }

        setShowModal(false);
    }, [historicalTags, setHistoricalTags, historicalGroups, setHistoricalGroups, setTasks]);

    const deleteTask = useCallback((id: string | number) => {
        setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
        setShowModal(false);
    }, [setTasks]);

    /**
     * 仅把标签从「历史标签建议库」里移除，不动任何任务里已使用的同名标签及其打卡记录。
     * 这样在新建任务的建议列表里删一个标签，不会牵连其它任务的数据。
     */
    const deleteTagGlobally = useCallback((tagName: string) => {
        setHistoricalTags((prev: string[]) => prev.filter((t: string) => t !== tagName));
    }, [setHistoricalTags]);

    const ongoingTasks = useMemo(() => {
        return tasks.filter((t: Task) => {
            if (getStatus(t.start, t.end) !== "ongoing") return false;
            return taskMatchesSearch(t, nameFilter);
        });
    }, [tasks, nameFilter]);

    const upcomingTasks = useMemo(
        () => tasks
            .filter((t: Task) => {
                if (getStatus(t.start, t.end) !== "upcoming") return false;
                return taskMatchesSearch(t, nameFilter);
            })
            .sort((a: Task, b: Task) => {
                const aDays = getDaysUntilEnd(a.start);
                const bDays = getDaysUntilEnd(b.start);
                if (aDays === null && bDays === null) return 0;
                if (aDays === null) return 1;
                if (bDays === null) return -1;
                return aDays - bDays;
            }),
        [tasks, nameFilter],
    );

    const importPreviewStats = useMemo(() => {
        if (!importPreview) return null;

        const taskCount = importPreview.tasks.length;
        const withLogCount = importPreview.tasks.filter((task: Task) => Object.keys(task.logs || {}).length > 0).length;
        const totalLogDays = importPreview.tasks.reduce(
            (sum: number, task: Task) => sum + Object.keys(task.logs || {}).length,
            0,
        );
        const previewNames = importPreview.tasks.slice(0, 6).map((task: Task) => task.name);

        return {
            taskCount,
            withLogCount,
            totalLogDays,
            previewNames,
        };
    }, [importPreview]);

    const allGroups = useMemo(() => {
        const groups = new Set(historicalGroups);
        ongoingTasks.forEach((t: Task) => {
            if (t.groupId) groups.add(t.groupId as string);
        });
        return Array.from(groups).sort();
    }, [historicalGroups, ongoingTasks]);

    /**
     * 进行中列表的扁平顺序：按分组名排序后的各组内任务，再接未分组。
     * 与下方 UI 分组标题顺序一致，供 SortableContext 与网格展示共用同一顺序。
     */
    const sortedOngoingTasks = useMemo(() => {
        const ungrouped = ongoingTasks.filter((t: Task) => !t.groupId);

        const groupMap: Record<string, Task[]> = {};
        allGroups.forEach(g => {
            groupMap[g] = [];
        });

        ongoingTasks.filter((t: Task) => t.groupId).forEach((t: Task) => {
            const g = t.groupId as string;
            if (groupMap[g]) groupMap[g].push(t);
        });

        let result: Task[] = [];
        allGroups.forEach(g => {
            result.push(...groupMap[g]);
        });
        result.push(...ungrouped);

        return result;
    }, [ongoingTasks, allGroups]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /** 拖到另一任务上时：先继承目标任务的 groupId（跨组即换组），再重排全局 tasks 顺序。 */
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        if (active && over && active.id !== over.id) {
            setTasks((prev: Task[]) => {
                const oldIndex = prev.findIndex((t: Task) => t.id === active.id);
                const newIndex = prev.findIndex((t: Task) => t.id === over.id);

                if (oldIndex === -1 || newIndex === -1) return prev;

                let newTasks = [...prev];
                const activeTask = {...newTasks[oldIndex]};
                const overTask = newTasks[newIndex];

                if (activeTask.groupId !== overTask.groupId) {
                    activeTask.groupId = overTask.groupId;
                }

                newTasks[oldIndex] = activeTask;
                return arrayMove(newTasks, oldIndex, newIndex);
            });
        }
    }, [setTasks]);

    return (
        <div className="p-6 max-w-6xl mx-auto relative min-h-screen pb-24 font-sans selection:bg-gray-200">
            <div className="sticky top-0 z-10 bg-[#F9FAFB]/80 backdrop-blur-xl -mx-6 px-6 pt-6 pb-5 mb-6">
                <div className="mb-5 flex items-center justify-between">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">今天</h1>
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowMoreMenu((prev) => !prev)}
                            className="h-10 w-10 rounded-xl border border-gray-200/80 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center"
                            aria-label="更多操作"
                            aria-haspopup="menu"
                            aria-expanded={showMoreMenu}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                 className="w-5 h-5">
                                <path
                                    d="M10 3a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 10 3ZM10 8.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM8.25 15a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0Z"/>
                            </svg>
                        </button>
                        {showMoreMenu && (
                            <div
                                className="absolute right-0 top-11 w-44 rounded-2xl border border-gray-200 bg-white shadow-xl py-1.5 z-30">
                                <button
                                    type="button"
                                    onClick={triggerImportFilePick}
                                    className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    导入数据
                                </button>
                                <button
                                    type="button"
                                    onClick={exportData}
                                    className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    导出数据
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportFileChange}
                />

                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                         className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <path fillRule="evenodd"
                              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                              clipRule="evenodd"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="搜索名称、备注或标签…"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 text-[15px] rounded-2xl border border-gray-200/80 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder:text-gray-400"
                    />
                    {nameFilter && (
                        <button
                            onClick={() => setNameFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                 className="w-3.5 h-3.5">
                                <path
                                    d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
                            </svg>
                        </button>
                    )}
                </div>
                {importError && (
                    <p className="mt-3 text-[13px] text-red-500 font-medium">{importError}</p>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
            >
                <SortableContext
                    items={sortedOngoingTasks.map((t: Task) => t.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allGroups.map(g => {
                            const tasksInGroup = sortedOngoingTasks.filter(t => t.groupId === g);
                            return (
                                <React.Fragment key={`group-${g}`}>
                                    <div
                                        className="col-span-full pt-4 pb-2 border-b border-gray-100 mb-2 flex items-center group">
                                        <h2 className="text-[15px] font-bold text-gray-900 tracking-wide">{g}</h2>
                                        <span
                                            className="ml-3 text-[12px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {tasksInGroup.length} 任务
                    </span>
                                        {tasksInGroup.length === 0 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`确定删除空分组 "${g}" 吗？`)) {
                                                        setHistoricalGroups(prev => prev.filter(x => x !== g));
                                                    }
                                                }}
                                                className="ml-auto text-[12px] font-medium text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 bg-red-50 px-2 py-1 rounded-lg"
                                            >
                                                删除空分组
                                            </button>
                                        )}
                                    </div>
                                    {tasksInGroup.map(task => (
                                        <SortableTaskItem
                                            key={task.id}
                                            task={task}
                                            toggleTask={toggleTask}
                                            toggleTag={toggleTag}
                                            openViewModal={openViewModal}
                                            openEditModal={openEditModal}
                                        />
                                    ))}
                                    {tasksInGroup.length === 0 && (
                                        <div
                                            className="col-span-full h-20 rounded-[20px] border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center text-[13px] text-gray-400 font-medium">
                                            此分组暂无任务
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {(() => {
                            const ungroupedTasks = sortedOngoingTasks.filter(t => !t.groupId);
                            if (ungroupedTasks.length === 0 && allGroups.length === 0) return null;

                            return (
                                <React.Fragment key="group-ungrouped">
                                    <div
                                        className="col-span-full pt-4 pb-2 border-b border-gray-100 mb-2 flex items-center">
                                        <h2 className="text-[15px] font-bold text-gray-900 tracking-wide">未分组</h2>
                                        <span
                                            className="ml-3 text-[12px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {ungroupedTasks.length} 任务
                    </span>
                                    </div>
                                    {ungroupedTasks.map(task => (
                                        <SortableTaskItem
                                            key={task.id}
                                            task={task}
                                            toggleTask={toggleTask}
                                            toggleTag={toggleTag}
                                            openViewModal={openViewModal}
                                            openEditModal={openEditModal}
                                        />
                                    ))}
                                </React.Fragment>
                            );
                        })()}
                    </div>
                </SortableContext>
            </DndContext>

            {upcomingTasks.length > 0 && (
                <>
                    <div className="px-1 mt-10 mb-3">
                        <h1 className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">即将开始</h1>
                    </div>
                    <div className="space-y-3">
                        {upcomingTasks.map((task: Task) => (
                            <UpcomingTaskItem
                                key={task.id}
                                task={task}
                                openViewModal={openViewModal}
                                openEditModal={openEditModal}
                            />
                        ))}
                    </div>
                </>
            )}

            <button
                onClick={openAddModal}
                className="fixed bottom-8 right-6 w-14 h-14 bg-gray-900 text-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.16)] flex items-center justify-center hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] hover:bg-black transition-all duration-300 z-40 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd"
                          d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                          clipRule="evenodd"/>
                </svg>
            </button>

            {importPreview && importPreviewStats && (
                <div
                    className="fixed inset-0 bg-gray-900/35 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onMouseDown={() => setImportPreview(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-[24px] bg-white shadow-2xl p-6 space-y-5"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-2">
                            <h2 className="text-[22px] font-extrabold tracking-tight text-gray-900">导入预览</h2>
                            <p className="text-[13px] text-gray-500">文件：{importPreview.fileName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-gray-50 border border-gray-200/70 p-3">
                                <p className="text-[12px] text-gray-500">任务数量</p>
                                <p className="text-[20px] font-bold text-gray-900">{importPreviewStats.taskCount}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 border border-gray-200/70 p-3">
                                <p className="text-[12px] text-gray-500">含日志任务</p>
                                <p className="text-[20px] font-bold text-gray-900">{importPreviewStats.withLogCount}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 border border-gray-200/70 p-3">
                                <p className="text-[12px] text-gray-500">日志总天数</p>
                                <p className="text-[20px] font-bold text-gray-900">{importPreviewStats.totalLogDays}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 border border-gray-200/70 p-3">
                                <p className="text-[12px] text-gray-500">历史标签 / 分组</p>
                                <p className="text-[20px] font-bold text-gray-900">
                                    {importPreview.historicalTags.length} / {importPreview.historicalGroups.length}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200/80 p-4 bg-white">
                            <p className="text-[12px] font-bold text-gray-500 tracking-wide uppercase mb-2">任务示例</p>
                            {importPreviewStats.previewNames.length > 0 ? (
                                <ul className="space-y-1.5">
                                    {importPreviewStats.previewNames.map((name, index) => (
                                        <li key={`${name}-${index}`}
                                            className="text-[14px] text-gray-700 truncate">• {name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[14px] text-gray-500">没有可展示的任务</p>
                            )}
                            {importPreview.tasks.length > importPreviewStats.previewNames.length && (
                                <p className="text-[12px] text-gray-500 mt-2">
                                    还有 {importPreview.tasks.length - importPreviewStats.previewNames.length} 个任务未展示
                                </p>
                            )}
                            {importPreview.skippedTasks > 0 && (
                                <p className="text-[12px] text-amber-600 mt-2">
                                    检测到 {importPreview.skippedTasks} 个无效任务，已在导入时自动跳过
                                </p>
                            )}
                        </div>

                        <div
                            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                            确认后会清空当前任务并替换为导入结果；每日完成记录会保留（同 ID 任务会合并现有与导入日志）。
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setImportPreview(null)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={confirmImportReplacement}
                                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[14px] font-semibold hover:bg-black transition-colors"
                            >
                                清空并替换
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <TaskModal
                    task={editingTask}
                    mode={modalMode}
                    historicalTags={historicalTags}
                    onSave={saveTask}
                    onClose={closeModal}
                    onDelete={deleteTask}
                    onDeleteTag={deleteTagGlobally}
                />
            )}
        </div>
    );
}
