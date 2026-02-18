import { Dumbbell } from 'lucide-react';

export default function ImagePlaceholder() {
  return (
    <div
      style={{
        height: 160,
        background: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px 12px 0 0',
        borderBottom: '2px solid #ccff00',
      }}
    >
      <Dumbbell size={48} color="#ccff00" strokeWidth={1.5} style={{ opacity: 0.8 }} />
    </div>
  );
}
