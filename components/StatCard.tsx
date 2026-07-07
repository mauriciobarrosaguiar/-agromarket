export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}
