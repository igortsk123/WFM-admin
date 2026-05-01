import { notFound } from "next/navigation";
import { getTaskById } from "@/lib/api/tasks";
import { TaskForm } from "@/components/features/tasks/task-form";

interface EditTaskPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit task page — pre-fetches task on the server and passes initial values.
 * Renders 404 if task is not found or is archived.
 * @route /tasks/:id/edit
 */
export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id } = await params;

  let initialTask;
  try {
    const res = await getTaskById(id);
    initialTask = res.data;
  } catch {
    notFound();
  }

  if (initialTask.archived) {
    notFound();
  }

  return (
    <TaskForm
      mode="edit"
      taskId={id}
      initialTask={initialTask}
    />
  );
}
