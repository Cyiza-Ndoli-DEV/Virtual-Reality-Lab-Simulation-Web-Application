type AccountSettingsLayoutProps = {
  children: React.ReactNode
}

export function AccountSettingsLayout({ children }: AccountSettingsLayoutProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {children}
    </div>
  )
}
