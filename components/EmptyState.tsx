export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
