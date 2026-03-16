import { useState } from 'react';
import { useBodhi } from '@bodhiapp/bodhi-js-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MCP_SERVERS } from '@/config/mcps';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

type ProgressStage = 'requesting' | 'reviewing' | 'authenticating';
type ScreenState = 'idle' | 'connecting' | ProgressStage | 'error';

const PROGRESS_LABELS: Record<ProgressStage, string> = {
  requesting: 'Requesting access...',
  reviewing: 'Waiting for approval...',
  authenticating: 'Authenticating...',
};

export default function WelcomeScreen() {
  const { login, showSetup } = useBodhi();
  const [state, setState] = useState<ScreenState>('idle');

  const handleConnect = async () => {
    setState('connecting');
    try {
      await login({
        requested: {
          mcp_servers: MCP_SERVERS.map(s => ({ url: s.url })),
        },
        onProgress: (stage: ProgressStage) => {
          setState(stage);
        },
      });
    } catch (err) {
      setState('error');
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const isLoading = state !== 'idle' && state !== 'error';

  return (
    <div
      data-testid="div-welcome-screen"
      data-test-state={state}
      className="fixed inset-0 flex flex-col items-center justify-center bg-welcome px-4"
    >
      <div className="flex flex-col items-center gap-5 max-w-md text-center animate-fade-in-up">
        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-bodhi-light to-bodhi-dark flex items-center justify-center shadow-xl shadow-bodhi/25 mb-2">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>
        <span
          data-testid="span-welcome-title"
          className="text-4xl font-bold tracking-tight text-foreground"
        >
          Bodhi Bot
        </span>
        <span
          data-testid="span-welcome-subtitle"
          className="text-lg text-muted-foreground font-medium"
        >
          AI Research Assistant
        </span>

        <Button
          data-testid="btn-welcome-connect"
          data-test-state={isLoading ? 'loading' : 'idle'}
          onClick={handleConnect}
          disabled={isLoading}
          className="btn-glow mt-4 bg-gradient-to-r from-bodhi-light to-bodhi-dark hover:from-bodhi hover:to-bodhi-dark text-white px-8 py-3 text-base font-medium rounded-xl shadow-lg shadow-bodhi/20"
        >
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          Connect to Bodhi App
        </Button>

        {isLoading && state !== 'connecting' && (
          <span data-testid="span-welcome-progress" className="text-sm text-muted-foreground">
            {PROGRESS_LABELS[state as ProgressStage]}
          </span>
        )}

        <button
          data-testid="btn-welcome-settings"
          onClick={() => showSetup()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-muted-foreground transition-colors mt-1"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>

        <p className="text-xs text-muted-foreground/60 mt-6 tracking-wide">
          Zero AI infrastructure. All intelligence from Bodhi App.
        </p>
      </div>
    </div>
  );
}
