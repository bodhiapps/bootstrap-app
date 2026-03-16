import { useState, useCallback, useRef, useEffect } from 'react';
import { useBodhi } from '@bodhiapp/bodhi-js-react';
import type { UIClient } from '@bodhiapp/bodhi-js-react';
import type { ChatCompletionRequestMessage } from '@bodhiapp/bodhi-js-react/api';
import { SYSTEM_PROMPT, DEFAULT_MODEL } from '@/config/prompts';
import { parseToolName, findMcpId } from '@/hooks/useMcpTools';
import type { ChatTool, McpInfo } from '@/hooks/useMcpTools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolCallStatus = 'pending' | 'executing' | 'completed' | 'error';

interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  mcpName: string;
  mcpSlug: string;
  status: ToolCallStatus;
  arguments?: string;
  result?: string;
  error?: string;
}

interface AgenticMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  tool_calls?: ToolCallInfo[];
  tool_call_id?: string;
  isStreaming?: boolean;
}

export type { ToolCallStatus, ToolCallInfo, AgenticMessage };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 25;

interface AccumulatedToolCall {
  index: number;
  id: string;
  function: { name: string; arguments: string };
}

/**
 * Convert our AgenticMessage list into the raw ChatCompletionRequestMessage[]
 * expected by the LLM streaming API.
 */
