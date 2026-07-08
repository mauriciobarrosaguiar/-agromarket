import Link from 'next/link';

export default function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <>
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </>
  );

  if (href) {
    return <Link className="stat" href={href} style={{ textDecoration: 'none' }}>{content}</Link>;
  }

  return <div className="stat">{content}</div>;
}
