export default function LoginSkeleton() {
  return (
    <div className="h-dvh overflow-hidden bg-bg-light dark:bg-surface-dark flex flex-col px-4 py-6 xs:py-10 xs:items-center xs:justify-center">
      <div className="w-full max-w-sm xs:mx-auto flex flex-col justify-between h-full xs:h-auto">
        <div>
          {/* Header */}
          <div className="mb-6">
            <div className="h-7 w-20 bg-border-light dark:bg-border-dark animate-pulse mb-2" />
            <div className="h-4 w-48 bg-border-light dark:bg-border-dark animate-pulse" />
          </div>

          {/* Card */}
          <div className="border border-border-light dark:border-border-dark p-5 flex flex-col gap-4">
            <div className="h-4 w-32 bg-border-light dark:bg-border-dark animate-pulse" />
            <div className="h-10 w-full bg-border-light dark:bg-border-dark animate-pulse" />
            <div className="h-10 w-full bg-border-light dark:bg-border-dark animate-pulse" />
          </div>

          {/* Features */}
          <div className="mt-5 flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-border-light dark:bg-border-dark animate-pulse shrink-0" />
                <div
                  className="h-3 bg-border-light dark:bg-border-dark animate-pulse"
                  style={{ width: `${60 + i * 10}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-4 pb-2 xs:mt-6 xs:pb-0">
          <div className="h-3 w-40 bg-border-light dark:bg-border-dark animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  )
}
