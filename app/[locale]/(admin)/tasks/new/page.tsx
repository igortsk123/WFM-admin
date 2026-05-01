import { TaskForm } from "@/components/features/tasks/task-form";

/**
 * New task creation page (SUPERVISOR / REGIONAL / NETWORK_OPS only).
 * The TaskForm component handles the 403 guard for STORE_DIRECTOR.
 * @route /tasks/new
 */
export default function NewTaskPage() {
  return <TaskForm mode="create" />;
}
