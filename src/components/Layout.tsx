import { useBodhi } from '@bodhiapp/bodhi-js-react';
import { Button } from '@/components/ui/button';
import { useMcpTools } from '@/hooks/useMcpTools';
import Header from './Header';
import ChatDemo from './ChatDemo';
import WelcomeScreen from './WelcomeScreen';

export default function Layout() {
  const { isOverallReady, isAuthenticated, showSetup, clientState } = useBodhi();
  const { mcps, tools } = useMcpTools();

  // Workaround: multi-tenant servers report 'tenant_selection' instead of 'ready',
  // but login can still proceed. Accept both as "ready enough" to show the welcome screen.
  const serverStatus = (clientState as { server?: { status?: string } }).server?.status;
  const isReady = isOverallReady || serverStatus === 'tenant_selection';

  const currentView = !isReady ? 'setup' : !isAuthenticated ? 'welcome' : 'chat';

  if (currentView === 'setup') {
    return (
      <div
        data-testid="div-app-layout"
        data-test-state="setup-required"
        className="fixed inset-0 flex items-center justify-center bg-background px-4"
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-lg text-muted-foreground">Bodhi App connection required</p>
          <Button onClick={() => showSetup()}>Setup Bodhi App</Button>
        </div>
      </div>
    );
  }

  if (currentView === 'welcome') {
    return (
      <div data-testid="div-app-layout" data-test-state="welcome">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div
      data-testid="div-app-layout"
      data-test-state="chat"
      className="fixed inset-0 flex flex-col"
    >
      <Header mcps={mcps} />
      <ChatDemo tools={tools} mcps={mcps} />
    </div>
  );
}
