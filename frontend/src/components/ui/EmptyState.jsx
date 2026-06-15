export default function EmptyState({ icon = '📭', message = 'Nothing here yet.' }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <div>{message}</div>
    </div>
  );
}