function buildConversation(messages: AgenticMessage[]): ChatCompletionRequestMessage[] {
  const conversation: ChatCompletionRequestMessage[] = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
  ];

  for (const msg of messages) {
    switch (msg.role) {
      case 'user':
        conversation.push({ role: 'user' as const, content: msg.content ?? '' });
        break;

      case 'assistant': {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          conversation.push({
            role: 'assistant' as const,
            content: msg.content ?? undefined,
            tool_calls: msg.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: tc.arguments ?? '{}',
              },
            })),
          } as ChatCompletionRequestMessage);
        } else {
          conversation.push({
            role: 'assistant' as const,
            content: msg.content ?? undefined,
          } as ChatCompletionRequestMessage);
        }
        break;
      }

      case 'tool':
        conversation.push({
          role: 'tool' as const,
          tool_call_id: msg.tool_call_id ?? '',
          content: msg.content ?? '',
        });
        break;

      // system messages from the user-facing list are skipped — we always
      // prepend SYSTEM_PROMPT ourselves.
      default:
        break;
    }
  }

  return conversation;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgenticChat(tools: ChatTool[], mcps: McpInfo[]) {
  const { client, isAuthenticated, isReady } = useBodhi();

  const [messages, setMessages] = useState<AgenticMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Model loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!client || !isAuthenticated || !isReady) return;

    let cancelled = false;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const loaded: string[] = [];
        for await (const model of client.models.list()) {
          if (cancelled) return;
          loaded.push(model.id);
        }

        if (cancelled) return;

        setModels(loaded);

        if (loaded.length > 0) {
          const hasDefault = loaded.includes(DEFAULT_MODEL);
          setSelectedModel(hasDefault ? DEFAULT_MODEL : loaded[0]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load models:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, [client, isAuthenticated, isReady]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // -------------------------------------------------------------------------
  // updateMessage — immutably update a single message by index
  // -------------------------------------------------------------------------

  const updateMessage = useCallback(
    (index: number, updater: (prev: AgenticMessage) => AgenticMessage) => {
      setMessages(prev => {
        const next = [...prev];
        next[index] = updater(next[index]);
        return next;
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Agent loop
  // -------------------------------------------------------------------------

  const runAgentLoop = useCallback(
    async (
      currentClient: UIClient,
      startMessages: AgenticMessage[],
      currentTools: ChatTool[],
      currentMcps: McpInfo[],
      model: string,
      signal: AbortSignal
    ) => {
      // We keep a local copy of the messages that grows during the loop.
      // React state is updated along the way for the UI.
      let localMessages = [...startMessages];
      let iterations = 0;

      while (iterations < MAX_ITERATIONS) {
        if (signal.aborted) return;
        iterations++;

        const conversation = buildConversation(localMessages);

        // Start streaming ---------------------------------------------------
        const stream = currentClient.chat.completions.create({
          model,
          messages: conversation,
          tools:
            currentTools.length > 0
              ? (currentTools as unknown as ChatCompletionRequestMessage[])
              : undefined,
          stream: true,
        } as Parameters<typeof currentClient.chat.completions.create>[0]);

        // Add a placeholder streaming assistant message
        const assistantIndex = localMessages.length;
        const assistantMsg: AgenticMessage = {
          role: 'assistant',
          content: '',
          isStreaming: true,
        };
        localMessages = [...localMessages, assistantMsg];
        setMessages([...localMessages]);

        let assistantContent = '';
        const accumulatedToolCalls: AccumulatedToolCall[] = [];

        try {
          for await (const chunk of stream) {
            if (signal.aborted) return;

            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            // Content
            if (delta.content) {
              assistantContent += delta.content;
              const contentSnapshot = assistantContent;
              updateMessage(assistantIndex, prev => ({
                ...prev,
                content: contentSnapshot,
              }));
              // Also update localMessages for consistency
              localMessages[assistantIndex] = {
                ...localMessages[assistantIndex],
                content: contentSnapshot,
              };
            }

            // Tool calls
            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const idx = toolCallDelta.index ?? 0;

                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = {
                    index: idx,
                    id: toolCallDelta.id ?? '',
                    function: {
                      name: toolCallDelta.function?.name ?? '',
                      arguments: toolCallDelta.function?.arguments ?? '',
                    },
                  };
                } else {
                  if (toolCallDelta.id) {
                    accumulatedToolCalls[idx].id = toolCallDelta.id;
                  }
                  if (toolCallDelta.function?.name) {
                    accumulatedToolCalls[idx].function.name += toolCallDelta.function.name;
                  }
                  if (toolCallDelta.function?.arguments) {
                    accumulatedToolCalls[idx].function.arguments +=
                      toolCallDelta.function.arguments;
                  }
                }
              }
            }
          }
        } catch (err) {
          if (signal.aborted) return;
          const errMsg = err instanceof Error ? err.message : String(err);
          // Finalize the assistant message with error
          updateMessage(assistantIndex, prev => ({
            ...prev,
            content: prev.content || null,
            isStreaming: false,
          }));
          localMessages[assistantIndex] = {
            ...localMessages[assistantIndex],
            content: localMessages[assistantIndex].content || null,
            isStreaming: false,
          };
          throw new Error(errMsg);
        }

        // -------------------------------------------------------------------
        // Stream finished — check for tool calls
        // -------------------------------------------------------------------

        const validToolCalls = accumulatedToolCalls.filter(tc => tc && tc.id && tc.function.name);

        if (validToolCalls.length === 0) {
          // No tool calls — we are done
          updateMessage(assistantIndex, prev => ({
            ...prev,
            content: assistantContent || null,
            isStreaming: false,
          }));
          localMessages[assistantIndex] = {
            ...localMessages[assistantIndex],
            content: assistantContent || null,
            isStreaming: false,
          };
          return;
        }

        // Build ToolCallInfo[] for UI
        const toolCallInfos: ToolCallInfo[] = validToolCalls.map(tc => {
          const parsed = parseToolName(tc.function.name);
          const slug = parsed?.mcpSlug ?? '';
          const toolName = parsed?.toolName ?? tc.function.name;
          const mcpEntry = currentMcps.find(m => m.slug === slug);
          return {
            id: tc.id,
            name: tc.function.name,
            displayName: toolName,
            mcpName: mcpEntry?.name ?? slug,
            mcpSlug: slug,
            status: 'pending' as ToolCallStatus,
            arguments: tc.function.arguments,
          };
        });

        // Update assistant message with tool calls (status: pending)
        updateMessage(assistantIndex, prev => ({
          ...prev,
          content: assistantContent || null,
          isStreaming: false,
          tool_calls: toolCallInfos,
        }));
        localMessages[assistantIndex] = {
          ...localMessages[assistantIndex],
          content: assistantContent || null,
          isStreaming: false,
          tool_calls: toolCallInfos,
        };

        // -----------------------------------------------------------------
        // Execute tool calls
        // -----------------------------------------------------------------

        for (let i = 0; i < validToolCalls.length; i++) {
          if (signal.aborted) return;

          const tc = validToolCalls[i];
          const tcInfo = toolCallInfos[i];

          // Mark executing
          tcInfo.status = 'executing';
          const executingSnapshot = [...toolCallInfos];
          updateMessage(assistantIndex, prev => ({
            ...prev,
            tool_calls: executingSnapshot,
          }));

          const parsed = parseToolName(tc.function.name);

          if (!parsed) {
            tcInfo.status = 'error';
            tcInfo.error = `Invalid tool name format: ${tc.function.name}`;
            const errorSnapshot = [...toolCallInfos];
            updateMessage(assistantIndex, prev => ({
              ...prev,
              tool_calls: errorSnapshot,
            }));

            // Add tool result message to local messages
            const toolResultMsg: AgenticMessage = {
              role: 'tool',
              content: JSON.stringify({ error: tcInfo.error }),
              tool_call_id: tc.id,
            };
            localMessages = [...localMessages, toolResultMsg];
            setMessages([...localMessages]);
            continue;
          }

          const mcpId = findMcpId(parsed.mcpSlug, currentMcps);

          if (!mcpId) {
            tcInfo.status = 'error';
            tcInfo.error = `MCP '${parsed.mcpSlug}' not found`;
            const errorSnapshot = [...toolCallInfos];
            updateMessage(assistantIndex, prev => ({
              ...prev,
              tool_calls: errorSnapshot,
            }));

            const toolResultMsg: AgenticMessage = {
              role: 'tool',
              content: JSON.stringify({ error: tcInfo.error }),
              tool_call_id: tc.id,
            };
            localMessages = [...localMessages, toolResultMsg];
            setMessages([...localMessages]);
            continue;
          }

          try {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
            } catch {
              // If JSON parsing fails, send empty args
            }

            const result = await currentClient.mcps.executeTool(mcpId, parsed.toolName, args);
            const resultStr = JSON.stringify(result ?? 'No result');

            tcInfo.status = 'completed';
            tcInfo.result = resultStr;
            const completedSnapshot = [...toolCallInfos];
            updateMessage(assistantIndex, prev => ({
              ...prev,
              tool_calls: completedSnapshot,
            }));

            const toolResultMsg: AgenticMessage = {
              role: 'tool',
              content: resultStr,
              tool_call_id: tc.id,
            };
            localMessages = [...localMessages, toolResultMsg];
            setMessages([...localMessages]);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Tool execution failed';
            tcInfo.status = 'error';
            tcInfo.error = errMsg;
            const errorSnapshot = [...toolCallInfos];
            updateMessage(assistantIndex, prev => ({
              ...prev,
              tool_calls: errorSnapshot,
            }));

            const toolResultMsg: AgenticMessage = {
              role: 'tool',
              content: JSON.stringify({ error: errMsg }),
              tool_call_id: tc.id,
            };
            localMessages = [...localMessages, toolResultMsg];
            setMessages([...localMessages]);
          }
        }

        // Continue the loop — next iteration sends updated conversation
      }
    },
    [updateMessage]
  );

  // -------------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!client || !prompt.trim()) return;

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setIsProcessing(true);

      const userMessage: AgenticMessage = {
        role: 'user',
        content: prompt.trim(),
      };

      // We derive the new messages list from current state
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      try {
        await runAgentLoop(client, newMessages, tools, mcps, selectedModel, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setError(errMsg);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsProcessing(false);
        }
      }
    },
    [client, messages, tools, mcps, selectedModel, runAgentLoop]
  );

  // -------------------------------------------------------------------------
  // clearMessages
  // -------------------------------------------------------------------------

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsProcessing(false);
  }, []);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
    error,
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
  };
}
