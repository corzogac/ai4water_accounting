import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Chat() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = trpc.chat.sessions.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.chat.messages.useQuery(
    { sessionId: currentSessionId! },
    { enabled: !!currentSessionId }
  );

  const createSessionMutation = trpc.chat.createSession.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // Create initial session if none exists
  useEffect(() => {
    if (sessions && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    } else if (sessions && sessions.length === 0 && !currentSessionId) {
      createSessionMutation.mutate(
        { title: 'Tax Assistance Chat' },
        {
          onSuccess: (data) => {
            setCurrentSessionId(data.id);
          },
        }
      );
    }
  }, [sessions, currentSessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !currentSessionId || sending) return;

    const userMessage = message;
    setMessage("");
    setSending(true);

    try {
      await sendMessageMutation.mutateAsync({
        sessionId: currentSessionId,
        message: userMessage,
      });
      await refetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Tax Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Get expert guidance on UK-NL cross-border tax and accounting matters
        </p>
      </div>

      <Card className="h-[calc(100vh-250px)] flex flex-col">
        <CardHeader>
          <CardTitle>Chat with Tax Expert</CardTitle>
          <CardDescription>
            Ask questions about Corporation Tax, VAT, Wage Tax, Social Security, Double Taxation Treaty, and more
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {!messages || messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm mt-2 max-w-md">
                  Ask me anything about UK and Netherlands tax regulations, compliance requirements, or accounting best practices.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 max-w-2xl">
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto p-4"
                    onClick={() => setMessage("What are my social security obligations for an employee in the Netherlands?")}
                  >
                    <div>
                      <div className="font-medium text-sm">Social Security</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        NL employee obligations
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto p-4"
                    onClick={() => setMessage("How does the UK-NL double taxation treaty work for employment income?")}
                  >
                    <div>
                      <div className="font-medium text-sm">Double Taxation</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Treaty relief explained
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto p-4"
                    onClick={() => setMessage("What is the 30% ruling and am I eligible?")}
                  >
                    <div>
                      <div className="font-medium text-sm">30% Ruling</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expat tax benefits
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto p-4"
                    onClick={() => setMessage("What creates a Permanent Establishment risk in the Netherlands?")}
                  >
                    <div>
                      <div className="font-medium text-sm">PE Risk</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Compliance monitoring
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about tax regulations, compliance, or accounting..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending || !currentSessionId}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || !currentSessionId}
                size="icon"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This AI assistant provides guidance only. Always verify with professional tax advisors for official filings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
