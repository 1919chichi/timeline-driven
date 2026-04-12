import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import { Task } from '../types';

interface SortableTaskItemProps {
  task: Task;
  toggleTask: (taskId: string | number, e: React.MouseEvent) => void;
  toggleTag: (taskId: string | number, tagName: string, maxCount: number, e: React.MouseEvent) => void;
  openViewModal: (task: Task, e: React.MouseEvent) => void;
  openEditModal: (task: Task, e: React.MouseEvent) => void;
}

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
  } = useSortable({ id: task.id });

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
