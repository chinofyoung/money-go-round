export function MobileContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] bg-slate-900 flex justify-center overflow-hidden">
      <div className="bg-black w-full max-w-[430px] flex flex-col h-full relative">
        {children}
      </div>
    </div>
  );
}
