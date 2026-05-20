/**
 * SortableTaskItem —— 把 TaskItem 包成 @dnd-kit 可排序节点。
 *
 * - 仅负责拖拽相关的 ref / transform / listeners 绑定，业务渲染完全交给内部的 TaskItem。
 * - 拖动中通过 opacity 与 zIndex 给出视觉反馈；拖拽监听挂在外层 div，
 *   内部按钮（标签打卡、编辑等）的 onClick 不受影响。
 * - 在 TodayPage 的 ongoing 区域使用；upcoming 区域不参与拖拽，因此用 UpcomingTaskItem。
 */
import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import {Task} from '../types';

interface SortableTaskItemProps {
    task: Task;
    toggleTask: (taskId: string | number, e: React.MouseEvent) => void;
    toggleTag: (taskId: string | number, tagName: string, maxCount: number, e: React.MouseEvent) => void;
    openViewModal: (task: Task, e: React.MouseEvent) => void;
    openEditModal: (task: Task, e: React.MouseEvent) => void;
}

/** 为 TaskItem 包一层可排序节点：拖拽由外层 div 处理，内部按钮仍各自 onClick。 */
export default function SortableTaskItem({
                                             task,
                                             toggleTask,
                                             toggleTag,
                                             openViewModal,
                                             openEditModal,
                                         }: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: task.id});

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            <TaskItem
                task={task}
                toggleTask={toggleTask}
                toggleTag={toggleTag}
                openViewModal={openViewModal}
                openEditModal={openEditModal}
            />
        </div>
    );
}
