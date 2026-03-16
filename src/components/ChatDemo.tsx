import { useState, useEffect, useRef } from 'react';
import { useBodhi } from '@bodhiapp/bodhi-js-react';
import { Plus, RefreshCw, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUGGESTED_PROMPTS } from '@/config/prompts';
import { useAgenticChat } from '@/hooks/useAgenticChat';
import type { AgenticMessage } from '@/hooks/useAgenticChat';
import type { ChatTool, McpInfo } from '@/hooks/useMcpTools';
import ChatMessage from './ChatMessage';

// ---------------------------------------------------------------------------
// ChatArea
// ---------------------------------------------------------------------------

interface ChatAreaProps {
  messages: AgenticMessage[];
  isProcessing: boolean;
  error?: string | null;
  onSuggestedPrompt: (prompt: string) => void;
}

function ChatArea({ messages, isProcessing, error, onSuggestedPrompt }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      isUserScrolledUpRef.current = !isAtBottom;
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isNewUserMessage =
      messages.length > prevMessagesLengthRef.current && lastMessage?.role === 'user';

    if (isNewUserMessage) {
      isUserScrolledUpRef.current = false;
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isProcessing ? 'instant' : 'smooth',
      });
    }
  }, [messages, isProcessing]);

  const chatState = error
    ? 'error'
    : isProcessing
      ? 'streaming'
      : messages.length === 0
        ? 'empty'
        : 'idle';

  return (
    <ScrollArea
      className="flex-1 overflow-hidden"
      data-testid="div-chat-area"
      data-test-state={chatState}
      ref={(node: HTMLDivElement | null) => {
        if (node) {
          const viewport = node.querySelector(
            '[data-slot="scroll-area-viewport"]'
          ) as HTMLDivElement;
          if (viewport) {
            scrollViewportRef.current = viewport;
          }
        }
      }}
    >
      <div className="p-4 bg-mesh flex flex-col flex-1" style={{ minHeight: '100%' }}>
        <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
          {messages.length === 0 ? (
            <div
              data-testid="div-chat-empty-state"
              className="flex flex-col items-center flex-1 animate-fade-in-up"
            >
              <div className="flex flex-col items-center gap-4 pt-[12vh]">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bodhi-light to-bodhi-dark flex items-center justify-center shadow-lg shadow-bodhi/20 mb-1">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Bodhi Bot is ready
                </h2>
                <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                  Ask me to research any topic. I can search the web with Exa and save findings to
                  Notion.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pb-4 pt-2 w-full mt-auto">
                {SUGGESTED_PROMPTS.map((sp, i) => (
                  <button
                    key={i}
                    data-testid="btn-suggested-prompt"
                    onClick={() => onSuggestedPrompt(sp.prompt)}
                    className="card-glow text-left px-5 py-4 rounded-2xl max-w-xs cursor-pointer"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="block text-sm font-semibold text-foreground/85">
                      {sp.title}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {sp.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} index={index} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// InputArea
// ---------------------------------------------------------------------------

interface InputAreaProps {
  onSendMessage: (message: string) => Promise<void>;
  onClearMessages: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: string[];
  isLoadingModels: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
}

function InputArea({
  onSendMessage,
  onClearMessages,
  selectedModel,
  setSelectedModel,
  models,
  isLoadingModels,
  inputValue,
  setInputValue,
}: InputAreaProps) {
  const { isReady, isAuthenticated } = useBodhi();

  const isDisabled = !isReady || !isAuthenticated;

  const getHintText = () => {
    if (!isReady) return 'Client not ready';
    if (!isAuthenticated) return 'Please log in to send messages';
    return 'Type a message...';
  };

  const handleSubmit = async () => {
    if (isDisabled || !inputValue.trim()) return;
    const messageToSend = inputValue;
    setInputValue('');
    await onSendMessage(messageToSend);
  };

  const handleNewChat = () => {
    onClearMessages();
    setInputValue('');
  };

  return (
    <div className="w-full px-4 py-4 glass border-t border-bodhi/15">
      <div className="max-w-4xl mx-auto">
        <div className="input-container grid grid-cols-[auto_1fr_auto] grid-rows-[1fr_auto] gap-2 p-3 bg-bodhi-50/40 backdrop-blur-md border border-bodhi/20 rounded-3xl">
          <Button
            data-testid="btn-chat-new"
            onClick={handleNewChat}
            variant="ghost"
            size="icon"
            title="New chat"
            disabled={isDisabled}
            className="row-span-2 self-center text-muted-foreground hover:text-bodhi"
          >
            <Plus />
          </Button>

          <Input
            data-testid="input-chat-message"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={getHintText()}
            disabled={isDisabled}
            className="col-start-2 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 chat-text"
          />

          <div className="col-start-2 flex items-center gap-2 justify-end">
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={models.length === 0}
            >
              <SelectTrigger
                data-testid="select-model"
                className="w-[240px] border-0 focus:ring-0 text-muted-foreground text-sm"
              >
                <SelectValue placeholder="No models" />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              data-testid="btn-refresh-models"
              onClick={() => {
                // Model loading is automatic on auth
              }}
              variant="ghost"
              size="icon"
              title="Refresh models"
              disabled={isLoadingModels}
            >
              <RefreshCw className={isLoadingModels ? 'animate-spin' : ''} size={18} />
            </Button>
          </div>

          <Button
            data-testid="btn-chat-send"
            onClick={handleSubmit}
            disabled={isDisabled || !inputValue.trim()}
            variant="ghost"
            size="icon"
            className="row-span-2 col-start-3 self-center rounded-full bg-bodhi/90 text-white hover:bg-bodhi-dark hover:text-white disabled:bg-muted disabled:text-muted-foreground"
            title="Send message"
          >
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatDemo
// ---------------------------------------------------------------------------

interface ChatDemoProps {
  tools?: ChatTool[];
  mcps?: McpInfo[];
}

export default function ChatDemo({ tools = [], mcps = [] }: ChatDemoProps) {
  const {
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
    error: chatError,
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
  } = useAgenticChat(tools, mcps);

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (chatError) {
      toast.error(chatError);
    }
  }, [chatError]);

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <>
      <ChatArea
        messages={messages}
        isProcessing={isProcessing}
        error={chatError}
        onSuggestedPrompt={handleSuggestedPrompt}
      />
      <InputArea
        onSendMessage={sendMessage}
        onClearMessages={clearMessages}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={models}
        isLoadingModels={isLoadingModels}
        inputValue={inputValue}
        setInputValue={setInputValue}
      />
    </>
  );
}
