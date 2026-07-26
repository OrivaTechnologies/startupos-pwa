// Sentinel id for the virtual "My Tasks" list, which groups tasks that do
// not belong to any real list (list_id null). Not a row in task_lists.
export const MY_TASKS_LIST_ID = "my-tasks";

export interface TaskListSummary {
  id: string;
  name: string;
  isVirtual: boolean;
}
