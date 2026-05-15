/** Snapshot do formulário do modal de evento da agenda (alterações não salvas). */
export function agendaModalSnapshotArg(p: {
  editingEventId: string | null
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  analystId: string
  meetingLink: string
  modalProjectId: string | null
  modalTaskId: string | null
}) {
  return JSON.stringify(p)
}
