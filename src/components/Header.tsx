import { useBodhi } from '@bodhiapp/bodhi-js-react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { McpInfo } from '@/hooks/useMcpTools';

interface HeaderProps {
  mcps?: McpInfo[];
}

export default function Header({ mcps = [] }: HeaderProps) {
  const { isInitializing, setupState, auth, isAuthenticated, logout, showSetup } = useBodhi();

  const isSettingsLoading = isInitializing || setupState !== 'ready';

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-bodhi/10 glass z-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight" data-testid="span-app-title">
          Bodhi Bot
        </h1>
        <span className="text-sm text-muted-foreground font-medium" data-testid="span-app-subtitle">
          AI Research Assistant
        </span>
      </div>

      <div className="flex items-center gap-3">
        {mcps.length > 0 && (
          <div
            data-testid="div-mcp-indicators"
            data-test-state="ready"
            className="flex items-center gap-2 border-r border-border/60 pr-3"
          >
            {mcps.map(mcp => (
              <span
                key={mcp.slug}
                data-testid={`span-mcp-status-${mcp.slug}`}
                data-test-state="connected"
                className="mcp-pill mcp-pill-connected"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_oklch(0.7_0.15_85)]" />
                {mcp.name}
              </span>
            ))}
          </div>
        )}

        <Button
          data-testid="btn-settings"
          onClick={showSetup}
          variant="ghost"
          size="icon"
          title="Settings"
        >
          {isSettingsLoading ? <Spinner /> : <Settings />}
        </Button>

        <section
          data-testid="section-auth"
          data-test-state={isAuthenticated ? 'authenticated' : 'unauthenticated'}
        >
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <span
                data-testid="span-auth-name"
                className="text-sm text-foreground/70 font-medium"
                title={auth.user?.email}
              >
                {auth.user?.name || auth.user?.email || 'User'}
              </span>
              <Button data-testid="btn-auth-logout" onClick={logout} variant="ghost">
                Logout
              </Button>
            </div>
          )}
        </section>
      </div>
    </header>
  );
}
