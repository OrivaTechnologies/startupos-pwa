export function AppContentShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh w-full flex-col md:mx-auto md:max-w-5xl">{children}</div>;
}
