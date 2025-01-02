"use client";

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// Dynamically import LexiconButton with no SSR
const LexiconButton = dynamic(
  () => import('../components/LexiconButton'),
  { ssr: false }
);

export default function ChatWidget() {
  try{
    const searchParams = useSearchParams();
    const configId = searchParams?.get('configId') || 'default';
    return (
      <div className="bg-transparent">
        <LexiconButton configId={configId} />
      </div>
    );

  }catch(e){
    console.error(e);
  }
  return null;
}
