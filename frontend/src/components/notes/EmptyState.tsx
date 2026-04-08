import Image from 'next/image';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
      <Image src="/boba-cup.png" alt="Boba cup" width={200} height={200} className="mb-6" />
      <p
        className="text-lg font-medium max-w-xs leading-relaxed"
        style={{ fontFamily: 'Georgia, serif', color: '#8B6B5A' }}
      >
        I&apos;m just here waiting for your charming notes...
      </p>
    </div>
  );
}
